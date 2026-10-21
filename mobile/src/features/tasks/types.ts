export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskAssignee = "imad" | "jassem" | "both";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";
export type TaskType =
  | "manual"
  | "check_in"
  | "check_out"
  | "cleaning"
  | "administrative"
  | "maintenance"
  | "payment"
  | "other";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  apartment_id: string | null;
  reservation_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: TaskAssignee;
  scheduled_at: string;
  reminder_at: string | null;
  reminder_minutes_before: number | null;
  recurrence: TaskRecurrence;
  source: "manual" | "reservation";
  completed_at: string | null;
  apartment: { name: string } | null;
  reservation: { reference: string; client_name: string } | null;
};

export type TaskFormState = {
  title: string;
  description: string;
  apartment_id: string;
  reservation_id: string;
  task_type: TaskType;
  priority: TaskPriority;
  assignee: TaskAssignee;
  date: string;
  time: string;
  reminder_minutes_before: string;
  recurrence: TaskRecurrence;
};

export const statusLabels: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};
export const priorityLabels: Record<TaskPriority, string> = {
  low: "Faible",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};
export const assigneeLabels: Record<TaskAssignee, string> = {
  imad: "Imad",
  jassem: "Jassem",
  both: "Les deux",
};
export const recurrenceLabels: Record<TaskRecurrence, string> = {
  none: "Aucune",
  daily: "Chaque jour",
  weekly: "Chaque semaine",
  monthly: "Chaque mois",
};
export const typeLabels: Record<TaskType, string> = {
  manual: "Tâche générale",
  check_in: "Check-in",
  check_out: "Check-out",
  cleaning: "Ménage",
  administrative: "Administratif",
  maintenance: "Maintenance",
  payment: "Paiement",
  other: "Autre",
};

export function emptyTaskForm(): TaskFormState {
  const date = new Date(Date.now() + 3_600_000);
  return {
    title: "",
    description: "",
    apartment_id: "",
    reservation_id: "",
    task_type: "manual",
    priority: "normal",
    assignee: "both",
    date: localDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    reminder_minutes_before: "1440",
    recurrence: "none",
  };
}
export function taskToForm(task: Task): TaskFormState {
  const date = new Date(task.scheduled_at);
  return {
    title: task.title,
    description: task.description ?? "",
    apartment_id: task.apartment_id ?? "",
    reservation_id: task.reservation_id ?? "",
    task_type: task.task_type,
    priority: task.priority,
    assignee: task.assignee,
    date: localDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    reminder_minutes_before:
      task.reminder_minutes_before == null
        ? "none"
        : String(task.reminder_minutes_before),
    recurrence: task.recurrence,
  };
}
function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
