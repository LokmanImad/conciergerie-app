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

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};
export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Faible",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};
export const taskAssigneeLabels: Record<TaskAssignee, string> = {
  imad: "Imad",
  jassem: "Jassem",
  both: "Les deux",
};
export const taskRecurrenceLabels: Record<TaskRecurrence, string> = {
  none: "Aucune",
  daily: "Chaque jour",
  weekly: "Chaque semaine",
  monthly: "Chaque mois",
};
export const taskTypeLabels: Record<TaskType, string> = {
  manual: "Tâche générale",
  check_in: "Check-in",
  check_out: "Check-out",
  cleaning: "Ménage",
  administrative: "Administratif",
  maintenance: "Maintenance",
  payment: "Paiement",
  other: "Autre",
};
