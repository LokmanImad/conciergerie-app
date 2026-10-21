import { useCallback, useEffect, useState } from "react";

import type { TravelerRegistrationDetail, TravelerRecord } from "@/features/travelers/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useTravelerRegistration(registrationId?: string) {
  const supabase = useSupabaseClient();
  const [registration, setRegistration] = useState<TravelerRegistrationDetail | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!registrationId) {
      setError("Dossier voyageur introuvable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setDocumentError(null);
    const { data, error: queryError } = await supabase
      .from("traveler_registrations")
      .select(`
        id, reservation_id, status, expected_adults, expires_at, submitted_at, verified_at,
        signed_by, signed_at, signature_data_url, declaration_version,
        reservation:reservations(reference, client_name, check_in, check_out, children, apartment:apartments(name)),
        travelers(*)
      `)
      .eq("id", registrationId)
      .single();

    if (queryError || !data) {
      setRegistration(null);
      setDocumentUrls({});
      setError(queryError?.message ?? "Dossier voyageur introuvable.");
      setLoading(false);
      return;
    }

    const rawReservation = firstRelation(data.reservation);
    const reservation = rawReservation
      ? { ...rawReservation, apartment: firstRelation(rawReservation.apartment) }
      : null;
    const travelers = ((data.travelers ?? []) as TravelerRecord[]).sort((left, right) => left.position - right.position);
    const normalized = { ...data, reservation, travelers } as TravelerRegistrationDetail;
    setRegistration(normalized);

    const paths = travelers.flatMap((traveler) =>
      [traveler.document_front_path, traveler.document_back_path].filter((path): path is string => Boolean(path)),
    );
    const signedEntries = await Promise.all(
      paths.map(async (path) => {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("identity-documents")
          .createSignedUrl(path, 900);
        return signedError || !signedData?.signedUrl ? null : ([path, signedData.signedUrl] as const);
      }),
    );
    const availableEntries = signedEntries.filter((entry): entry is readonly [string, string] => Boolean(entry));
    setDocumentUrls(Object.fromEntries(availableEntries));
    if (availableEntries.length < paths.length) {
      setDocumentError("Certaines photos d’identité ne sont pas disponibles pour le moment.");
    }
    setLoading(false);
  }, [registrationId, supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { registration, documentUrls, loading, error, documentError, reload: load };
}
