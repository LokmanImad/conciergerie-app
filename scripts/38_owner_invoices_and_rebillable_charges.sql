-- Owner monthly invoices and explicit rebilling rules for charges.
-- Prerequisite: run migrations 31, 35 and 37 first.

BEGIN;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS billable_to_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve the existing behaviour only for charges that were already treated
-- as owner costs: cleaning linked to a reservation and owner-paid services.
UPDATE public.charges AS charge
SET billable_to_owner = TRUE
FROM public.service_types AS service
WHERE charge.service_type_id = service.id
  AND charge.apartment_id IS NOT NULL
  AND (
    service.paid_by = 'owner'
    OR LOWER(service.name) LIKE '%ménage%'
    OR LOWER(service.name) LIKE '%menage%'
    OR LOWER(service.name) LIKE '%cleaning%'
    OR LOWER(service.name) LIKE '%nettoyage%'
  );

COMMENT ON COLUMN public.charges.billable_to_owner IS
  'When true, the charge may be deducted from the owner payout and shown on the owner invoice.';

CREATE INDEX IF NOT EXISTS charges_owner_billing_index
  ON public.charges(apartment_id, date)
  WHERE billable_to_owner = TRUE AND cancelled_at IS NULL;

-- Replace the legacy web update RPC so the rebilling decision is saved too.
DROP FUNCTION IF EXISTS public.update_charge(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, UUID, TEXT);

CREATE FUNCTION public.update_charge(
  charge_id UUID,
  p_apartment_id UUID,
  p_service_type_id UUID,
  p_amount NUMERIC,
  p_date DATE,
  p_description TEXT,
  p_paid_by_person TEXT,
  p_notes TEXT,
  p_reservation_id UUID,
  p_payment_method TEXT,
  p_billable_to_owner BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  UPDATE public.charges
  SET apartment_id = p_apartment_id,
      service_type_id = p_service_type_id,
      amount = p_amount,
      date = p_date,
      description = NULLIF(BTRIM(p_description), ''),
      paid_by_person = p_paid_by_person,
      notes = NULLIF(BTRIM(p_notes), ''),
      reservation_id = p_reservation_id,
      payment_method = p_payment_method,
      billable_to_owner = COALESCE(p_billable_to_owner, FALSE)
  WHERE id = charge_id AND cancelled_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHARGE_NOT_FOUND_OR_CANCELLED' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_charge(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_charge(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN) TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.owner_invoice_number_seq START WITH 1;
REVOKE ALL ON SEQUENCE public.owner_invoice_number_seq FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.owner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE RESTRICT,
  owner_name TEXT NOT NULL,
  owner_contact TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'settled', 'cancelled')),
  gross_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gross_revenue >= 0),
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  rebillable_charges NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (rebillable_charges >= 0),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start),
  CHECK (due_date >= issue_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS owner_invoices_active_period_unique
  ON public.owner_invoices(apartment_id, period_start)
  WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS owner_invoices_period_index
  ON public.owner_invoices(period_start DESC);

CREATE TABLE IF NOT EXISTS public.owner_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_invoice_id UUID NOT NULL REFERENCES public.owner_invoices(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('commission', 'cleaning', 'charge')),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  position INTEGER NOT NULL CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS owner_invoice_items_invoice_index
  ON public.owner_invoice_items(owner_invoice_id, position);

CREATE OR REPLACE FUNCTION public.generate_owner_invoice(
  p_apartment_id UUID,
  p_period_start DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_apartment RECORD;
  v_settings public.billing_settings%ROWTYPE;
  v_period_start DATE := DATE_TRUNC('month', p_period_start)::DATE;
  v_period_end DATE := (
    DATE_TRUNC('month', p_period_start) + INTERVAL '1 month' - INTERVAL '1 day'
  )::DATE;
  v_invoice_id UUID;
  v_existing_id UUID;
  v_gross NUMERIC(12, 2) := 0;
  v_commission NUMERIC(12, 2) := 0;
  v_charges NUMERIC(12, 2) := 0;
  v_position INTEGER := 1;
  v_charge RECORD;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.owner_invoices
  WHERE apartment_id = p_apartment_id
    AND period_start = v_period_start
    AND status <> 'cancelled'
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_apartment FROM public.apartments WHERE id = p_apartment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'APARTMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_settings FROM public.billing_settings WHERE id = 1;

  SELECT COALESCE(SUM(reservation.total_amount), 0)
  INTO v_gross
  FROM public.reservations AS reservation
  WHERE reservation.apartment_id = p_apartment_id
    AND reservation.check_in BETWEEN v_period_start AND v_period_end
    AND reservation.booking_status <> 'cancelled';

  SELECT COALESCE(SUM(
    GREATEST(reservation.total_amount - COALESCE(cleaning.total, 0), 0)
      * COALESCE(v_apartment.commission_rate, 25) / 100
  ), 0)
  INTO v_commission
  FROM public.reservations AS reservation
  LEFT JOIN LATERAL (
    SELECT SUM(charge.amount) AS total
    FROM public.charges AS charge
    INNER JOIN public.service_types AS service ON service.id = charge.service_type_id
    WHERE charge.reservation_id = reservation.id
      AND charge.cancelled_at IS NULL
      AND charge.billable_to_owner = TRUE
      AND (
        LOWER(service.name) LIKE '%ménage%'
        OR LOWER(service.name) LIKE '%menage%'
        OR LOWER(service.name) LIKE '%cleaning%'
        OR LOWER(service.name) LIKE '%nettoyage%'
      )
  ) AS cleaning ON TRUE
  WHERE reservation.apartment_id = p_apartment_id
    AND reservation.check_in BETWEEN v_period_start AND v_period_end
    AND reservation.booking_status <> 'cancelled';

  INSERT INTO public.owner_invoices (
    invoice_number, apartment_id, owner_name, owner_contact,
    period_start, period_end, issue_date, due_date,
    gross_revenue, commission_amount, notes, created_by
  ) VALUES (
    'FAP-' || EXTRACT(YEAR FROM v_period_start)::INTEGER || '-'
      || LPAD(nextval('public.owner_invoice_number_seq')::TEXT, 6, '0'),
    v_apartment.id, v_apartment.owner_name, v_apartment.owner_contact,
    v_period_start, v_period_end, CURRENT_DATE,
    CURRENT_DATE + COALESCE(v_settings.payment_terms_days, 7),
    ROUND(v_gross, 2), ROUND(v_commission, 2),
    'Facture mensuelle de gestion', auth.jwt() ->> 'sub'
  ) RETURNING id INTO v_invoice_id;

  IF v_commission > 0 THEN
    INSERT INTO public.owner_invoice_items (
      owner_invoice_id, item_type, description, amount, position
    ) VALUES (
      v_invoice_id, 'commission',
      'Commission de gestion - ' || TO_CHAR(v_period_start, 'MM/YYYY'),
      ROUND(v_commission, 2), v_position
    );
    v_position := v_position + 1;
  END IF;

  FOR v_charge IN
    SELECT charge.id, charge.amount, charge.date, service.name AS service_name,
           reservation.reference AS reservation_reference,
           CASE WHEN (
             LOWER(service.name) LIKE '%ménage%'
             OR LOWER(service.name) LIKE '%menage%'
             OR LOWER(service.name) LIKE '%cleaning%'
             OR LOWER(service.name) LIKE '%nettoyage%'
           ) THEN 'cleaning' ELSE 'charge' END AS item_type
    FROM public.charges AS charge
    INNER JOIN public.service_types AS service ON service.id = charge.service_type_id
    LEFT JOIN public.reservations AS reservation ON reservation.id = charge.reservation_id
    WHERE charge.apartment_id = p_apartment_id
      AND charge.cancelled_at IS NULL
      AND charge.billable_to_owner = TRUE
      AND (service.paid_by = 'owner' OR (
        LOWER(service.name) LIKE '%ménage%'
        OR LOWER(service.name) LIKE '%menage%'
        OR LOWER(service.name) LIKE '%cleaning%'
        OR LOWER(service.name) LIKE '%nettoyage%'
      ))
      AND (
        (charge.reservation_id IS NOT NULL
          AND reservation.check_in BETWEEN v_period_start AND v_period_end
          AND reservation.booking_status <> 'cancelled')
        OR (charge.reservation_id IS NULL AND charge.date BETWEEN v_period_start AND v_period_end)
      )
    ORDER BY charge.date, charge.created_at
  LOOP
    INSERT INTO public.owner_invoice_items (
      owner_invoice_id, charge_id, item_type, description, amount, position
    ) VALUES (
      v_invoice_id, v_charge.id, v_charge.item_type,
      v_charge.service_name
        || COALESCE(' - réservation ' || v_charge.reservation_reference, '')
        || ' - ' || TO_CHAR(v_charge.date, 'DD/MM/YYYY'),
      ROUND(v_charge.amount, 2), v_position
    );
    v_charges := v_charges + v_charge.amount;
    v_position := v_position + 1;
  END LOOP;

  UPDATE public.owner_invoices
  SET rebillable_charges = ROUND(v_charges, 2),
      total_amount = ROUND(v_commission + v_charges, 2),
      net_payout = ROUND(v_gross - v_commission - v_charges, 2),
      updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_owner_invoice_status(
  p_owner_invoice_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('sent', 'settled', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_OWNER_INVOICE_STATUS' USING ERRCODE = '22023';
  END IF;

  UPDATE public.owner_invoices
  SET status = p_status,
      sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
      settled_at = CASE WHEN p_status = 'settled' THEN NOW() ELSE settled_at END,
      updated_at = NOW()
  WHERE id = p_owner_invoice_id
    AND status <> 'cancelled'
    AND NOT (status = 'settled' AND p_status = 'cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OWNER_INVOICE_NOT_UPDATABLE' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

ALTER TABLE public.owner_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_invoices_admin_access ON public.owner_invoices;
CREATE POLICY owner_invoices_admin_access ON public.owner_invoices FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()));
DROP POLICY IF EXISTS owner_invoice_items_admin_access ON public.owner_invoice_items;
CREATE POLICY owner_invoice_items_admin_access ON public.owner_invoice_items FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.owner_invoices, public.owner_invoice_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_invoices, public.owner_invoice_items TO authenticated;

REVOKE ALL ON FUNCTION public.generate_owner_invoice(UUID, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_owner_invoice_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_owner_invoice(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_owner_invoice_status(UUID, TEXT) TO authenticated;

COMMIT;
