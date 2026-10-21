-- Cross-tenant relationship checks and tenant-aware private Storage policies.
-- Prerequisite: run migrations 40, 41 and 42 first.

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_same_company_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_column_name TEXT := TG_ARGV[0];
  v_parent_table REGCLASS := TG_ARGV[1]::REGCLASS;
  v_reference_id UUID;
  v_parent_company_id UUID;
BEGIN
  v_reference_id := NULLIF(TO_JSONB(NEW) ->> v_column_name, '')::UUID;

  IF v_reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE FORMAT(
    'SELECT company_id FROM %s WHERE id = $1',
    v_parent_table
  )
  INTO v_parent_company_id
  USING v_reference_id;

  IF v_parent_company_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_REFERENCE_NOT_FOUND: %.%', v_parent_table, v_reference_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_parent_company_id THEN
    RAISE EXCEPTION 'CROSS_TENANT_REFERENCE_DENIED: %', v_column_name
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_same_company_reference()
  FROM PUBLIC, anon, authenticated;

-- SECURITY DEFINER is required for the public-token workflow, therefore the
-- two authenticated administration RPCs enforce company ownership explicitly.
CREATE OR REPLACE FUNCTION public.create_traveler_registration_link(
  p_reservation_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (id UUID, status TEXT, expected_adults INTEGER, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_adults INTEGER;
  v_company_id UUID;
  v_existing_status TEXT;
BEGIN
  IF LENGTH(p_token_hash) <> 64 OR p_expires_at <= NOW() THEN
    RAISE EXCEPTION 'INVALID_LINK_PARAMETERS' USING ERRCODE = '22023';
  END IF;

  SELECT reservation.adults, reservation.company_id
  INTO v_adults, v_company_id
  FROM public.reservations AS reservation
  WHERE reservation.id = p_reservation_id
    AND public.can_write_company(reservation.company_id)
    AND public.company_has_module(reservation.company_id, 'police_forms', 'any');

  IF v_adults IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT registration.status INTO v_existing_status
  FROM public.traveler_registrations AS registration
  WHERE registration.reservation_id = p_reservation_id
    AND registration.company_id = v_company_id;

  IF v_existing_status IN ('submitted', 'verified') THEN
    RAISE EXCEPTION 'REGISTRATION_ALREADY_SUBMITTED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.traveler_registrations (
    company_id, reservation_id, token_hash, status, expected_adults,
    expires_at, created_by
  ) VALUES (
    v_company_id, p_reservation_id, p_token_hash, 'sent', v_adults,
    p_expires_at, auth.jwt() ->> 'sub'
  )
  ON CONFLICT (reservation_id) DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    status = 'sent',
    expected_adults = EXCLUDED.expected_adults,
    expires_at = EXCLUDED.expires_at,
    revoked_at = NULL,
    updated_at = NOW()
  WHERE public.traveler_registrations.company_id = v_company_id;

  RETURN QUERY
  SELECT registration.id, registration.status,
         registration.expected_adults, registration.expires_at
  FROM public.traveler_registrations AS registration
  WHERE registration.reservation_id = p_reservation_id
    AND registration.company_id = v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_traveler_registration(
  p_registration_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS' USING ERRCODE = '22023';
  END IF;

  SELECT registration.company_id INTO v_company_id
  FROM public.traveler_registrations AS registration
  WHERE registration.id = p_registration_id
    AND public.can_write_company(registration.company_id)
    AND public.company_has_module(registration.company_id, 'police_forms', 'any');

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.traveler_registrations
  SET status = p_status,
      verified_at = CASE WHEN p_status = 'verified' THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE traveler_registrations.id = p_registration_id
    AND traveler_registrations.company_id = v_company_id
    AND (
      (p_status = 'verified' AND traveler_registrations.status IN ('submitted', 'rejected'))
      OR (p_status = 'rejected' AND traveler_registrations.status IN ('submitted', 'verified', 'rejected'))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_READY_FOR_REVIEW' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.travelers
  SET status = p_status, updated_at = NOW()
  WHERE registration_id = p_registration_id
    AND company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_traveler_registration_link(UUID, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_traveler_registration(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_traveler_registration_link(UUID, TEXT, TIMESTAMPTZ)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_traveler_registration(UUID, TEXT)
  TO authenticated;

DO $$
DECLARE
  v_relation RECORD;
BEGIN
  FOR v_relation IN
    SELECT * FROM (VALUES
      ('reservations', 'apartment_id', 'public.apartments'),
      ('charges', 'apartment_id', 'public.apartments'),
      ('charges', 'service_type_id', 'public.service_types'),
      ('charges', 'reservation_id', 'public.reservations'),
      ('traveler_registrations', 'reservation_id', 'public.reservations'),
      ('travelers', 'registration_id', 'public.traveler_registrations'),
      ('travelers', 'reservation_id', 'public.reservations'),
      ('owner_contracts', 'apartment_id', 'public.apartments'),
      ('owner_contract_documents', 'contract_id', 'public.owner_contracts'),
      ('invoices', 'reservation_id', 'public.reservations'),
      ('invoices', 'apartment_id', 'public.apartments'),
      ('invoice_items', 'invoice_id', 'public.invoices'),
      ('owner_invoices', 'apartment_id', 'public.apartments'),
      ('owner_invoice_items', 'owner_invoice_id', 'public.owner_invoices'),
      ('owner_invoice_items', 'charge_id', 'public.charges'),
      ('tasks', 'apartment_id', 'public.apartments'),
      ('tasks', 'reservation_id', 'public.reservations')
    ) AS relation(table_name, column_name, parent_table)
  LOOP
    IF TO_REGCLASS(FORMAT('public.%I', v_relation.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE FORMAT(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      'enforce_tenant_relation_' || v_relation.column_name,
      v_relation.table_name
    );
    EXECUTE FORMAT(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I, company_id ON public.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.assert_same_company_reference(%L, %L)',
      'enforce_tenant_relation_' || v_relation.column_name,
      v_relation.column_name,
      v_relation.table_name,
      v_relation.column_name,
      v_relation.parent_table
    );
  END LOOP;
END;
$$;

-- A private Storage object is accessible only when its first path segment is
-- the id of a row owned by the current company. Public traveler uploads use
-- the server-side service key and are not opened to anonymous Storage access.
DROP POLICY IF EXISTS identity_documents_admin_select ON storage.objects;
DROP POLICY IF EXISTS identity_documents_tenant_select ON storage.objects;
CREATE POLICY identity_documents_tenant_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND EXISTS (
      SELECT 1
      FROM public.traveler_registrations AS registration
      WHERE registration.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.company_has_module(registration.company_id, 'police_forms', 'any')
    )
  );

DROP POLICY IF EXISTS charge_receipts_admin_select ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_admin_insert ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_admin_update ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_admin_delete ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_tenant_select ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_tenant_insert ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_tenant_update ON storage.objects;
DROP POLICY IF EXISTS charge_receipts_tenant_delete ON storage.objects;

CREATE POLICY charge_receipts_tenant_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'charge-receipts'
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.company_has_module(charge.company_id, 'charges', 'any')
    )
  );

CREATE POLICY charge_receipts_tenant_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'charge-receipts'
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(charge.company_id)
        AND public.company_has_module(charge.company_id, 'charges', 'any')
    )
  );

CREATE POLICY charge_receipts_tenant_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'charge-receipts'
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(charge.company_id)
        AND public.company_has_module(charge.company_id, 'charges', 'any')
    )
  )
  WITH CHECK (
    bucket_id = 'charge-receipts'
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(charge.company_id)
        AND public.company_has_module(charge.company_id, 'charges', 'any')
    )
  );

CREATE POLICY charge_receipts_tenant_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'charge-receipts'
    AND EXISTS (
      SELECT 1 FROM public.charges AS charge
      WHERE charge.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_delete_company_data(charge.company_id)
        AND public.company_has_module(charge.company_id, 'charges', 'any')
    )
  );

DROP POLICY IF EXISTS owner_contract_files_admin_select ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_admin_insert ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_admin_update ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_admin_delete ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_tenant_select ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_tenant_insert ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_tenant_update ON storage.objects;
DROP POLICY IF EXISTS owner_contract_files_tenant_delete ON storage.objects;

CREATE POLICY owner_contract_files_tenant_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'owner-contracts'
    AND EXISTS (
      SELECT 1 FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.company_has_module(contract.company_id, 'contracts', 'any')
    )
  );

CREATE POLICY owner_contract_files_tenant_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'owner-contracts'
    AND EXISTS (
      SELECT 1 FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(contract.company_id)
        AND public.company_has_module(contract.company_id, 'contracts', 'any')
    )
  );

CREATE POLICY owner_contract_files_tenant_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'owner-contracts'
    AND EXISTS (
      SELECT 1 FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(contract.company_id)
        AND public.company_has_module(contract.company_id, 'contracts', 'any')
    )
  )
  WITH CHECK (
    bucket_id = 'owner-contracts'
    AND EXISTS (
      SELECT 1 FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_write_company(contract.company_id)
        AND public.company_has_module(contract.company_id, 'contracts', 'any')
    )
  );

CREATE POLICY owner_contract_files_tenant_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'owner-contracts'
    AND EXISTS (
      SELECT 1 FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
        AND public.can_delete_company_data(contract.company_id)
        AND public.company_has_module(contract.company_id, 'contracts', 'any')
    )
  );

COMMIT;
