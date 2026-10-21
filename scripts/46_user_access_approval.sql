-- Explicit user approval after Clerk invitation acceptance.
-- Prerequisite: run migrations 40 through 45 first.

BEGIN;

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS access_status TEXT;

UPDATE public.company_members
SET access_status = CASE WHEN active THEN 'active' ELSE 'suspended' END
WHERE access_status IS NULL;

ALTER TABLE public.company_members
  ALTER COLUMN access_status SET DEFAULT 'pending_approval',
  ALTER COLUMN access_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_members_access_status_check'
      AND conrelid = 'public.company_members'::REGCLASS
  ) THEN
    ALTER TABLE public.company_members
      ADD CONSTRAINT company_members_access_status_check
      CHECK (access_status IN ('pending_approval', 'active', 'suspended', 'revoked'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS company_members_access_status_index
  ON public.company_members(company_id, access_status, created_at DESC);

-- Returns only the signed-in user's onboarding state. It intentionally avoids
-- granting access to any tenant data while approval is pending.
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
