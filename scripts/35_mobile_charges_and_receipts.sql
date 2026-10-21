-- Mobile charge management, audit trail and private receipt storage.
-- Prerequisite: run migration 31 before this migration.

BEGIN;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.charges
  DROP CONSTRAINT IF EXISTS charges_amount_positive,
  ADD CONSTRAINT charges_amount_positive CHECK (amount > 0) NOT VALID,
  DROP CONSTRAINT IF EXISTS charges_paid_by_person_check,
  ADD CONSTRAINT charges_paid_by_person_check
    CHECK (paid_by_person IN ('imad', 'jassem', 'company')) NOT VALID,
  DROP CONSTRAINT IF EXISTS charges_payment_method_check,
  ADD CONSTRAINT charges_payment_method_check
    CHECK (payment_method IN ('bank', 'cash')) NOT VALID;

CREATE INDEX IF NOT EXISTS charges_cancelled_at_index ON public.charges(cancelled_at);
CREATE INDEX IF NOT EXISTS charges_service_type_index ON public.charges(service_type_id);

CREATE OR REPLACE FUNCTION public.prepare_charge_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, v_user_id);
  END IF;
  NEW.updated_by := v_user_id;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_charge_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_charge_write_trigger ON public.charges;
CREATE TRIGGER prepare_charge_write_trigger
BEFORE INSERT OR UPDATE ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.prepare_charge_write();

CREATE OR REPLACE FUNCTION public.cancel_charge(
  p_charge_id UUID,
  p_reason TEXT DEFAULT NULL
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
  SET cancelled_at = NOW(),
      cancellation_reason = NULLIF(BTRIM(p_reason), '')
  WHERE id = p_charge_id AND cancelled_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHARGE_NOT_FOUND_OR_CANCELLED' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_charge(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_charge(UUID, TEXT) TO authenticated;

-- Cancelled charges stay visible for auditing but must never affect financial totals.
CREATE OR REPLACE FUNCTION public.get_wallet_balance(person TEXT)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  total_charges DECIMAL(10, 2) := 0;
  total_reimbursements DECIMAL(10, 2) := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total_charges
  FROM public.charges
  WHERE paid_by_person = person
    AND cancelled_at IS NULL;

  SELECT COALESCE(SUM(amount), 0)
  INTO total_reimbursements
  FROM public.wallet_reimbursements
  WHERE person_name = person;

  RETURN total_charges - total_reimbursements;
END;
$$;

REVOKE ALL ON FUNCTION public.get_wallet_balance(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_generate_current_month_payment()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_current_month_end DATE := (
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
  )::DATE;
  v_existing_payment UUID;
  v_total_commission DECIMAL(10, 2) := 0;
  v_total_charges DECIMAL(10, 2) := 0;
  v_total_profit DECIMAL(10, 2);
BEGIN
  SELECT id
  INTO v_existing_payment
  FROM public.profit_payments
  WHERE period_start = v_current_month_start
    AND period_end = v_current_month_end
  LIMIT 1;

  SELECT COALESCE(SUM(
    (
      COALESCE(reservation.total_amount, 0) - COALESCE(cleaning.total, 0)
    ) * COALESCE(apartment.commission_rate, 25) / 100
  ), 0)
  INTO v_total_commission
  FROM public.reservations AS reservation
  LEFT JOIN public.apartments AS apartment
    ON reservation.apartment_id = apartment.id
  LEFT JOIN LATERAL (
    SELECT SUM(charge.amount) AS total
    FROM public.charges AS charge
    INNER JOIN public.service_types AS service
      ON charge.service_type_id = service.id
    WHERE charge.reservation_id = reservation.id
      AND charge.cancelled_at IS NULL
      AND (
        LOWER(service.name) LIKE '%ménage%'
        OR LOWER(service.name) LIKE '%menage%'
        OR LOWER(service.name) LIKE '%cleaning%'
        OR LOWER(service.name) LIKE '%nettoyage%'
      )
  ) AS cleaning ON TRUE
  WHERE reservation.check_in >= v_current_month_start
    AND reservation.check_in <= v_current_month_end
    AND NOT EXISTS (
      SELECT 1
      FROM public.profit_payments AS payment
      WHERE reservation.check_in >= payment.period_start
        AND reservation.check_in <= payment.period_end
        AND payment.id IS DISTINCT FROM v_existing_payment
    );

  SELECT COALESCE(SUM(charge.amount), 0)
  INTO v_total_charges
  FROM public.charges AS charge
  LEFT JOIN public.service_types AS service
    ON charge.service_type_id = service.id
  WHERE charge.date >= v_current_month_start
    AND charge.date <= v_current_month_end
    AND charge.cancelled_at IS NULL
    AND (service.paid_by = 'company' OR service.paid_by = 'Société' OR charge.apartment_id IS NULL);

  v_total_profit := COALESCE(v_total_commission, 0) - COALESCE(v_total_charges, 0);

  IF v_existing_payment IS NOT NULL THEN
    UPDATE public.profit_payments
    SET total_profit = v_total_profit,
        imad_share = v_total_profit / 2,
        jassem_share = v_total_profit / 2,
        updated_at = NOW()
    WHERE id = v_existing_payment;
  ELSE
    INSERT INTO public.profit_payments (
      period_start,
      period_end,
      total_profit,
      imad_share,
      jassem_share,
      status,
      imad_paid,
      jassem_paid
    ) VALUES (
      v_current_month_start,
      v_current_month_end,
      v_total_profit,
      v_total_profit / 2,
      v_total_profit / 2,
      'pending',
      FALSE,
      FALSE
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_generate_current_month_payment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_generate_current_month_payment() TO authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_total_commission DECIMAL(10, 2) := 0;
  v_total_charges DECIMAL(10, 2) := 0;
  v_total_profit DECIMAL(10, 2);
BEGIN
  SELECT period_start, period_end
  INTO v_period_start, v_period_end
  FROM public.profit_payments
  WHERE id = p_payment_id;

  IF v_period_start IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(
    (
      COALESCE(reservation.total_amount, 0) - COALESCE(cleaning.total, 0)
    ) * COALESCE(apartment.commission_rate, 25) / 100
  ), 0)
  INTO v_total_commission
  FROM public.reservations AS reservation
  LEFT JOIN public.apartments AS apartment
    ON reservation.apartment_id = apartment.id
  LEFT JOIN LATERAL (
    SELECT SUM(charge.amount) AS total
    FROM public.charges AS charge
    INNER JOIN public.service_types AS service
      ON charge.service_type_id = service.id
    WHERE charge.reservation_id = reservation.id
      AND charge.cancelled_at IS NULL
      AND (
        LOWER(service.name) LIKE '%ménage%'
        OR LOWER(service.name) LIKE '%menage%'
        OR LOWER(service.name) LIKE '%cleaning%'
        OR LOWER(service.name) LIKE '%nettoyage%'
      )
  ) AS cleaning ON TRUE
  WHERE reservation.check_in >= v_period_start
    AND reservation.check_in <= v_period_end;

  SELECT COALESCE(SUM(charge.amount), 0)
  INTO v_total_charges
  FROM public.charges AS charge
  LEFT JOIN public.service_types AS service
    ON charge.service_type_id = service.id
  WHERE charge.date >= v_period_start
    AND charge.date <= v_period_end
    AND charge.cancelled_at IS NULL
    AND (service.paid_by = 'company' OR service.paid_by = 'Société' OR charge.apartment_id IS NULL);

  v_total_profit := COALESCE(v_total_commission, 0) - COALESCE(v_total_charges, 0);

  UPDATE public.profit_payments
  SET total_profit = v_total_profit,
      imad_share = v_total_profit / 2,
      jassem_share = v_total_profit / 2,
      updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_payment(UUID) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'charge-receipts',
  'charge-receipts',
  FALSE,
  6291456,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS charge_receipts_admin_select ON storage.objects;
CREATE POLICY charge_receipts_admin_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'charge-receipts' AND (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS charge_receipts_admin_insert ON storage.objects;
CREATE POLICY charge_receipts_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'charge-receipts'
    AND (SELECT public.is_app_admin())
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS charge_receipts_admin_update ON storage.objects;
CREATE POLICY charge_receipts_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'charge-receipts' AND (SELECT public.is_app_admin()))
  WITH CHECK (bucket_id = 'charge-receipts' AND (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS charge_receipts_admin_delete ON storage.objects;
CREATE POLICY charge_receipts_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'charge-receipts' AND (SELECT public.is_app_admin()));

COMMENT ON COLUMN public.charges.receipt_path IS
  'Private Storage object path for the charge receipt or supplier invoice.';
COMMENT ON COLUMN public.charges.cancelled_at IS
  'Soft-cancellation timestamp. Cancelled charges remain available for audit.';

COMMIT;
