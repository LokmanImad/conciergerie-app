-- Owner contract drafting, audit trail and private signed-document storage.
-- Prerequisite: run migrations 31 and 35 first.

BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE RESTRICT,
  contract_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Contrat de gestion locative',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'signed', 'expired', 'archived')),
  owner_name TEXT NOT NULL,
  owner_contact TEXT,
  owner_address TEXT,
  owner_identifier TEXT,
  manager_name TEXT NOT NULL,
  manager_address TEXT,
  manager_identifier TEXT,
  property_address TEXT,
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 25
    CHECK (commission_rate >= 0 AND commission_rate <= 100),
  start_date DATE NOT NULL,
  end_date DATE,
  content TEXT NOT NULL,
  notes TEXT,
  generated_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.owner_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.owner_contracts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, position)
);

CREATE INDEX IF NOT EXISTS owner_contracts_apartment_index
  ON public.owner_contracts(apartment_id);
CREATE INDEX IF NOT EXISTS owner_contracts_status_index
  ON public.owner_contracts(status);
CREATE INDEX IF NOT EXISTS owner_contracts_dates_index
  ON public.owner_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS owner_contract_documents_contract_index
  ON public.owner_contract_documents(contract_id, position);

CREATE OR REPLACE FUNCTION public.prepare_owner_contract_write()
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

REVOKE ALL ON FUNCTION public.prepare_owner_contract_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_owner_contract_write_trigger ON public.owner_contracts;
CREATE TRIGGER prepare_owner_contract_write_trigger
BEFORE INSERT OR UPDATE ON public.owner_contracts
FOR EACH ROW EXECUTE FUNCTION public.prepare_owner_contract_write();

CREATE OR REPLACE FUNCTION public.prepare_owner_contract_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.created_by := COALESCE(NEW.created_by, auth.jwt() ->> 'sub');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_owner_contract_document() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_owner_contract_document_trigger ON public.owner_contract_documents;
CREATE TRIGGER prepare_owner_contract_document_trigger
BEFORE INSERT ON public.owner_contract_documents
FOR EACH ROW EXECUTE FUNCTION public.prepare_owner_contract_document();

ALTER TABLE public.owner_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_contract_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_contracts_admin_access ON public.owner_contracts;
CREATE POLICY owner_contracts_admin_access
  ON public.owner_contracts FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin()))
  WITH CHECK ((SELECT public.is_app_admin()));

DROP POLICY IF EXISTS owner_contract_documents_admin_access ON public.owner_contract_documents;
CREATE POLICY owner_contract_documents_admin_access
  ON public.owner_contract_documents FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin()))
  WITH CHECK ((SELECT public.is_app_admin()));

REVOKE ALL PRIVILEGES ON TABLE public.owner_contracts FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.owner_contract_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_contract_documents TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'owner-contracts',
  'owner-contracts',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS owner_contract_files_admin_select ON storage.objects;
CREATE POLICY owner_contract_files_admin_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'owner-contracts' AND (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS owner_contract_files_admin_insert ON storage.objects;
CREATE POLICY owner_contract_files_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'owner-contracts'
    AND (SELECT public.is_app_admin())
    AND EXISTS (
      SELECT 1
      FROM public.owner_contracts AS contract
      WHERE contract.id::TEXT = SPLIT_PART(name, '/', 1)
    )
  );

DROP POLICY IF EXISTS owner_contract_files_admin_update ON storage.objects;
CREATE POLICY owner_contract_files_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'owner-contracts' AND (SELECT public.is_app_admin()))
  WITH CHECK (bucket_id = 'owner-contracts' AND (SELECT public.is_app_admin()));

DROP POLICY IF EXISTS owner_contract_files_admin_delete ON storage.objects;
CREATE POLICY owner_contract_files_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'owner-contracts' AND (SELECT public.is_app_admin()));

COMMENT ON TABLE public.owner_contracts IS
  'Editable owner-management contracts with immutable party snapshots.';
COMMENT ON TABLE public.owner_contract_documents IS
  'Private signed scans or PDF files attached to an owner contract.';

COMMIT;
