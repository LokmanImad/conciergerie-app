import { useCallback, useEffect, useState } from "react";

import type { Charge } from "@/features/charges/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeCharge(item: Record<string, unknown>) {
  return {
    ...item,
    apartment: firstRelation(
      item.apartment as Charge["apartment"] | Charge["apartment"][],
    ),
    service_type: firstRelation(
      item.service_type as Charge["service_type"] | Charge["service_type"][],
    ),
    reservation: firstRelation(
      item.reservation as Charge["reservation"] | Charge["reservation"][],
    ),
  } as Charge;
}

export function useCharges() {
  const supabase = useSupabaseClient();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("charges")
        .select(
          `
        id, apartment_id, service_type_id, reservation_id, amount, date, supplier,
        description, notes, paid_by_person, payment_method, is_paid, is_invoiced, billable_to_owner,
        receipt_path, cancelled_at, cancellation_reason, created_at,
        apartment:apartments(name),
        service_type:service_types(name, paid_by),
        reservation:reservations(reference, client_name, check_in)
      `,
        )
        .order("date", { ascending: false })
        .limit(250);

      if (queryError) {
        setError(
          queryError.message.includes("supplier")
            ? "La migration 35 doit être installée dans Supabase avant d’utiliser les charges mobiles."
            : queryError.message,
        );
      } else {
        setCharges((data ?? []).map((item) => normalizeCharge(item)));
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

  return { charges, loading, refreshing, error, reload: load };
}
