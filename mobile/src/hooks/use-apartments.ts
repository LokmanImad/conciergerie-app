import { useCallback, useEffect, useState } from "react";

import type { ApartmentOption } from "@/features/reservations/types";
import { useSupabaseClient } from "@/lib/supabase";

export function useApartments() {
  const supabase = useSupabaseClient();
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("apartments")
      .select("id, name")
      .order("name");

    if (queryError) setError(queryError.message);
    else setApartments((data ?? []) as ApartmentOption[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { apartments, loading, error, reload: load };
}
