import { useCallback, useEffect, useState } from "react";

import type { Reservation } from "@/features/reservations/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useReservation(id?: string) {
  const supabase = useSupabaseClient();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Réservation introuvable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("reservations")
      .select(
        "id, reference, apartment_id, client_name, client_number, check_in, check_out, check_in_time, check_out_time, adults, children, total_amount, amount_paid, balance_due, currency, source, booking_status, payment_status, payment_method, notes, apartment:apartments(name)",
      )
      .eq("id", id)
      .single();

    if (queryError) {
      setError(queryError.message);
      setReservation(null);
    } else {
      setReservation({ ...data, apartment: firstRelation(data.apartment) } as Reservation);
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { reservation, loading, error, reload: load };
}
