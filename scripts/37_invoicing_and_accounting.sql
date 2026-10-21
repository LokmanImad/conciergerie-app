-- Invoicing foundation and company billing settings.
-- Prerequisite: run migrations 31, 32 and 35 first.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Conciergerie Privée',
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_identifier TEXT,
  bank_details TEXT,
  default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (default_tax_rate >= 0 AND default_tax_rate <= 100),
  invoice_prefix TEXT NOT NULL DEFAULT 'FAC',
  payment_terms_days INTEGER NOT NULL DEFAULT 7 CHECK (payment_terms_days >= 0 AND payment_terms_days <= 365),
  footer_text TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.billing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  client_name TEXT NOT NULL,
  client_contact TEXT,
  billing_address TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('bank', 'cash')),
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  notes TEXT,
  terms TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (due_date >= issue_date),
  CHECK (amount_paid <= total_amount)
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_active_reservation_unique
  ON public.invoices(reservation_id)
  WHERE reservation_id IS NOT NULL AND status <> 'cancelled';
CREATE INDEX IF NOT EXISTS invoices_status_index ON public.invoices(status);
CREATE INDEX IF NOT EXISTS invoices_issue_date_index ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS invoices_apartment_index ON public.invoices(apartment_id);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_items_invoice_index ON public.invoice_items(invoice_id, position);

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
  IF NEW.invoice_number IS NULL OR BTRIM(NEW.invoice_number) = '' THEN
    SELECT invoice_prefix INTO v_prefix FROM public.billing_settings WHERE id = 1;
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

DROP TRIGGER IF EXISTS prepare_invoice_write_trigger ON public.invoices;
CREATE TRIGGER prepare_invoice_write_trigger
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.prepare_invoice_write();

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC(12, 2);
  v_tax_rate NUMERIC(5, 2);
BEGIN
  v_invoice_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  SELECT tax_rate INTO v_tax_rate FROM public.invoices WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET subtotal = ROUND(v_subtotal, 2),
      tax_amount = ROUND(v_subtotal * COALESCE(v_tax_rate, 0) / 100, 2),
      total_amount = ROUND(v_subtotal + (v_subtotal * COALESCE(v_tax_rate, 0) / 100), 2)
  WHERE id = v_invoice_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_invoice_totals() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS recalculate_invoice_totals_trigger ON public.invoice_items;
CREATE TRIGGER recalculate_invoice_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_totals();

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

  SELECT r.*, a.name AS apartment_name
  INTO v_reservation
  FROM public.reservations AS r
  LEFT JOIN public.apartments AS a ON a.id = r.apartment_id
  WHERE r.id = p_reservation_id AND r.booking_status <> 'cancelled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_settings FROM public.billing_settings WHERE id = 1;
  v_due_date := COALESCE(p_due_date, p_issue_date + COALESCE(v_settings.payment_terms_days, 7));

  INSERT INTO public.invoices (
    invoice_number, reservation_id, apartment_id, client_name, client_contact,
    issue_date, due_date, tax_rate, amount_paid, payment_method, notes, terms
  ) VALUES (
    NULL, v_reservation.id, v_reservation.apartment_id, v_reservation.client_name,
    v_reservation.client_number, p_issue_date, v_due_date,
    COALESCE(p_tax_rate, v_settings.default_tax_rate, 0),
    0,
    v_reservation.payment_method, NULLIF(BTRIM(p_notes), ''),
    'Facture établie à partir de la réservation ' || v_reservation.reference
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, position)
  VALUES (
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
      status = CASE WHEN COALESCE(v_reservation.amount_paid, 0) >= total_amount AND total_amount > 0 THEN 'paid' ELSE 'draft' END,
      paid_at = CASE WHEN COALESCE(v_reservation.amount_paid, 0) >= total_amount AND total_amount > 0 THEN NOW() ELSE NULL END
  WHERE id = v_invoice_id;
  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_invoice_as_sent(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  UPDATE public.invoices SET status = 'sent', sent_at = NOW()
  WHERE id = p_invoice_id AND status IN ('draft', 'overdue');
  IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_NOT_SENDABLE' USING ERRCODE = 'P0001'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_invoice_as_paid(p_invoice_id UUID, p_payment_method TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  IF p_payment_method NOT IN ('bank', 'cash') THEN RAISE EXCEPTION 'INVALID_PAYMENT_METHOD' USING ERRCODE = '22023'; END IF;
  UPDATE public.invoices
  SET status = 'paid', amount_paid = total_amount, payment_method = p_payment_method, paid_at = NOW()
  WHERE id = p_invoice_id AND status <> 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION 'INVOICE_NOT_PAYABLE' USING ERRCODE = 'P0001'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501'; END IF;
  UPDATE public.invoices SET status = 'cancelled'
  WHERE id = p_invoice_id AND status <> 'paid';
  IF NOT FOUND THEN RAISE EXCEPTION 'PAID_OR_MISSING_INVOICE' USING ERRCODE = 'P0001'; END IF;
END;
$$;

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_settings_admin_access ON public.billing_settings;
CREATE POLICY billing_settings_admin_access ON public.billing_settings FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()));
DROP POLICY IF EXISTS invoices_admin_access ON public.invoices;
CREATE POLICY invoices_admin_access ON public.invoices FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()));
DROP POLICY IF EXISTS invoice_items_admin_access ON public.invoice_items;
CREATE POLICY invoice_items_admin_access ON public.invoice_items FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.billing_settings, public.invoices, public.invoice_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_settings, public.invoices, public.invoice_items TO authenticated;

REVOKE ALL ON FUNCTION public.create_invoice_from_reservation(UUID, DATE, DATE, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_invoice_as_sent(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_invoice_as_paid(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_reservation(UUID, DATE, DATE, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_as_sent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoice_as_paid(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(UUID) TO authenticated;

COMMIT;
