import { useCallback, useEffect, useState } from "react";

import type { TravelerRegistration } from "@/features/travelers/types";
import { useSupabaseClient } from "@/lib/supabase";

function normalizeRegistration(item: Record<string, unknown>): TravelerRegistration {
  const rawReservation = Array.isArray(item.reservation) ? item.reservation[0] : item.reservation;
  const reservation = rawReservation as TravelerRegistration["reservation"];
  const travelers = Array.isArray(item.travelers) ? item.travelers : [];
  const countRelation = travelers[0] as { count?: number } | undefined;
  const registeredAdults = typeof countRelation?.count === "number" ? countRelation.count : travelers.length;

  if (reservation?.apartment && Array.isArray(reservation.apartment)) {
    reservation.apartment = reservation.apartment[0] ?? null;
  }

  return { ...item, registered_adults: registeredAdults, reservation } as TravelerRegistration;
}

export function useTravelerRegistrations() {
  const supabase = useSupabaseClient();
  const [registrations, setRegistrations] = useState<TravelerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("traveler_registrations")
        .select(
          "id, reservation_id, status, expected_adults, expires_at, submitted_at, travelers(count), reservation:reservations(reference, client_name, check_in, check_out, children, apartment:apartments(name))",
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) {
        setError(queryError.message);
      } else {
        setRegistrations((data ?? []).map((item) => normalizeRegistration(item)));
      }

      setLoading(false);
      setRefreshing(false);
    },
    [supabase],
  );

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { registrations, loading, refreshing, error, reload: load };
}
