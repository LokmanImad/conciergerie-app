-- Trusted-device enrollment and effective RLS enforcement.
-- Prerequisite: run migrations 40 through 43 first.

BEGIN;

CREATE OR REPLACE FUNCTION public.request_device_secret()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(
    CURRENT_SETTING('request.headers', TRUE)::JSONB
      ->> 'x-concierge-device-secret',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.device_access_allowed(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_policy public.company_device_policies%ROWTYPE;
  v_secret TEXT;
  v_platform TEXT;
BEGIN
  IF public.is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO v_policy
  FROM public.company_device_policies
  WHERE company_id = p_company_id;

  IF NOT FOUND OR v_policy.access_mode = 'any' THEN
    RETURN TRUE;
  END IF;

  v_platform := COALESCE(
    NULLIF(
      CURRENT_SETTING('request.headers', TRUE)::JSONB
        ->> 'x-concierge-platform',
      ''
    ),
    'web'
  );

  -- The platform header describes the device row but is client supplied. It
  -- must never be usable to bypass enforcement by claiming another platform.
  IF NOT (v_policy.web_enforced OR v_policy.mobile_enforced) THEN
    RETURN TRUE;
  END IF;

  IF v_policy.access_mode = 'certificate_required' THEN
    RETURN FALSE;
  END IF;

  v_secret := public.request_device_secret();
  IF v_secret IS NULL OR CHAR_LENGTH(v_secret) NOT BETWEEN 32 AND 256 THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.trusted_devices AS device
    WHERE device.company_id = p_company_id
      AND device.clerk_user_id = (auth.jwt() ->> 'sub')
      AND device.platform = v_platform
      AND device.device_key_hash = ENCODE(SHA256(CONVERT_TO(v_secret, 'UTF8')), 'hex')
      AND device.status = 'approved'
      AND (device.expires_at IS NULL OR device.expires_at > NOW())
  );
END;
$$;

-- Device approval becomes part of every tenant RLS decision. Platform
-- administrators bypass it so the control plane can always recover access.
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
      AND public.device_access_allowed(p_company_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.register_or_check_device(
  p_device_secret TEXT,
  p_device_name TEXT,
  p_platform TEXT,
  p_browser TEXT DEFAULT NULL,
  p_operating_system TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT := auth.jwt() ->> 'sub';
  v_company_id UUID := public.current_company_id();
  v_policy public.company_device_policies%ROWTYPE;
  v_device public.trusted_devices%ROWTYPE;
  v_hash TEXT;
  v_enforced BOOLEAN;
  v_device_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF public.is_platform_admin() THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', TRUE,
      'configured', TRUE,
      'status', 'approved',
      'policy', 'platform_admin',
      'device_id', NULL
    );
  END IF;

  IF v_company_id IS NULL
    OR NOT public.company_license_active(v_company_id)
    OR NOT EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = v_company_id
        AND clerk_user_id = v_user_id
        AND active
    )
  THEN
    RAISE EXCEPTION 'COMPANY_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_platform NOT IN ('web', 'mobile')
    OR CHAR_LENGTH(COALESCE(p_device_secret, '')) NOT BETWEEN 32 AND 256
    OR CHAR_LENGTH(BTRIM(COALESCE(p_device_name, ''))) NOT BETWEEN 1 AND 120
  THEN
    RAISE EXCEPTION 'INVALID_DEVICE_PARAMETERS' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_policy
  FROM public.company_device_policies
  WHERE company_id = v_company_id;

  IF NOT FOUND THEN
    INSERT INTO public.company_device_policies (company_id)
    VALUES (v_company_id)
    ON CONFLICT (company_id) DO NOTHING;
    SELECT * INTO v_policy
    FROM public.company_device_policies
    WHERE company_id = v_company_id;
  END IF;

  v_enforced := v_policy.web_enforced OR v_policy.mobile_enforced;

  IF v_policy.access_mode = 'any' OR NOT v_enforced THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', TRUE,
      'configured', TRUE,
      'status', 'not_required',
      'policy', v_policy.access_mode,
      'device_id', NULL
    );
  END IF;

  IF v_policy.access_mode = 'certificate_required' THEN
    RETURN JSONB_BUILD_OBJECT(
      'allowed', FALSE,
      'configured', TRUE,
      'status', 'certificate_required',
      'policy', v_policy.access_mode,
      'device_id', NULL
    );
  END IF;

  v_hash := ENCODE(SHA256(CONVERT_TO(p_device_secret, 'UTF8')), 'hex');

  SELECT * INTO v_device
  FROM public.trusted_devices
  WHERE company_id = v_company_id
    AND device_key_hash = v_hash
  FOR UPDATE;

  IF FOUND AND v_device.clerk_user_id <> v_user_id THEN
    INSERT INTO public.audit_logs (
      company_id, actor_user_id, action, entity_type, entity_id, metadata
    ) VALUES (
      v_company_id, v_user_id, 'device.user_mismatch', 'trusted_device',
      v_device.id::TEXT,
      JSONB_BUILD_OBJECT('platform', p_platform)
    );
    RETURN JSONB_BUILD_OBJECT(
      'allowed', FALSE,
      'configured', TRUE,
      'status', 'user_mismatch',
      'policy', v_policy.access_mode,
      'device_id', NULL
    );
  END IF;

  IF NOT FOUND THEN
    IF v_policy.max_devices_per_user IS NOT NULL THEN
      SELECT COUNT(*) INTO v_device_count
      FROM public.trusted_devices
      WHERE company_id = v_company_id
        AND clerk_user_id = v_user_id
        AND platform = p_platform
        AND status IN ('pending', 'approved', 'suspended');

      IF v_device_count >= v_policy.max_devices_per_user THEN
        RETURN JSONB_BUILD_OBJECT(
          'allowed', FALSE,
          'configured', TRUE,
          'status', 'limit_reached',
          'policy', v_policy.access_mode,
          'device_id', NULL
        );
      END IF;
    END IF;

    INSERT INTO public.trusted_devices (
      company_id, clerk_user_id, name, platform, device_key_hash,
      status, browser, operating_system, last_seen_at
    ) VALUES (
      v_company_id, v_user_id, BTRIM(p_device_name), p_platform, v_hash,
      'pending', NULLIF(BTRIM(p_browser), ''),
      NULLIF(BTRIM(p_operating_system), ''), NOW()
    )
    RETURNING * INTO v_device;

    INSERT INTO public.audit_logs (
      company_id, actor_user_id, action, entity_type, entity_id, metadata
    ) VALUES (
      v_company_id, v_user_id, 'device.enrolled', 'trusted_device',
      v_device.id::TEXT,
      JSONB_BUILD_OBJECT(
        'platform', p_platform,
        'name', v_device.name
      )
    );
  ELSE
    IF v_device.expires_at IS NOT NULL
      AND v_device.expires_at <= NOW()
      AND v_device.status = 'approved'
    THEN
      UPDATE public.trusted_devices
      SET status = 'expired', updated_at = NOW()
      WHERE id = v_device.id
      RETURNING * INTO v_device;
    END IF;

    IF v_device.last_seen_at IS NULL
      OR v_device.last_seen_at < NOW() - INTERVAL '5 minutes'
    THEN
      UPDATE public.trusted_devices
      SET name = CASE WHEN status = 'pending' THEN BTRIM(p_device_name) ELSE name END,
          browser = NULLIF(BTRIM(p_browser), ''),
          operating_system = NULLIF(BTRIM(p_operating_system), ''),
          last_seen_at = NOW(),
          updated_at = NOW()
      WHERE id = v_device.id
      RETURNING * INTO v_device;
    END IF;
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'allowed', v_device.status = 'approved'
      AND (v_device.expires_at IS NULL OR v_device.expires_at > NOW()),
    'configured', TRUE,
    'status', v_device.status,
    'policy', v_policy.access_mode,
    'device_id', v_device.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_trusted_device_status(
  p_device_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_device public.trusted_devices%ROWTYPE;
  v_policy public.company_device_policies%ROWTYPE;
BEGIN
  IF p_status NOT IN ('approved', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'INVALID_DEVICE_STATUS' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_device
  FROM public.trusted_devices
  WHERE id = p_device_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEVICE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_policy
  FROM public.company_device_policies
  WHERE company_id = v_device.company_id;

  IF NOT public.is_platform_admin()
    AND NOT (
      v_policy.approval_scope = 'company_admin'
      AND public.can_manage_company(v_device.company_id)
    )
  THEN
    RAISE EXCEPTION 'DEVICE_APPROVAL_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.trusted_devices
  SET status = p_status,
      approved_by = CASE WHEN p_status = 'approved' THEN auth.jwt() ->> 'sub' ELSE approved_by END,
      approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
      expires_at = CASE
        WHEN p_status = 'approved' AND expires_at <= NOW() THEN NULL
        ELSE expires_at
      END,
      revoked_at = CASE WHEN p_status = 'revoked' THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_device_id;

  INSERT INTO public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_device.company_id,
    auth.jwt() ->> 'sub',
    'device.status_changed',
    'trusted_device',
    p_device_id::TEXT,
    JSONB_BUILD_OBJECT('from', v_device.status, 'to', p_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_device_secret() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.device_access_allowed(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_or_check_device(TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_trusted_device_status(UUID, TEXT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_device_secret() TO authenticated;
GRANT EXECUTE ON FUNCTION public.device_access_allowed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_or_check_device(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_trusted_device_status(UUID, TEXT)
  TO authenticated;

COMMIT;
