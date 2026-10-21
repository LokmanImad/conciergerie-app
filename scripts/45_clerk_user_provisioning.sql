-- Automated Clerk organization/user provisioning and synchronization.
-- Prerequisite: run migrations 40 through 44 first.

BEGIN;

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clerk_invitation_id TEXT NOT NULL UNIQUE,
  clerk_user_id TEXT,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('owner', 'admin', 'agent', 'accountant', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired', 'failed')),
  invited_by TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email = LOWER(BTRIM(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_email_unique
  ON public.company_invitations(company_id, LOWER(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS company_invitations_company_status_index
  ON public.company_invitations(company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.clerk_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- New companies receive all required control-plane rows atomically. Only the
-- dashboard module is enabled initially; the platform administrator chooses
-- the remaining modules afterwards.
CREATE OR REPLACE FUNCTION public.initialize_company_control_plane()
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

  INSERT INTO public.company_modules (
    company_id, module_key, enabled, enabled_at
  )
  SELECT
    NEW.id,
    module.key,
    module.key = 'dashboard',
    CASE WHEN module.key = 'dashboard' THEN NOW() ELSE NULL END
  FROM public.module_catalog AS module
  ON CONFLICT (company_id, module_key) DO NOTHING;

  INSERT INTO public.company_licenses (
    company_id, status, billing_cycle, expires_at, notes
  )
  SELECT
    NEW.id,
    'trial',
    'manual',
    NOW() + INTERVAL '14 days',
    'Licence d''essai créée automatiquement'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.company_licenses
    WHERE company_id = NEW.id
      AND status IN ('trial', 'active', 'grace', 'suspended')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS initialize_company_control_plane_trigger
  ON public.companies;
CREATE TRIGGER initialize_company_control_plane_trigger
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.initialize_company_control_plane();

-- Repair companies created by an older version of the platform console.
INSERT INTO public.company_branding (company_id, legal_name)
SELECT company.id, company.name
FROM public.companies AS company
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.company_device_policies (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.company_modules (company_id, module_key, enabled, enabled_at)
SELECT
  company.id,
  module.key,
  module.key = 'dashboard',
  CASE WHEN module.key = 'dashboard' THEN NOW() ELSE NULL END
FROM public.companies AS company
CROSS JOIN public.module_catalog AS module
ON CONFLICT (company_id, module_key) DO NOTHING;

INSERT INTO public.company_licenses (
  company_id, status, billing_cycle, expires_at, notes
)
SELECT
  company.id,
  'trial',
  'manual',
  NOW() + INTERVAL '14 days',
  'Licence d''essai créée automatiquement'
FROM public.companies AS company
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_licenses AS license
  WHERE license.company_id = company.id
    AND license.status IN ('trial', 'active', 'grace', 'suspended')
);

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clerk_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_invitations_platform_select
  ON public.company_invitations;
CREATE POLICY company_invitations_platform_select
  ON public.company_invitations
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Webhook event identifiers are server-only and never exposed to clients.

REVOKE ALL ON TABLE
  public.company_invitations,
  public.clerk_webhook_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.company_invitations TO authenticated;

REVOKE ALL ON FUNCTION public.initialize_company_control_plane()
  FROM PUBLIC, anon, authenticated;

COMMIT;
