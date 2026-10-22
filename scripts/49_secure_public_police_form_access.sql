-- Prevent disabled police-form modules from being bypassed through public RPCs.
-- Run after migrations 40 through 48.

BEGIN;

CREATE OR REPLACE FUNCTION public.public_police_form_token_active(p_token_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.traveler_registrations AS registration
    JOIN public.companies AS company ON company.id = registration.company_id
    JOIN public.company_modules AS enabled_module
      ON enabled_module.company_id = company.id
     AND enabled_module.module_key = 'police_forms'
    JOIN public.module_catalog AS module ON module.key = enabled_module.module_key
    WHERE registration.token_hash = p_token_hash
      AND registration.revoked_at IS NULL
      AND registration.expires_at > NOW()
      AND company.status IN ('trial', 'active')
      AND company.web_enabled
      AND public.company_license_active(company.id)
      AND enabled_module.enabled
      AND module.active
      AND module.web_available
  );
$$;

REVOKE ALL ON FUNCTION public.public_police_form_token_active(TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_traveler_registration_secure(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.public_police_form_token_active(p_token_hash) THEN
    RETURN NULL;
  END IF;
  RETURN public.get_public_traveler_registration(p_token_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_registration_upload_scope_secure(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.public_police_form_token_active(p_token_hash) THEN
    RETURN NULL;
  END IF;
  RETURN public.get_public_registration_upload_scope(p_token_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_traveler_registration_secure(
  p_token_hash TEXT,
  p_travelers JSONB,
  p_signed_by TEXT,
  p_signature_data_url TEXT,
  p_consent BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.public_police_form_token_active(p_token_hash) THEN
    RAISE EXCEPTION 'INVALID_OR_DISABLED_LINK' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.submit_public_traveler_registration(
    p_token_hash,
    p_travelers,
    p_signed_by,
    p_signature_data_url,
    p_consent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_traveler_registration(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_registration_upload_scope(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_public_traveler_registration(TEXT, JSONB, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_traveler_registration_secure(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_registration_upload_scope_secure(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_traveler_registration_secure(TEXT, JSONB, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_traveler_registration_secure(TEXT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_registration_upload_scope_secure(TEXT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_traveler_registration_secure(TEXT, JSONB, TEXT, TEXT, BOOLEAN)
  TO anon, authenticated;

COMMIT;

