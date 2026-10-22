-- Tenant routes and user activity metadata.
-- Prerequisite: run migrations 40 through 46 first.

BEGIN;

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clerk_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS password_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS company_members_last_seen_index
  ON public.company_members(company_id, last_seen_at DESC NULLS LAST);

-- Records application activity for the signed-in member without exposing a
-- generic UPDATE permission to the browser.
CREATE OR REPLACE FUNCTION public.record_current_member_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
  v_company_id UUID := public.current_company_id();
BEGIN
  IF v_user_id IS NULL OR v_company_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.company_members
  SET last_seen_at = NOW(), updated_at = NOW()
  WHERE company_id = v_company_id
    AND clerk_user_id = v_user_id
    AND access_status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.record_current_member_activity()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_current_member_activity()
  TO authenticated;

-- The slug lets the Web application verify that /atlas/... really belongs
-- to the company associated with the authenticated account.
CREATE OR REPLACE FUNCTION public.get_current_account_access()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
  v_member public.company_members%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_branding public.company_branding%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF public.is_platform_admin() THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', TRUE,
      'configured', TRUE,
      'platform_admin', TRUE,
      'status', 'active'
    );
  END IF;

  SELECT membership.* INTO v_member
  FROM public.company_members AS membership
  JOIN public.companies AS company ON company.id = membership.company_id
  WHERE membership.clerk_user_id = v_user_id
  ORDER BY
    CASE
      WHEN company.clerk_organization_id = public.jwt_organization_id() THEN 0
      ELSE 1
    END,
    membership.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', FALSE,
      'configured', TRUE,
      'platform_admin', FALSE,
      'status', 'not_assigned'
    );
  END IF;

  SELECT * INTO v_company
  FROM public.companies
  WHERE id = v_member.company_id;

  SELECT * INTO v_branding
  FROM public.company_branding
  WHERE company_id = v_member.company_id;

  RETURN JSONB_BUILD_OBJECT(
    'allowed', v_member.access_status = 'active',
    'configured', TRUE,
    'platform_admin', FALSE,
    'status', v_member.access_status,
    'company_id', v_company.id,
    'company_slug', v_company.slug,
    'company_name', COALESCE(v_branding.legal_name, v_company.name),
    'company_logo_url', v_branding.logo_url,
    'display_name', v_member.display_name,
    'email', v_member.email,
    'role', v_member.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_account_access()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_account_access()
  TO authenticated;

COMMIT;
