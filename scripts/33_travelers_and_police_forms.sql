-- Travelers and police forms v1.
-- Prerequisite: run 31_secure_clerk_admin_access.sql and
-- 32_enhance_reservations.sql before this migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.traveler_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'opened', 'submitted', 'verified', 'rejected')),
  expected_adults INTEGER NOT NULL CHECK (expected_adults BETWEEN 1 AND 20),
  expires_at TIMESTAMPTZ NOT NULL,
  last_opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  signed_by TEXT,
  signed_at TIMESTAMPTZ,
  signature_data_url TEXT,
  declaration_version TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.traveler_registrations(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 20),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('female', 'male')),
  birth_date DATE NOT NULL,
  birth_place TEXT NOT NULL,
  nationality TEXT NOT NULL,
  country_of_residence TEXT NOT NULL,
  address TEXT NOT NULL,
  profession TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL CHECK (document_type IN ('cin', 'passport', 'residence_permit', 'other')),
  document_number TEXT NOT NULL,
  document_expiry_date DATE,
  arrival_from TEXT NOT NULL,
  next_destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (registration_id, position)
);

CREATE INDEX IF NOT EXISTS traveler_registrations_status_index
  ON public.traveler_registrations(status);
CREATE INDEX IF NOT EXISTS traveler_registrations_expiry_index
  ON public.traveler_registrations(expires_at);
CREATE INDEX IF NOT EXISTS travelers_reservation_index
  ON public.travelers(reservation_id);

ALTER TABLE public.traveler_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.traveler_registrations FROM anon;
REVOKE ALL ON public.travelers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traveler_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travelers TO authenticated;

DROP POLICY IF EXISTS traveler_registrations_admin_all ON public.traveler_registrations;
CREATE POLICY traveler_registrations_admin_all
  ON public.traveler_registrations
  FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin()))
  WITH CHECK ((SELECT public.is_app_admin()));

DROP POLICY IF EXISTS travelers_admin_all ON public.travelers;
CREATE POLICY travelers_admin_all
  ON public.travelers
  FOR ALL TO authenticated
  USING ((SELECT public.is_app_admin()))
  WITH CHECK ((SELECT public.is_app_admin()));

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
  v_existing_status TEXT;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF LENGTH(p_token_hash) <> 64 OR p_expires_at <= NOW() THEN
    RAISE EXCEPTION 'INVALID_LINK_PARAMETERS' USING ERRCODE = '22023';
  END IF;

  SELECT r.adults INTO v_adults
  FROM public.reservations AS r
  WHERE r.id = p_reservation_id;

  IF v_adults IS NULL THEN
    RAISE EXCEPTION 'RESERVATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT tr.status INTO v_existing_status
  FROM public.traveler_registrations AS tr
  WHERE tr.reservation_id = p_reservation_id;

  IF v_existing_status IN ('submitted', 'verified') THEN
    RAISE EXCEPTION 'REGISTRATION_ALREADY_SUBMITTED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.traveler_registrations (
    reservation_id, token_hash, status, expected_adults, expires_at, created_by
  )
  VALUES (
    p_reservation_id,
    p_token_hash,
    'sent',
    v_adults,
    p_expires_at,
    auth.jwt() ->> 'sub'
  )
  ON CONFLICT (reservation_id) DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    status = 'sent',
    expected_adults = EXCLUDED.expected_adults,
    expires_at = EXCLUDED.expires_at,
    revoked_at = NULL,
    updated_at = NOW();

  RETURN QUERY
  SELECT tr.id, tr.status, tr.expected_adults, tr.expires_at
  FROM public.traveler_registrations AS tr
  WHERE tr.reservation_id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_traveler_registration(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_registration public.traveler_registrations%ROWTYPE;
  v_result JSONB;
  v_travelers JSONB := '[]'::JSONB;
BEGIN
  SELECT tr.* INTO v_registration
  FROM public.traveler_registrations AS tr
  WHERE tr.token_hash = p_token_hash
    AND tr.revoked_at IS NULL
    AND tr.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_registration.status IN ('sent', 'opened', 'rejected') THEN
    SELECT COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'position', t.position,
          'is_primary', t.is_primary,
          'first_name', t.first_name,
          'last_name', t.last_name,
          'gender', t.gender,
          'birth_date', t.birth_date,
          'birth_place', t.birth_place,
          'nationality', t.nationality,
          'country_of_residence', t.country_of_residence,
          'address', t.address,
          'profession', t.profession,
          'document_type', t.document_type,
          'document_number', t.document_number,
          'document_expiry_date', t.document_expiry_date,
          'arrival_from', t.arrival_from,
          'next_destination', t.next_destination
        ) ORDER BY t.position
      ),
      '[]'::JSONB
    ) INTO v_travelers
    FROM public.travelers AS t
    WHERE t.registration_id = v_registration.id;
  END IF;

  IF v_registration.status = 'sent' THEN
    UPDATE public.traveler_registrations
    SET status = 'opened', last_opened_at = NOW(), updated_at = NOW()
    WHERE traveler_registrations.id = v_registration.id;
    v_registration.status := 'opened';
  ELSE
    UPDATE public.traveler_registrations
    SET last_opened_at = NOW(), updated_at = NOW()
    WHERE traveler_registrations.id = v_registration.id;
  END IF;

  SELECT JSONB_BUILD_OBJECT(
    'reservation_reference', r.reference,
    'principal_guest_name', r.client_name,
    'apartment_name', a.name,
    'check_in', r.check_in,
    'check_out', r.check_out,
    'expected_adults', v_registration.expected_adults,
    'children', r.children,
    'status', v_registration.status,
    'expires_at', v_registration.expires_at,
    'travelers', v_travelers
  ) INTO v_result
  FROM public.reservations AS r
  LEFT JOIN public.apartments AS a ON a.id = r.apartment_id
  WHERE r.id = v_registration.reservation_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_traveler_registration(
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
DECLARE
  v_registration public.traveler_registrations%ROWTYPE;
  v_item JSONB;
BEGIN
  SELECT tr.* INTO v_registration
  FROM public.traveler_registrations AS tr
  WHERE tr.token_hash = p_token_hash
    AND tr.revoked_at IS NULL
    AND tr.expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_OR_EXPIRED_LINK' USING ERRCODE = 'P0002';
  END IF;

  IF v_registration.status IN ('submitted', 'verified') THEN
    RAISE EXCEPTION 'REGISTRATION_ALREADY_SUBMITTED' USING ERRCODE = 'P0001';
  END IF;

  IF JSONB_TYPEOF(p_travelers) <> 'array'
    OR JSONB_ARRAY_LENGTH(p_travelers) <> v_registration.expected_adults
  THEN
    RAISE EXCEPTION 'ADULT_COUNT_MISMATCH' USING ERRCODE = '22023';
  END IF;

  IF NOT p_consent
    OR NULLIF(BTRIM(p_signed_by), '') IS NULL
    OR p_signature_data_url NOT LIKE 'data:image/png;base64,%'
    OR OCTET_LENGTH(p_signature_data_url) > 400000
  THEN
    RAISE EXCEPTION 'SIGNATURE_AND_CONSENT_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item
    WHERE NULLIF(BTRIM(item ->> 'first_name'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'last_name'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'birth_date'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'birth_place'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'nationality'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'country_of_residence'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'address'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'document_type'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'document_number'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'arrival_from'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'next_destination'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'INCOMPLETE_TRAVELER' USING ERRCODE = '22023';
  END IF;

  IF (SELECT COUNT(DISTINCT (item ->> 'position')::INTEGER) FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item)
      <> v_registration.expected_adults
    OR EXISTS (
      SELECT 1 FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item
      WHERE (item ->> 'position')::INTEGER < 1
        OR (item ->> 'position')::INTEGER > v_registration.expected_adults
        OR ((item ->> 'position')::INTEGER = 1) IS DISTINCT FROM (item ->> 'is_primary')::BOOLEAN
    )
    OR NOT EXISTS (
      SELECT 1 FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item
      WHERE (item ->> 'position')::INTEGER = 1 AND (item ->> 'is_primary')::BOOLEAN = TRUE
    )
  THEN
    RAISE EXCEPTION 'INVALID_TRAVELER_POSITIONS' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.travelers WHERE registration_id = v_registration.id;

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_travelers)
  LOOP
    INSERT INTO public.travelers (
      registration_id,
      reservation_id,
      position,
      is_primary,
      first_name,
      last_name,
      gender,
      birth_date,
      birth_place,
      nationality,
      country_of_residence,
      address,
      profession,
      document_type,
      document_number,
      document_expiry_date,
      arrival_from,
      next_destination,
      status
    ) VALUES (
      v_registration.id,
      v_registration.reservation_id,
      (v_item ->> 'position')::INTEGER,
      COALESCE((v_item ->> 'is_primary')::BOOLEAN, FALSE),
      BTRIM(v_item ->> 'first_name'),
      BTRIM(v_item ->> 'last_name'),
      v_item ->> 'gender',
      (v_item ->> 'birth_date')::DATE,
      BTRIM(v_item ->> 'birth_place'),
      BTRIM(v_item ->> 'nationality'),
      BTRIM(v_item ->> 'country_of_residence'),
      BTRIM(v_item ->> 'address'),
      COALESCE(BTRIM(v_item ->> 'profession'), ''),
      v_item ->> 'document_type',
      BTRIM(v_item ->> 'document_number'),
      NULLIF(v_item ->> 'document_expiry_date', '')::DATE,
      BTRIM(v_item ->> 'arrival_from'),
      BTRIM(v_item ->> 'next_destination'),
      'submitted'
    );
  END LOOP;

  UPDATE public.traveler_registrations
  SET status = 'submitted',
      submitted_at = NOW(),
      verified_at = NULL,
      signed_by = BTRIM(p_signed_by),
      signed_at = NOW(),
      signature_data_url = p_signature_data_url,
      declaration_version = 'police_form_v1_fr',
      updated_at = NOW()
  WHERE traveler_registrations.id = v_registration.id;

  RETURN JSONB_BUILD_OBJECT('status', 'submitted', 'submitted_at', NOW());
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
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS' USING ERRCODE = '22023';
  END IF;

  UPDATE public.traveler_registrations
  SET status = p_status,
      verified_at = CASE WHEN p_status = 'verified' THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE traveler_registrations.id = p_registration_id
    AND traveler_registrations.status IN ('submitted', 'rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_READY_FOR_REVIEW' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.travelers
  SET status = p_status, updated_at = NOW()
  WHERE registration_id = p_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_traveler_registration_link(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_traveler_registration_link(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_traveler_registration(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_traveler_registration(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_public_traveler_registration(TEXT, JSONB, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_traveler_registration(TEXT, JSONB, TEXT, TEXT, BOOLEAN) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.review_traveler_registration(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_traveler_registration(UUID, TEXT) TO authenticated;

COMMENT ON TABLE public.traveler_registrations IS
  'Secure guest registration session and principal guest signature for a reservation.';
COMMENT ON COLUMN public.traveler_registrations.token_hash IS
  'SHA-256 hash only. The raw public token is never stored.';
COMMENT ON COLUMN public.traveler_registrations.signature_data_url IS
  'Principal guest signature captured as a PNG data URL for police-form generation.';

COMMIT;
