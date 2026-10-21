import { useCallback, useEffect, useState } from "react";

import type { TravelerRegistration } from "@/features/travelers/types";
import { useSupabaseClient } from "@/lib/supabase";

function getRegisteredAdults(travelers: unknown) {
  if (!Array.isArray(travelers)) return 0;
  const countRelation = travelers[0] as { count?: number } | undefined;
  return typeof countRelation?.count === "number" ? countRelation.count : travelers.length;
}

export function useReservationTravelers(reservationId?: string) {
  const supabase = useSupabaseClient();
  const [registration, setRegistration] = useState<TravelerRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reservationId) {
      setRegistration(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("traveler_registrations")
      .select("id, reservation_id, status, expected_adults, expires_at, submitted_at, travelers(count)")
      .eq("reservation_id", reservationId)
      .maybeSingle();

    if (queryError) {
      setError("Impossible de charger le dossier voyageurs.");
      setRegistration(null);
    } else if (!data) {
      setRegistration(null);
    } else {
      setRegistration({
        ...data,
        registered_adults: getRegisteredAdults(data.travelers),
        reservation: null,
      } as TravelerRegistration);
    }
    setLoading(false);
  }, [reservationId, supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { registration, loading, error, reload: load };
}
