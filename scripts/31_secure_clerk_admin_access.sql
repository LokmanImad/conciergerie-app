-- Security migration: restrict the application data to the two Clerk admins.
--
-- The two currently active Clerk accounts are registered as administrators.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_admins (
  clerk_user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_admins (clerk_user_id, display_name)
VALUES
  ('user_37UMImsUfUaR3OqGqNBCUMJ1JH7', 'Administrateur 1'),
  ('user_377eMELDtkyvx9NoKTQmZ7yQLaQ', 'Administrateur 2')
ON CONFLICT (clerk_user_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    active = TRUE,
    updated_at = NOW();

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE clerk_user_id = (SELECT auth.jwt() ->> 'sub')
      AND active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- Remove every old permissive policy before installing the admin-only policy.
DO $$
DECLARE
  v_table TEXT;
  v_policy RECORD;
  v_tables TEXT[] := ARRAY[
    'users',
    'app_admins',
    'apartments',
    'service_types',
    'charges',
    'reservations',
    'wallets',
    'wallet_reimbursements',
    'profit_payments',
    'payment_settings'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_app_admin())) WITH CHECK ((SELECT public.is_app_admin()))',
      'Admins have full access',
      v_table
    );

    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', v_table);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      v_table
    );
  END LOOP;
END;
$$;

-- SECURITY DEFINER previously allowed these RPCs to bypass RLS. Run them with
-- the caller's permissions instead, then remove all anonymous execution rights.
DO $$
DECLARE
  v_signature TEXT;
  v_public_rpcs TEXT[] := ARRAY[
    'public.update_reservation(uuid,uuid,text,date,date,numeric,text,text,text)',
    'public.update_charge(uuid,uuid,uuid,numeric,date,text,text,text,uuid,text)',
    'public.mark_charge_as_paid(uuid)',
    'public.mark_charge_as_invoiced(uuid)',
    'public.mark_reservation_as_invoiced(uuid)',
    'public.mark_payment_as_sent(uuid)',
    'public.auto_generate_current_month_payment()',
    'public.recalculate_payment(uuid)',
    'public.record_wallet_reimbursement(text,numeric,text)',
    'public.get_wallet_balance(text)'
  ];
  v_internal_functions TEXT[] := ARRAY[
    'public.increment_wallet(text,numeric)',
    'public.decrement_wallet(text,numeric)',
    'public.update_updated_at_column()',
    'public.trigger_recalculate_current_month_payment()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_public_rpcs
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', v_signature);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_signature);
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY v_internal_functions
  LOOP
    IF to_regprocedure(v_signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', v_signature);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_signature);
    END IF;
  END LOOP;
END;
$$;

-- New functions should not become executable by everyone by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
