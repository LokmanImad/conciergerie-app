import type { TaskFormState } from "@/features/tasks/types";

export function validateTask(form: TaskFormState) {
  if (!form.title.trim()) return "Renseignez le titre de la tâche.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date))
    return "Renseignez une date valide.";
  if (!/^\d{2}:\d{2}$/.test(form.time)) return "Renseignez une heure valide.";
  const scheduled = new Date(`${form.date}T${form.time}:00`);
  if (Number.isNaN(scheduled.getTime()))
    return "La date de la tâche est invalide.";
  return null;
}

export function taskPayload(
  form: TaskFormState,
  reservationApartmentId?: string,
) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    apartment_id: (reservationApartmentId ?? form.apartment_id) || null,
    reservation_id: form.reservation_id || null,
    task_type: form.task_type,
    priority: form.priority,
    assignee: form.assignee,
    scheduled_at: new Date(`${form.date}T${form.time}:00`).toISOString(),
    reminder_minutes_before:
      form.reminder_minutes_before === "none"
        ? null
        : Number(form.reminder_minutes_before),
    reminder_at: null,
    recurrence: form.recurrence,
  };
}
