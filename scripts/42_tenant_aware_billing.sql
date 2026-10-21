-- Tenant-aware billing functions and branding synchronization.
-- Prerequisite: migrations 40 and 41.

BEGIN;

UPDATE public.company_branding AS branding
SET legal_name = COALESCE(settings.company_name, branding.legal_name),
    address = COALESCE(settings.company_address, branding.address),
    phone = COALESCE(settings.company_phone, branding.phone),
    email = COALESCE(settings.company_email, branding.email),
    company_identifier = COALESCE(settings.company_identifier, branding.company_identifier),
    bank_details = COALESCE(settings.bank_details, branding.bank_details),
    invoice_footer = COALESCE(settings.footer_text, branding.invoice_footer),
    updated_at = NOW()
FROM public.billing_settings AS settings
WHERE settings.company_id = branding.company_id;

CREATE OR REPLACE FUNCTION public.sync_branding_to_billing_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.billing_settings
  SET company_name = COALESCE(NEW.legal_name, company_name),
      company_address = NEW.address,
      company_phone = NEW.phone,
      company_email = NEW.email,
      company_identifier = NEW.company_identifier,
      bank_details = NEW.bank_details,
      footer_text = NEW.invoice_footer,
      updated_at = NOW()
  WHERE company_id = NEW.company_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_branding_to_billing_settings()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_branding_to_billing_settings_trigger
  ON public.company_branding;
CREATE TRIGGER sync_branding_to_billing_settings_trigger
AFTER INSERT OR UPDATE ON public.company_branding
FOR EACH ROW EXECUTE FUNCTION public.sync_branding_to_billing_settings();

CREATE OR REPLACE FUNCTION public.prepare_invoice_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
  v_prefix TEXT;
BEGIN
  NEW.company_id := COALESCE(NEW.company_id, public.current_company_id());
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_CONTEXT_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NEW.invoice_number IS NULL OR BTRIM(NEW.invoice_number) = '' THEN
    SELECT invoice_prefix INTO v_prefix
    FROM public.billing_settings
    WHERE company_id = NEW.company_id;

    NEW.invoice_number := COALESCE(NULLIF(BTRIM(v_prefix), ''), 'FAC')
      || '-' || EXTRACT(YEAR FROM COALESCE(NEW.issue_date, CURRENT_DATE))::INTEGER
      || '-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, v_user_id);
  END IF;
  NEW.updated_by := v_user_id;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_invoice_write() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_invoice_from_reservation(
  p_reservation_id UUID,
  p_issue_date DATE DEFAULT CURRENT_DATE,
  p_due_date DATE DEFAULT NULL,
  p_tax_rate NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_reservation RECORD;
  v_settings public.billing_settings%ROWTYPE;
  v_invoice_id UUID;
  v_due_date DATE;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT reservation.*, apartment.name AS apartment_name
  INTO v_reservation
  FROM public.reservations AS reservation
  LEFT JOIN public.apartments AS apartment
    ON apartment.id = reservation.apartment_id
   AND apartment.company_id = reservation.company_id
  WHERE reservation.id = p_reservation_id
    AND reservation.company_id = public.current_company_id()
    AND reservation.booking_status <> 'cancelled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_settings
  FROM public.billing_settings
  WHERE company_id = v_reservation.company_id;

  v_due_date := COALESCE(
    p_due_date,
    p_issue_date + COALESCE(v_settings.payment_terms_days, 7)
  );

  INSERT INTO public.invoices (
    company_id, invoice_number, reservation_id, apartment_id, client_name,
    client_contact, issue_date, due_date, tax_rate, amount_paid,
    payment_method, notes, terms
  ) VALUES (
    v_reservation.company_id, NULL, v_reservation.id,
    v_reservation.apartment_id, v_reservation.client_name,
    v_reservation.client_number, p_issue_date, v_due_date,
    COALESCE(p_tax_rate, v_settings.default_tax_rate, 0), 0,
    v_reservation.payment_method, NULLIF(BTRIM(p_notes), ''),
    'Facture établie à partir de la réservation ' || v_reservation.reference
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    company_id, invoice_id, description, quantity, unit_price, position
  ) VALUES (
    v_reservation.company_id,
    v_invoice_id,
    'Séjour ' || COALESCE(v_reservation.apartment_name, '') || ' — du '
      || TO_CHAR(v_reservation.check_in, 'DD/MM/YYYY') || ' au '
      || TO_CHAR(v_reservation.check_out, 'DD/MM/YYYY'),
    1,
    COALESCE(v_reservation.total_amount, 0),
    1
  );

  UPDATE public.invoices
  SET amount_paid = LEAST(COALESCE(v_reservation.amount_paid, 0), total_amount),
      status = CASE
        WHEN COALESCE(v_reservation.amount_paid, 0) >= total_amount AND total_amount > 0
          THEN 'paid'
        ELSE 'draft'
      END,
      paid_at = CASE
        WHEN COALESCE(v_reservation.amount_paid, 0) >= total_amount AND total_amount > 0
          THEN NOW()
        ELSE NULL
      END
  WHERE id = v_invoice_id AND company_id = v_reservation.company_id;

  RETURN v_invoice_id;
END;
$$;

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

  SELECT * INTO v_apartment
  FROM public.apartments
  WHERE id = p_apartment_id AND company_id = public.current_company_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'APARTMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.owner_invoices
  WHERE apartment_id = p_apartment_id
    AND company_id = v_apartment.company_id
    AND period_start = v_period_start
    AND status <> 'cancelled'
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_settings
  FROM public.billing_settings
  WHERE company_id = v_apartment.company_id;

  SELECT COALESCE(SUM(reservation.total_amount), 0)
  INTO v_gross
  FROM public.reservations AS reservation
  WHERE reservation.apartment_id = p_apartment_id
    AND reservation.company_id = v_apartment.company_id
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
    INNER JOIN public.service_types AS service
      ON service.id = charge.service_type_id
     AND service.company_id = charge.company_id
    WHERE charge.reservation_id = reservation.id
      AND charge.company_id = reservation.company_id
      AND charge.cancelled_at IS NULL
      AND charge.billable_to_owner
      AND (
        LOWER(service.name) LIKE '%ménage%'
        OR LOWER(service.name) LIKE '%menage%'
        OR LOWER(service.name) LIKE '%cleaning%'
        OR LOWER(service.name) LIKE '%nettoyage%'
      )
  ) AS cleaning ON TRUE
  WHERE reservation.apartment_id = p_apartment_id
    AND reservation.company_id = v_apartment.company_id
    AND reservation.check_in BETWEEN v_period_start AND v_period_end
    AND reservation.booking_status <> 'cancelled';

  INSERT INTO public.owner_invoices (
    company_id, invoice_number, apartment_id, owner_name, owner_contact,
    period_start, period_end, issue_date, due_date,
    gross_revenue, commission_amount, notes, created_by
  ) VALUES (
    v_apartment.company_id,
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
      company_id, owner_invoice_id, item_type, description, amount, position
    ) VALUES (
      v_apartment.company_id, v_invoice_id, 'commission',
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
    INNER JOIN public.service_types AS service
      ON service.id = charge.service_type_id
     AND service.company_id = charge.company_id
    LEFT JOIN public.reservations AS reservation
      ON reservation.id = charge.reservation_id
     AND reservation.company_id = charge.company_id
    WHERE charge.apartment_id = p_apartment_id
      AND charge.company_id = v_apartment.company_id
      AND charge.cancelled_at IS NULL
      AND charge.billable_to_owner
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
      company_id, owner_invoice_id, charge_id, item_type, description, amount, position
    ) VALUES (
      v_apartment.company_id, v_invoice_id, v_charge.id, v_charge.item_type,
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
  WHERE id = v_invoice_id AND company_id = v_apartment.company_id;

  RETURN v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_from_reservation(UUID, DATE, DATE, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_owner_invoice(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_reservation(UUID, DATE, DATE, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_owner_invoice(UUID, DATE) TO authenticated;

COMMIT;
