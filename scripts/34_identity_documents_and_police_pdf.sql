-- Private identity-document storage and document references for police forms.
-- Prerequisite: run migration 33 first.

BEGIN;

ALTER TABLE public.travelers
  ADD COLUMN IF NOT EXISTS document_front_path TEXT,
  ADD COLUMN IF NOT EXISTS document_back_path TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  FALSE,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS identity_documents_admin_select ON storage.objects;
CREATE POLICY identity_documents_admin_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'identity-documents'
    AND (SELECT public.is_app_admin())
  );

CREATE OR REPLACE FUNCTION public.get_public_registration_upload_scope(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT JSONB_BUILD_OBJECT(
    'registration_id', tr.id,
    'expected_adults', tr.expected_adults,
    'status', tr.status
  )
  FROM public.traveler_registrations AS tr
  WHERE tr.token_hash = p_token_hash
    AND tr.revoked_at IS NULL
    AND tr.expires_at > NOW()
    AND tr.status IN ('sent', 'opened', 'rejected');
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
          'document_front_path', t.document_front_path,
          'document_back_path', t.document_back_path,
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
  v_position INTEGER;
  v_front_path TEXT;
  v_back_path TEXT;
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
      OR NULLIF(BTRIM(item ->> 'document_front_path'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'arrival_from'), '') IS NULL
      OR NULLIF(BTRIM(item ->> 'next_destination'), '') IS NULL
      OR (
        item ->> 'document_type' = 'cin'
        AND NULLIF(BTRIM(item ->> 'document_back_path'), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'INCOMPLETE_TRAVELER_OR_DOCUMENT' USING ERRCODE = '22023';
  END IF;

  IF (SELECT COUNT(DISTINCT (item ->> 'position')::INTEGER) FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item)
      <> v_registration.expected_adults
    OR EXISTS (
      SELECT 1 FROM JSONB_ARRAY_ELEMENTS(p_travelers) AS item
      WHERE (item ->> 'position')::INTEGER < 1
        OR (item ->> 'position')::INTEGER > v_registration.expected_adults
        OR ((item ->> 'position')::INTEGER = 1) IS DISTINCT FROM (item ->> 'is_primary')::BOOLEAN
    )
  THEN
    RAISE EXCEPTION 'INVALID_TRAVELER_POSITIONS' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_travelers)
  LOOP
    v_position := (v_item ->> 'position')::INTEGER;
    v_front_path := BTRIM(v_item ->> 'document_front_path');
    v_back_path := NULLIF(BTRIM(v_item ->> 'document_back_path'), '');

    IF v_front_path <> (v_registration.id::TEXT || '/' || v_position::TEXT || '/front')
      OR (
        v_back_path IS NOT NULL
        AND v_back_path <> (v_registration.id::TEXT || '/' || v_position::TEXT || '/back')
      )
      OR NOT EXISTS (
        SELECT 1 FROM storage.objects AS o
        WHERE o.bucket_id = 'identity-documents' AND o.name = v_front_path
      )
      OR (
        v_item ->> 'document_type' = 'cin'
        AND NOT EXISTS (
          SELECT 1 FROM storage.objects AS o
          WHERE o.bucket_id = 'identity-documents' AND o.name = v_back_path
        )
      )
    THEN
      RAISE EXCEPTION 'INVALID_OR_MISSING_DOCUMENT' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  DELETE FROM public.travelers WHERE registration_id = v_registration.id;

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_travelers)
  LOOP
    INSERT INTO public.travelers (
      registration_id, reservation_id, position, is_primary,
      first_name, last_name, gender, birth_date, birth_place,
      nationality, country_of_residence, address, profession,
      document_type, document_number, document_expiry_date,
      document_front_path, document_back_path,
      arrival_from, next_destination, status
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
      BTRIM(v_item ->> 'document_front_path'),
      NULLIF(BTRIM(v_item ->> 'document_back_path'), ''),
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
    AND (
      (p_status = 'verified' AND traveler_registrations.status IN ('submitted', 'rejected'))
      OR (p_status = 'rejected' AND traveler_registrations.status IN ('submitted', 'verified', 'rejected'))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_READY_FOR_REVIEW' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.travelers
  SET status = p_status, updated_at = NOW()
  WHERE registration_id = p_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_registration_upload_scope(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_registration_upload_scope(TEXT) TO anon, authenticated;

COMMENT ON COLUMN public.travelers.document_front_path IS
  'Private Storage object path for the identity page or CIN front.';
COMMENT ON COLUMN public.travelers.document_back_path IS
  'Private Storage object path for the CIN back when required.';

COMMIT;
