import { useCallback, useEffect, useState } from "react";

import type { Reservation } from "@/features/reservations/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useReservations() {
  const supabase = useSupabaseClient();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("reservations")
        .select(
          "id, reference, apartment_id, client_name, client_number, check_in, check_out, check_in_time, check_out_time, adults, children, total_amount, amount_paid, balance_due, currency, source, booking_status, payment_status, payment_method, notes, apartment:apartments(name)",
        )
        .order("check_in", { ascending: false })
        .limit(100);

      if (queryError) {
        setError(queryError.message);
      } else {
        setReservations(
          (data ?? []).map((item) => ({
            ...item,
            apartment: firstRelation(item.apartment),
          })) as Reservation[],
        );
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

  return { reservations, loading, refreshing, error, reload: load };
}
