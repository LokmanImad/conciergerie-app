import { useCallback, useEffect, useState } from "react";

import type { Task } from "@/features/tasks/types";
import { useSupabaseClient } from "@/lib/supabase";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
export function useTask(id?: string) {
  const supabase = useSupabaseClient();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("tasks")
      .select(
        "*, apartment:apartments(name), reservation:reservations(reference, client_name)",
      )
      .eq("id", id)
      .single();
    if (queryError || !data) {
      setError(queryError?.message ?? "Tâche introuvable.");
      setTask(null);
    } else {
      setError(null);
      setTask({
        ...data,
        apartment: first(data.apartment),
        reservation: first(data.reservation),
      } as Task);
    }
    setLoading(false);
  }, [id, supabase]);
  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);
  return { task, loading, error, reload: load };
}
