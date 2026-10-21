import { TasksManager } from "@/components/tasks/tasks-manager";
import { PageHeader } from "@/components/page-header";
import type { Task } from "@/features/tasks/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function TasksPage() {
  const supabase = await getSupabaseServerClient();
  const [
    { data: taskData, error },
    { data: apartments },
    { data: reservations },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "*, apartment:apartments(name), reservation:reservations(reference, client_name)",
      )
      .order("scheduled_at", { ascending: true })
      .limit(500),
    supabase.from("apartments").select("id, name").order("name"),
    supabase
      .from("reservations")
      .select("id, apartment_id, reference, client_name, check_in")
      .neq("booking_status", "cancelled")
      .order("check_in", { ascending: false })
      .limit(250),
  ]);
  const tasks = (taskData ?? []).map((task) => ({
    ...task,
    apartment: firstRelation(task.apartment),
    reservation: firstRelation(task.reservation),
  })) as Task[];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Organisation quotidienne"
        title="Tâches et rappels"
        description="Planifiez les opérations de la société et recevez les alertes de check-in et de check-out 24 heures avant."
      />
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Exécutez la migration 39 dans Supabase pour activer les tâches.
        </div>
      ) : (
        <TasksManager
          tasks={tasks}
          apartments={apartments ?? []}
          reservations={reservations ?? []}
        />
      )}
    </div>
  );
}
