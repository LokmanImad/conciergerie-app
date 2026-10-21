-- SaaS control plane: companies, branding, entitlements, licenses and devices.
-- Run after migration 39. This migration is additive and preserves all data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  clerk_user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id TEXT UNIQUE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial', 'active', 'suspended', 'expired', 'cancelled')),
  web_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  mobile_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_users INTEGER CHECK (max_users IS NULL OR max_users > 0),
  max_apartments INTEGER CHECK (max_apartments IS NULL OR max_apartments > 0),
  timezone TEXT NOT NULL DEFAULT 'Africa/Casablanca',
  locale TEXT NOT NULL DEFAULT 'fr-MA',
  currency TEXT NOT NULL DEFAULT 'MAD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('owner', 'admin', 'agent', 'accountant', 'viewer')),
  display_name TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, clerk_user_id)
);

CREATE TABLE IF NOT EXISTS public.company_branding (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  icon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#123F3A'
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#C79A4A'
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  legal_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  company_identifier TEXT,
  bank_details TEXT,
  invoice_footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.module_catalog (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  name TEXT NOT NULL,
  description TEXT,
  web_available BOOLEAN NOT NULL DEFAULT TRUE,
  mobile_available BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.company_modules (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.module_catalog(key) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.company_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'grace', 'suspended', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  billing_cycle TEXT NOT NULL DEFAULT 'manual'
    CHECK (billing_cycle IN ('manual', 'monthly', 'yearly', 'lifetime')),
  price_amount NUMERIC(12, 2) CHECK (price_amount IS NULL OR price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'MAD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR expires_at > starts_at),
  CHECK (grace_ends_at IS NULL OR expires_at IS NULL OR grace_ends_at >= expires_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS company_licenses_current_unique
  ON public.company_licenses(company_id)
  WHERE status IN ('trial', 'active', 'grace', 'suspended');

CREATE TABLE IF NOT EXISTS public.company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  domain_type TEXT NOT NULL DEFAULT 'subdomain'
    CHECK (domain_type IN ('subdomain', 'custom')),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_domains_primary_unique
  ON public.company_domains(company_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.company_device_policies (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  access_mode TEXT NOT NULL DEFAULT 'any'
    CHECK (access_mode IN ('any', 'approved_only', 'certificate_required')),
  approval_scope TEXT NOT NULL DEFAULT 'company_admin'
    CHECK (approval_scope IN ('company_admin', 'platform_admin')),
  max_devices_per_user INTEGER CHECK (max_devices_per_user IS NULL OR max_devices_per_user > 0),
  web_enforced BOOLEAN NOT NULL DEFAULT FALSE,
  mobile_enforced BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'mobile')),
  device_key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'suspended', 'revoked', 'expired')),
  browser TEXT,
  operating_system TEXT,
  last_ip INET,
  last_seen_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, device_key_hash)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS company_members_user_index
  ON public.company_members(clerk_user_id) WHERE active;
CREATE INDEX IF NOT EXISTS companies_clerk_organization_index
  ON public.companies(clerk_organization_id) WHERE clerk_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS trusted_devices_user_index
  ON public.trusted_devices(company_id, clerk_user_id, status);
CREATE INDEX IF NOT EXISTS audit_logs_company_date_index
  ON public.audit_logs(company_id, created_at DESC);

INSERT INTO public.module_catalog (key, name, description, mobile_available, position)
VALUES
  ('dashboard', 'Tableau de bord', 'Vue générale et indicateurs', TRUE, 10),
  ('apartments', 'Appartements', 'Biens et propriétaires', FALSE, 20),
  ('reservations', 'Réservations', 'Séjours et paiements clients', TRUE, 30),
  ('travelers', 'Voyageurs', 'Enregistrement des voyageurs', TRUE, 40),
  ('police_forms', 'Fiches de police', 'Documents, signatures et fiches', TRUE, 50),
  ('charges', 'Charges', 'Dépenses et justificatifs', TRUE, 60),
  ('tasks', 'Tâches', 'Planning et alertes', TRUE, 70),
  ('accounting', 'Comptabilité', 'Synthèses comptables', FALSE, 80),
  ('invoices', 'Factures clients', 'Facturation des réservations', FALSE, 90),
  ('owner_billing', 'Factures propriétaires', 'Relevés et versements propriétaires', FALSE, 100),
  ('contracts', 'Contrats', 'Contrats et documents signés', TRUE, 110),
  ('wallets', 'Portefeuilles', 'Avances et remboursements', FALSE, 120),
  ('payments', 'Paiements', 'Paiements et répartitions', FALSE, 130),
  ('services', 'Types de services', 'Catalogue des services et charges', FALSE, 140)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  mobile_available = EXCLUDED.mobile_available,
  position = EXCLUDED.position;

-- Preserve the current installation as the first company.
INSERT INTO public.companies (
  id, slug, name, status, web_enabled, mobile_enabled
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'conciergerie-privee',
  'Conciergerie Privée',
  'active',
  TRUE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_admins (clerk_user_id, display_name, email, active)
SELECT clerk_user_id, display_name, email, active
FROM public.app_admins
ON CONFLICT (clerk_user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.company_members (
  company_id, clerk_user_id, role, display_name, email, active
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  clerk_user_id,
  'owner',
  display_name,
  email,
  active
FROM public.app_admins
ON CONFLICT (company_id, clerk_user_id) DO UPDATE SET
  role = 'owner',
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  active = EXCLUDED.active,
  updated_at = NOW();

INSERT INTO public.company_branding (company_id, legal_name)
VALUES ('00000000-0000-4000-8000-000000000001', 'Conciergerie Privée')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.company_modules (company_id, module_key, enabled, enabled_at)
SELECT '00000000-0000-4000-8000-000000000001', key, TRUE, NOW()
FROM public.module_catalog
ON CONFLICT (company_id, module_key) DO UPDATE SET
  enabled = TRUE,
  enabled_at = COALESCE(public.company_modules.enabled_at, NOW()),
  updated_at = NOW();

INSERT INTO public.company_licenses (
  company_id, status, billing_cycle, notes
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  'active',
  'lifetime',
  'Licence interne de la société initiale'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_licenses
  WHERE company_id = '00000000-0000-4000-8000-000000000001'
    AND status IN ('trial', 'active', 'grace', 'suspended')
);

INSERT INTO public.company_device_policies (company_id)
VALUES ('00000000-0000-4000-8000-000000000001')
ON CONFLICT (company_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.jwt_organization_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'org_id',
    auth.jwt() -> 'o' ->> 'id'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND active
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT id FROM public.companies
      WHERE clerk_organization_id = public.jwt_organization_id()
      LIMIT 1
    ),
    (
      SELECT membership.company_id
      FROM (
        SELECT company_id, COUNT(*) OVER () AS membership_count
        FROM public.company_members
        WHERE clerk_user_id = (auth.jwt() ->> 'sub') AND active
      ) AS membership
      WHERE membership.membership_count = 1
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_company_role(p_company_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.company_members
  WHERE company_id = COALESCE(p_company_id, public.current_company_id())
    AND clerk_user_id = (auth.jwt() ->> 'sub')
    AND active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.company_license_active(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies AS company
    JOIN public.company_licenses AS license ON license.company_id = company.id
    WHERE company.id = p_company_id
      AND company.status IN ('trial', 'active')
      AND license.status IN ('trial', 'active', 'grace')
      AND license.starts_at <= NOW()
      AND (
        license.expires_at IS NULL
        OR license.expires_at > NOW()
        OR (license.status = 'grace' AND license.grace_ends_at > NOW())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR (
      p_company_id = public.current_company_id()
      AND public.company_license_active(p_company_id)
      AND EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = p_company_id
          AND clerk_user_id = (auth.jwt() ->> 'sub')
          AND active
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_company(p_company_id UUID)
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

CREATE OR REPLACE FUNCTION public.company_has_module(
  p_company_id UUID,
  p_module_key TEXT,
  p_platform TEXT DEFAULT 'web'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_admin()
    OR (
      public.has_company_access(p_company_id)
      AND EXISTS (
        SELECT 1
        FROM public.company_modules AS enabled_module
        JOIN public.module_catalog AS module ON module.key = enabled_module.module_key
        JOIN public.companies AS company ON company.id = enabled_module.company_id
        WHERE enabled_module.company_id = p_company_id
          AND enabled_module.module_key = p_module_key
          AND enabled_module.enabled
          AND module.active
          AND CASE
            WHEN p_platform = 'mobile' THEN company.mobile_enabled AND module.mobile_available
            WHEN p_platform = 'web' THEN company.web_enabled AND module.web_available
            WHEN p_platform = 'any' THEN TRUE
            ELSE FALSE
          END
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_current_entitlements(
  p_platform TEXT DEFAULT 'web'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_company_id();
  v_platform_admin BOOLEAN := public.is_platform_admin();
  v_platform_allowed BOOLEAN := FALSE;
  v_modules JSONB := '[]'::JSONB;
  v_branding JSONB;
BEGIN
  IF p_platform NOT IN ('web', 'mobile') THEN
    RAISE EXCEPTION 'INVALID_PLATFORM' USING ERRCODE = '22023';
  END IF;

  IF v_platform_admin THEN
    v_platform_allowed := TRUE;
  ELSIF v_company_id IS NOT NULL THEN
    SELECT public.company_license_active(company.id)
      AND CASE
        WHEN p_platform = 'mobile' THEN company.mobile_enabled
        ELSE company.web_enabled
      END
    INTO v_platform_allowed
    FROM public.companies AS company
    WHERE company.id = v_company_id;

    SELECT COALESCE(
      JSONB_AGG(enabled_module.module_key ORDER BY module.position),
      '[]'::JSONB
    )
    INTO v_modules
    FROM public.company_modules AS enabled_module
    JOIN public.module_catalog AS module ON module.key = enabled_module.module_key
    WHERE enabled_module.company_id = v_company_id
      AND enabled_module.enabled
      AND module.active
      AND CASE
        WHEN p_platform = 'mobile' THEN module.mobile_available
        ELSE module.web_available
      END;

    SELECT JSONB_BUILD_OBJECT(
      'name', COALESCE(branding.legal_name, company.name),
      'logo_url', branding.logo_url,
      'primary_color', branding.primary_color,
      'accent_color', branding.accent_color
    )
    INTO v_branding
    FROM public.companies AS company
    LEFT JOIN public.company_branding AS branding ON branding.company_id = company.id
    WHERE company.id = v_company_id;
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'company_id', v_company_id,
    'platform_admin', v_platform_admin,
    'platform_allowed', COALESCE(v_platform_allowed, FALSE),
    'modules', v_modules,
    'branding', v_branding
  );
END;
$$;

REVOKE ALL ON FUNCTION public.jwt_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_company_role(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_license_active(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_company_access(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_company(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_has_module(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_entitlements(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.jwt_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_company_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_license_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_has_module(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_entitlements(TEXT) TO authenticated;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_device_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_self_select ON public.platform_admins;
DROP POLICY IF EXISTS platform_admins_platform_manage ON public.platform_admins;
DROP POLICY IF EXISTS companies_member_select ON public.companies;
DROP POLICY IF EXISTS companies_platform_manage ON public.companies;
DROP POLICY IF EXISTS company_members_member_select ON public.company_members;
DROP POLICY IF EXISTS company_members_platform_manage ON public.company_members;
DROP POLICY IF EXISTS company_branding_member_select ON public.company_branding;
DROP POLICY IF EXISTS company_branding_manager_write ON public.company_branding;
DROP POLICY IF EXISTS module_catalog_authenticated_select ON public.module_catalog;
DROP POLICY IF EXISTS module_catalog_platform_manage ON public.module_catalog;
DROP POLICY IF EXISTS company_modules_member_select ON public.company_modules;
DROP POLICY IF EXISTS company_modules_platform_manage ON public.company_modules;
DROP POLICY IF EXISTS company_licenses_member_select ON public.company_licenses;
DROP POLICY IF EXISTS company_licenses_platform_manage ON public.company_licenses;
DROP POLICY IF EXISTS company_domains_member_select ON public.company_domains;
DROP POLICY IF EXISTS company_domains_platform_manage ON public.company_domains;
DROP POLICY IF EXISTS company_device_policies_member_select ON public.company_device_policies;
DROP POLICY IF EXISTS company_device_policies_platform_manage ON public.company_device_policies;
DROP POLICY IF EXISTS trusted_devices_member_select ON public.trusted_devices;
DROP POLICY IF EXISTS trusted_devices_platform_manage ON public.trusted_devices;
DROP POLICY IF EXISTS audit_logs_manager_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_authenticated_insert ON public.audit_logs;

CREATE POLICY platform_admins_self_select ON public.platform_admins
  FOR SELECT TO authenticated
  USING (clerk_user_id = (auth.jwt() ->> 'sub') OR public.is_platform_admin());
CREATE POLICY platform_admins_platform_manage ON public.platform_admins
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY companies_member_select ON public.companies
  FOR SELECT TO authenticated USING (public.has_company_access(id));
CREATE POLICY companies_platform_manage ON public.companies
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_members_member_select ON public.company_members
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_members_platform_manage ON public.company_members
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_branding_member_select ON public.company_branding
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_branding_manager_write ON public.company_branding
  FOR ALL TO authenticated USING (public.can_manage_company(company_id))
  WITH CHECK (public.can_manage_company(company_id));

CREATE POLICY module_catalog_authenticated_select ON public.module_catalog
  FOR SELECT TO authenticated USING (active OR public.is_platform_admin());
CREATE POLICY module_catalog_platform_manage ON public.module_catalog
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_modules_member_select ON public.company_modules
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_modules_platform_manage ON public.company_modules
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_licenses_member_select ON public.company_licenses
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_licenses_platform_manage ON public.company_licenses
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_domains_member_select ON public.company_domains
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_domains_platform_manage ON public.company_domains
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY company_device_policies_member_select ON public.company_device_policies
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY company_device_policies_platform_manage ON public.company_device_policies
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY trusted_devices_member_select ON public.trusted_devices
  FOR SELECT TO authenticated
  USING (
    public.can_manage_company(company_id)
    OR (public.has_company_access(company_id) AND clerk_user_id = (auth.jwt() ->> 'sub'))
  );
CREATE POLICY trusted_devices_platform_manage ON public.trusted_devices
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE POLICY audit_logs_manager_select ON public.audit_logs
  FOR SELECT TO authenticated USING (public.can_manage_company(company_id));
CREATE POLICY audit_logs_authenticated_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));

REVOKE ALL ON TABLE
  public.platform_admins,
  public.companies,
  public.company_members,
  public.company_branding,
  public.module_catalog,
  public.company_modules,
  public.company_licenses,
  public.company_domains,
  public.company_device_policies,
  public.trusted_devices,
  public.audit_logs
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.platform_admins,
  public.companies,
  public.company_members,
  public.company_branding,
  public.module_catalog,
  public.company_modules,
  public.company_licenses,
  public.company_domains,
  public.company_device_policies,
  public.trusted_devices,
  public.audit_logs
TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_id_seq TO authenticated;

COMMIT;
