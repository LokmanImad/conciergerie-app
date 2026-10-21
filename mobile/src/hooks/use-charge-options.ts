import { useCallback, useEffect, useState } from "react";

import type {
  ChargeReservationOption,
  ServiceTypeOption,
} from "@/features/charges/types";
import type { ApartmentOption } from "@/features/reservations/types";
import { useSupabaseClient } from "@/lib/supabase";

export function useChargeOptions() {
  const supabase = useSupabaseClient();
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeOption[]>([]);
  const [reservations, setReservations] = useState<ChargeReservationOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [apartmentResult, serviceResult, reservationResult] =
      await Promise.all([
        supabase.from("apartments").select("id, name").order("name"),
        supabase
          .from("service_types")
          .select("id, name, paid_by")
          .order("name"),
        supabase
          .from("reservations")
          .select("id, apartment_id, reference, client_name, check_in")
          .order("check_in", { ascending: false })
          .limit(100),
      ]);

    const queryError =
      apartmentResult.error ?? serviceResult.error ?? reservationResult.error;
    if (queryError) {
      setError(queryError.message);
    } else {
      setApartments((apartmentResult.data ?? []) as ApartmentOption[]);
      setServiceTypes((serviceResult.data ?? []) as ServiceTypeOption[]);
      setReservations(
        (reservationResult.data ?? []) as ChargeReservationOption[],
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return {
    apartments,
    serviceTypes,
    reservations,
    loading,
    error,
    reload: load,
  };
}
