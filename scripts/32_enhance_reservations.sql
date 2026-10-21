-- Reservation domain v1: lifecycle, guests, payment tracking, audit and
-- date-conflict protection. Existing reservations are preserved.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.reservation_reference_seq START WITH 1;
REVOKE ALL ON SEQUENCE public.reservation_reference_seq FROM anon;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS adults INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_in_time TIME NOT NULL DEFAULT TIME '15:00',
  ADD COLUMN IF NOT EXISTS check_out_time TIME NOT NULL DEFAULT TIME '11:00',
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.reservations
SET reference = 'RES-'
  || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INTEGER
  || '-'
  || LPAD(nextval('public.reservation_reference_seq')::TEXT, 6, '0')
WHERE reference IS NULL OR BTRIM(reference) = '';

ALTER TABLE public.reservations
  ALTER COLUMN reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_reference_unique
  ON public.reservations(reference);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10, 2)
    GENERATED ALWAYS AS (GREATEST(total_amount - amount_paid, 0)) STORED,
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    GENERATED ALWAYS AS (
      CASE
        WHEN amount_paid <= 0 THEN 'unpaid'
        WHEN amount_paid >= total_amount THEN 'paid'
        ELSE 'partial'
      END
    ) STORED;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_apartment_required,
  ADD CONSTRAINT reservations_apartment_required CHECK (apartment_id IS NOT NULL) NOT VALID,
  DROP CONSTRAINT IF EXISTS reservations_source_check,
  ADD CONSTRAINT reservations_source_check
    CHECK (source IN ('direct', 'phone', 'whatsapp', 'airbnb', 'booking', 'other')),
  DROP CONSTRAINT IF EXISTS reservations_booking_status_check,
  ADD CONSTRAINT reservations_booking_status_check
    CHECK (booking_status IN ('option', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  DROP CONSTRAINT IF EXISTS reservations_adults_check,
  ADD CONSTRAINT reservations_adults_check CHECK (adults >= 1),
  DROP CONSTRAINT IF EXISTS reservations_children_check,
  ADD CONSTRAINT reservations_children_check CHECK (children >= 0),
  DROP CONSTRAINT IF EXISTS reservations_dates_check,
  ADD CONSTRAINT reservations_dates_check CHECK (check_out > check_in),
  DROP CONSTRAINT IF EXISTS reservations_amounts_check,
  ADD CONSTRAINT reservations_amounts_check
    CHECK (total_amount >= 0 AND amount_paid >= 0 AND amount_paid <= total_amount),
  DROP CONSTRAINT IF EXISTS reservations_currency_check,
  ADD CONSTRAINT reservations_currency_check CHECK (currency = 'MAD');

CREATE OR REPLACE FUNCTION public.prepare_reservation_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
BEGIN
  IF NEW.reference IS NULL OR BTRIM(NEW.reference) = '' THEN
    NEW.reference := 'RES-'
      || EXTRACT(YEAR FROM NOW())::INTEGER
      || '-'
      || LPAD(nextval('public.reservation_reference_seq')::TEXT, 6, '0');
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, v_user_id);
  END IF;

  NEW.updated_by := v_user_id;
  NEW.updated_at := NOW();

  IF NEW.booking_status IN ('option', 'confirmed', 'checked_in')
    AND (
      TG_OP = 'INSERT'
      OR NEW.apartment_id IS DISTINCT FROM OLD.apartment_id
      OR NEW.check_in IS DISTINCT FROM OLD.check_in
      OR NEW.check_out IS DISTINCT FROM OLD.check_out
      OR NEW.booking_status IS DISTINCT FROM OLD.booking_status
    )
  THEN
    -- Serialize writes for one apartment so two simultaneous requests cannot
    -- both pass the availability check.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.apartment_id::TEXT, 0));

    IF EXISTS (
      SELECT 1
      FROM public.reservations AS existing
      WHERE existing.apartment_id = NEW.apartment_id
        AND existing.id <> NEW.id
        AND existing.booking_status IN ('option', 'confirmed', 'checked_in')
        AND existing.check_in < NEW.check_out
        AND existing.check_out > NEW.check_in
    ) THEN
      RAISE EXCEPTION 'RESERVATION_DATE_CONFLICT'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_reservation_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_reservation_write_trigger ON public.reservations;
CREATE TRIGGER prepare_reservation_write_trigger
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.prepare_reservation_write();

CREATE INDEX IF NOT EXISTS reservations_booking_status_index
  ON public.reservations(booking_status);
CREATE INDEX IF NOT EXISTS reservations_source_index
  ON public.reservations(source);
CREATE INDEX IF NOT EXISTS reservations_availability_index
  ON public.reservations(apartment_id, check_in, check_out)
  WHERE booking_status IN ('option', 'confirmed', 'checked_in');

COMMENT ON COLUMN public.reservations.reference IS 'Unique human-readable reservation reference.';
COMMENT ON COLUMN public.reservations.booking_status IS 'Operational lifecycle of the stay.';
COMMENT ON COLUMN public.reservations.status IS 'Legacy invoicing status; kept separate from booking_status.';
COMMENT ON COLUMN public.reservations.amount_paid IS 'Total amount already collected for this reservation.';
COMMENT ON COLUMN public.reservations.balance_due IS 'Generated outstanding amount.';
COMMENT ON COLUMN public.reservations.payment_status IS 'Generated from total_amount and amount_paid.';

COMMIT;
