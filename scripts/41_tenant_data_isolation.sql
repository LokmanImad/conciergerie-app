-- Tenant isolation for all existing business data.
-- Prerequisite: migration 40_saas_control_plane.sql.

BEGIN;

-- Every business row belongs to one company. Existing rows are assigned to
-- the initial company created by migration 40.
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'users',
    'apartments',
    'service_types',
    'charges',
    'reservations',
    'wallets',
    'wallet_reimbursements',
    'profit_payments',
    'payment_settings',
    'traveler_registrations',
    'travelers',
    'owner_contracts',
    'owner_contract_documents',
    'billing_settings',
    'invoices',
    'invoice_items',
    'owner_invoices',
    'owner_invoice_items',
    'tasks'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT',
      v_table
    );
    EXECUTE format(
      'UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL',
      v_table
    ) USING '00000000-0000-4000-8000-000000000001'::UUID;
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN company_id SET NOT NULL', v_table);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)',
      v_table || '_company_index',
      v_table
    );
  END LOOP;
END;
$$;

-- Legacy singleton billing settings become one row per company.
DO $$
DECLARE
  v_constraint RECORD;
  v_max INTEGER;
BEGIN
  IF to_regclass('public.billing_settings') IS NOT NULL THEN
    FOR v_constraint IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.billing_settings'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%id = 1%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.billing_settings DROP CONSTRAINT %I',
        v_constraint.conname
      );
    END LOOP;

    CREATE SEQUENCE IF NOT EXISTS public.billing_settings_id_seq;
    SELECT COALESCE(MAX(id), 0) INTO v_max FROM public.billing_settings;
    PERFORM setval('public.billing_settings_id_seq', GREATEST(v_max, 1), TRUE);
    ALTER TABLE public.billing_settings
      ALTER COLUMN id SET DEFAULT nextval('public.billing_settings_id_seq');
    CREATE UNIQUE INDEX IF NOT EXISTS billing_settings_company_unique
      ON public.billing_settings(company_id);
  END IF;
END;
$$;

-- Older setup scripts could create more than one identical settings row when
-- replayed. Keep the most recently updated row before enforcing one per tenant.
WITH ranked_payment_settings AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_id
           ORDER BY updated_at DESC NULLS LAST, id::TEXT
         ) AS row_number
  FROM public.payment_settings
)
DELETE FROM public.payment_settings AS settings
USING ranked_payment_settings AS ranked
WHERE settings.id = ranked.id AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_company_unique
  ON public.payment_settings(company_id);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_unique
  ON public.users(company_id, LOWER(email));

-- Names only need to be unique inside a company.
ALTER TABLE public.service_types DROP CONSTRAINT IF EXISTS service_types_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS service_types_company_name_unique
  ON public.service_types(company_id, LOWER(name));

ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_person_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS wallets_company_person_unique
  ON public.wallets(company_id, LOWER(person_name));

CREATE OR REPLACE FUNCTION public.assign_current_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.company_id := COALESCE(NEW.company_id, public.current_company_id());

  -- The public check-in form is anonymous. Its travelers inherit the company
  -- from the registration identified by the signed public token.
  IF NEW.company_id IS NULL AND TG_TABLE_NAME = 'travelers' THEN
    SELECT registration.company_id
    INTO NEW.company_id
    FROM public.traveler_registrations AS registration
    WHERE registration.id = (TO_JSONB(NEW) ->> 'registration_id')::UUID;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_CONTEXT_REQUIRED' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_current_company() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'users', 'apartments', 'service_types', 'charges', 'reservations',
    'wallets', 'wallet_reimbursements', 'profit_payments', 'payment_settings',
    'traveler_registrations', 'travelers', 'owner_contracts',
    'owner_contract_documents', 'billing_settings', 'invoices', 'invoice_items',
    'owner_invoices', 'owner_invoice_items', 'tasks'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS assign_current_company_trigger ON public.%I', v_table);
    EXECUTE format(
      'CREATE TRIGGER assign_current_company_trigger BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assign_current_company()',
      v_table
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR (
      public.has_company_access(p_company_id)
      AND public.current_company_role(p_company_id) IN ('owner', 'admin', 'agent', 'accountant')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_delete_company_data(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR (
      public.has_company_access(p_company_id)
      AND public.current_company_role(p_company_id) IN ('owner', 'admin')
    );
$$;

-- Compatibility for existing RPCs. It no longer authorizes a user globally:
-- the row policies below still constrain every statement to one company.
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR public.can_write_company(public.current_company_id());
$$;

REVOKE ALL ON FUNCTION public.can_write_company(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_delete_company_data(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_company_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- Table-to-module mapping used for defense in depth. A disabled module is
-- blocked in PostgreSQL even if somebody calls Supabase outside the UI.
-- The values live inside the DO block so this also works in SQL editors that
-- do not preserve temporary tables between statements.
DO $$
DECLARE
  v_item RECORD;
  v_policy RECORD;
BEGIN
  FOR v_item IN
    SELECT * FROM (VALUES
      ('users', 'dashboard'),
      ('apartments', 'apartments'),
      ('service_types', 'services'),
      ('charges', 'charges'),
      ('reservations', 'reservations'),
      ('wallets', 'wallets'),
      ('wallet_reimbursements', 'wallets'),
      ('profit_payments', 'payments'),
      ('payment_settings', 'payments'),
      ('traveler_registrations', 'travelers'),
      ('travelers', 'travelers'),
      ('owner_contracts', 'contracts'),
      ('owner_contract_documents', 'contracts'),
      ('billing_settings', 'invoices'),
      ('invoices', 'invoices'),
      ('invoice_items', 'invoices'),
      ('owner_invoices', 'owner_billing'),
      ('owner_invoice_items', 'owner_billing'),
      ('tasks', 'tasks')
    ) AS mapping(table_name, module_key)
  LOOP
    IF to_regclass(format('public.%I', v_item.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_item.table_name);

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_item.table_name
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname,
        v_item.table_name
      );
    END LOOP;

    EXECUTE format(
      'CREATE POLICY tenant_select ON public.%I FOR SELECT TO authenticated USING (public.company_has_module(company_id, %L, %L))',
      v_item.table_name,
      v_item.module_key,
      'any'
    );
    EXECUTE format(
      'CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_company(company_id) AND public.company_has_module(company_id, %L, %L))',
      v_item.table_name,
      v_item.module_key,
      'any'
    );
    EXECUTE format(
      'CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING (public.can_write_company(company_id) AND public.company_has_module(company_id, %L, %L)) WITH CHECK (public.can_write_company(company_id) AND public.company_has_module(company_id, %L, %L))',
      v_item.table_name,
      v_item.module_key,
      'any',
      v_item.module_key,
      'any'
    );
    EXECUTE format(
      'CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING (public.can_delete_company_data(company_id) AND public.company_has_module(company_id, %L, %L))',
      v_item.table_name,
      v_item.module_key,
      'any'
    );
  END LOOP;
END;
$$;

-- New companies receive the required configuration rows. Modules remain off
-- until the platform administrator explicitly enables them.
CREATE OR REPLACE FUNCTION public.provision_company_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.company_branding (company_id, legal_name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO public.company_device_policies (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO public.company_modules (company_id, module_key, enabled)
  SELECT NEW.id, key, FALSE FROM public.module_catalog
  ON CONFLICT (company_id, module_key) DO NOTHING;

  IF to_regclass('public.billing_settings') IS NOT NULL THEN
    INSERT INTO public.billing_settings (company_id, company_name)
    VALUES (NEW.id, NEW.name)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  IF to_regclass('public.payment_settings') IS NOT NULL THEN
    INSERT INTO public.payment_settings (company_id, payment_frequency_months)
    VALUES (NEW.id, 3)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_company_defaults() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS provision_company_defaults_trigger ON public.companies;
CREATE TRIGGER provision_company_defaults_trigger
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.provision_company_defaults();

COMMIT;
