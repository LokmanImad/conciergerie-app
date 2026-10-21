import { useCallback, useEffect, useState } from "react";

import type { Task } from "@/features/tasks/types";
import { useSupabaseClient } from "@/lib/supabase";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function useTasks() {
  const supabase = useSupabaseClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
      const { data, error: queryError } = await supabase
        .from("tasks")
        .select(
          "*, apartment:apartments(name), reservation:reservations(reference, client_name)",
        )
        .order("scheduled_at")
        .limit(500);
      if (queryError) {
        setError(
          queryError.message.includes("tasks")
            ? "Exécutez la migration 39 dans Supabase."
            : queryError.message,
        );
        setTasks([]);
      } else {
        setError(null);
        setTasks(
          (data ?? []).map((item) => ({
            ...item,
            apartment: first(item.apartment),
            reservation: first(item.reservation),
          })) as Task[],
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
  return { tasks, loading, refreshing, error, reload: load };
}
