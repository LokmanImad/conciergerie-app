import { useCallback, useEffect, useState } from "react";

import type { OwnerContract } from "@/features/contracts/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useOwnerContracts() {
  const supabase = useSupabaseClient();
  const [contracts, setContracts] = useState<OwnerContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("owner_contracts")
      .select("*, apartment:apartments(name)")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(queryError.message.includes("owner_contracts")
        ? "Installez la migration 36 dans Supabase pour activer les contrats."
        : queryError.message);
    } else {
      setContracts((data ?? []).map((item) => ({ ...item, apartment: firstRelation(item.apartment) })) as OwnerContract[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { contracts, loading, refreshing, error, reload: load };
}
