import { useCallback, useEffect, useState } from "react";
import { useSupabaseClient } from "@/lib/supabase";

export type TaskApartment = { id: string; name: string };
export type TaskReservation = {
  id: string;
  apartment_id: string;
  reference: string;
  client_name: string;
};
export function useTaskOptions() {
  const supabase = useSupabaseClient();
  const [apartments, setApartments] = useState<TaskApartment[]>([]);
  const [reservations, setReservations] = useState<TaskReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [apartmentResult, reservationResult] = await Promise.all([
      supabase.from("apartments").select("id, name").order("name"),
      supabase
        .from("reservations")
        .select("id, apartment_id, reference, client_name")
        .neq("booking_status", "cancelled")
        .order("check_in", { ascending: false })
        .limit(250),
    ]);
    const queryError = apartmentResult.error ?? reservationResult.error;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setApartments(apartmentResult.data ?? []);
      setReservations(reservationResult.data ?? []);
    }
    setLoading(false);
  }, [supabase]);
  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);
  return { apartments, reservations, loading, error, reload: load };
}
