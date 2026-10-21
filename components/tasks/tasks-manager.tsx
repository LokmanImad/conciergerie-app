"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlarmClockIcon,
  BellRingIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  taskAssigneeLabels,
  taskPriorityLabels,
  taskRecurrenceLabels,
  taskStatusLabels,
  taskTypeLabels,
  type Task,
  type TaskAssignee,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type TaskType,
} from "@/features/tasks/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

type Apartment = { id: string; name: string };
type Reservation = {
  id: string;
  apartment_id: string;
  reference: string;
  client_name: string;
  check_in: string;
};
type Filter = "today" | "upcoming" | "late" | "completed" | "all";

export function TasksManager({
  tasks,
  apartments,
  reservations,
}: {
  tasks: Task[];
  apartments: Apartment[];
  reservations: Reservation[];
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [filter, setFilter] = useState<Filter>("today");
  const [working, setWorking] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const notified = useRef(new Set<string>());

  useEffect(() => {
    setAlertsEnabled(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted",
    );
  }, []);

  useEffect(() => {
    if (
      !alertsEnabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    const check = () => {
      const now = Date.now();
      tasks.forEach((task) => {
        if (
          !task.reminder_at ||
          !["todo", "in_progress"].includes(task.status) ||
          notified.current.has(task.id)
        )
          return;
        const reminder = new Date(task.reminder_at).getTime();
        const scheduled = new Date(task.scheduled_at).getTime();
        if (reminder <= now && scheduled >= now - 3_600_000) {
          new Notification(task.title, {
            body: task.apartment?.name ?? "Tâche société",
            tag: task.id,
          });
          notified.current.add(task.id);
        }
      });
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [alertsEnabled, tasks]);

  const visibleTasks = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const dayEnd = dayStart + 86_400_000;
    return tasks.filter((task) => {
      const scheduled = new Date(task.scheduled_at).getTime();
      if (filter === "today")
        return (
          scheduled >= dayStart &&
          scheduled < dayEnd &&
          !["completed", "cancelled"].includes(task.status)
        );
      if (filter === "upcoming")
        return (
          scheduled >= dayEnd &&
          !["completed", "cancelled"].includes(task.status)
        );
      if (filter === "late")
        return (
          scheduled < now.getTime() &&
          !["completed", "cancelled"].includes(task.status)
        );
      if (filter === "completed") return task.status === "completed";
      return true;
    });
  }, [filter, tasks]);

  const updateStatus = async (task: Task, status: TaskStatus) => {
    setWorking(task.id);
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id);
    setWorking(null);
    if (error) alert(error.message);
    else router.refresh();
  };

  const remove = async (task: Task) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    setWorking(task.id);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("source", "manual");
    setWorking(null);
    if (error) alert(error.message);
    else router.refresh();
  };

  const enableBrowserAlerts = async () => {
    if (typeof Notification === "undefined")
      return alert(
        "Les notifications ne sont pas disponibles dans ce navigateur.",
      );
    const permission = await Notification.requestPermission();
    setAlertsEnabled(permission === "granted");
    if (permission !== "granted")
      alert(
        "Autorisation refusée. Vous pourrez la modifier dans les réglages du navigateur.",
      );
  };

  const counts = {
    today: tasks.filter(
      (task) =>
        isToday(task.scheduled_at) &&
        !["completed", "cancelled"].includes(task.status),
    ).length,
    late: tasks.filter(
      (task) =>
        new Date(task.scheduled_at) < new Date() &&
        !["completed", "cancelled"].includes(task.status),
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["today", "upcoming", "late", "completed", "all"] as Filter[]).map(
            (value) => (
              <Button
                key={value}
                variant={filter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(value)}
              >
                {filterLabels[value]}
                {value === "today"
                  ? ` (${counts.today})`
                  : value === "late"
                    ? ` (${counts.late})`
                    : ""}
              </Button>
            ),
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void enableBrowserAlerts()}>
            <BellRingIcon className="size-4" /> Alertes navigateur
          </Button>
          <TaskDialog apartments={apartments} reservations={reservations} />
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <CheckCircle2Icon className="mb-4 size-11 text-emerald-600" />
            <p className="font-semibold">Aucune tâche dans cette vue</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Votre planning est à jour.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleTasks.map((task) => (
            <Card
              key={task.id}
              className={isLate(task) ? "border-rose-300" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={task.status} />
                      <Badge
                        variant={
                          task.priority === "urgent"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {taskPriorityLabels[task.priority]}
                      </Badge>
                      {task.source === "reservation" && (
                        <Badge variant="outline">Automatique</Badge>
                      )}
                    </div>
                  </div>
                  {task.source === "manual" && (
                    <TaskDialog
                      task={task}
                      apartments={apartments}
                      reservations={reservations}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <p className="text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <Meta
                    icon={CalendarClockIcon}
                    label="Échéance"
                    value={formatDateTime(task.scheduled_at)}
                  />
                  <Meta
                    icon={AlarmClockIcon}
                    label="Rappel"
                    value={
                      task.reminder_at
                        ? formatDateTime(task.reminder_at)
                        : "Aucun"
                    }
                  />
                  <Meta
                    icon={Building2Icon}
                    label="Affectation"
                    value={task.apartment?.name ?? "Société"}
                  />
                  <Meta
                    icon={CircleDotIcon}
                    label="Assignée à"
                    value={taskAssigneeLabels[task.assignee]}
                  />
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {task.status === "todo" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={working === task.id}
                      onClick={() => void updateStatus(task, "in_progress")}
                    >
                      <CircleDotIcon className="size-4" /> Commencer
                    </Button>
                  )}
                  {task.status !== "completed" &&
                    task.status !== "cancelled" && (
                      <Button
                        size="sm"
                        disabled={working === task.id}
                        onClick={() => void updateStatus(task, "completed")}
                      >
                        <CheckCircle2Icon className="size-4" /> Terminer
                      </Button>
                    )}
                  {task.status === "completed" && task.source === "manual" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={working === task.id}
                      onClick={() => void updateStatus(task, "todo")}
                    >
                      <RotateCcwIcon className="size-4" /> Rouvrir
                    </Button>
                  )}
                  {task.source === "manual" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={working === task.id}
                      onClick={() => void remove(task)}
                    >
                      <Trash2Icon className="size-4" /> Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskDialog({
  task,
  apartments,
  reservations,
}: {
  task?: Task;
  apartments: Apartment[];
  reservations: Reservation[];
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = () => taskToForm(task);
  const [form, setForm] = useState(initial);
  const update = (key: keyof ReturnType<typeof initial>, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open) {
      setForm(initial());
      setError(null);
    }
  }, [open, task]);
  const save = async () => {
    if (!form.title.trim() || !form.date || !form.time)
      return setError("Renseignez le titre, la date et l’heure.");
    setSaving(true);
    setError(null);
    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const reminder = form.reminder === "none" ? null : Number(form.reminder);
    const reservation = reservations.find(
      (item) => item.id === form.reservation_id,
    );
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      apartment_id:
        reservation?.apartment_id ??
        (form.apartment_id === "company" ? null : form.apartment_id || null),
      reservation_id:
        form.reservation_id === "none" ? null : form.reservation_id || null,
      task_type: form.task_type as TaskType,
      priority: form.priority as TaskPriority,
      assignee: form.assignee as TaskAssignee,
      scheduled_at: scheduledAt,
      reminder_minutes_before: reminder,
      reminder_at: null,
      recurrence: form.recurrence as TaskRecurrence,
    };
    const result = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id)
      : await supabase.from("tasks").insert(payload);
    setSaving(false);
    if (result.error) {
      setError(
        result.error.message.includes("tasks")
          ? "Exécutez la migration 39 dans Supabase."
          : result.error.message,
      );
      return;
    }
    setOpen(false);
    router.refresh();
  };

  const editable = !task || task.source === "manual";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {task ? (
          <Button size="icon" variant="ghost" title="Modifier">
            <PencilIcon className="size-4" />
          </Button>
        ) : (
          <Button>
            <PlusIcon className="size-4" /> Nouvelle tâche
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {task ? "Modifier la tâche" : "Nouvelle tâche"}
          </DialogTitle>
          <DialogDescription>
            Une tâche peut concerner la société, un appartement ou une
            réservation.
          </DialogDescription>
        </DialogHeader>
        {!editable ? (
          <p className="rounded-lg border bg-muted p-4 text-sm">
            Les dates de cette tâche automatique suivent la réservation.
            Modifiez la réservation pour les changer.
          </p>
        ) : (
          <div className="grid gap-4 py-2">
            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Field label="Titre *">
              <Input
                value={form.title}
                maxLength={160}
                onChange={(event) => update("title", event.target.value)}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Picker
                  value={form.task_type}
                  onChange={(value) => update("task_type", value)}
                  options={Object.entries(taskTypeLabels)}
                />
              </Field>
              <Field label="Priorité">
                <Picker
                  value={form.priority}
                  onChange={(value) => update("priority", value)}
                  options={Object.entries(taskPriorityLabels)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Appartement">
                <Picker
                  value={form.apartment_id}
                  onChange={(value) => {
                    update("apartment_id", value);
                    update("reservation_id", "none");
                  }}
                  options={[
                    ["company", "Société — aucun appartement"],
                    ...apartments.map((item) => [item.id, item.name]),
                  ]}
                />
              </Field>
              <Field label="Réservation">
                <Picker
                  value={form.reservation_id}
                  onChange={(value) => update("reservation_id", value)}
                  options={[
                    ["none", "Aucune réservation"],
                    ...reservations
                      .filter(
                        (item) =>
                          form.apartment_id === "company" ||
                          item.apartment_id === form.apartment_id,
                      )
                      .map((item) => [
                        item.id,
                        `${item.reference} · ${item.client_name}`,
                      ]),
                  ]}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date *">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                />
              </Field>
              <Field label="Heure *">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(event) => update("time", event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Rappel">
                <Picker
                  value={form.reminder}
                  onChange={(value) => update("reminder", value)}
                  options={reminderOptions}
                />
              </Field>
              <Field label="Assignée à">
                <Picker
                  value={form.assignee}
                  onChange={(value) => update("assignee", value)}
                  options={Object.entries(taskAssigneeLabels)}
                />
              </Field>
              <Field label="Récurrence">
                <Picker
                  value={form.recurrence}
                  onChange={(value) => update("recurrence", value)}
                  options={Object.entries(taskRecurrenceLabels)}
                />
              </Field>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          {editable && (
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function taskToForm(task?: Task) {
  const date = task
    ? new Date(task.scheduled_at)
    : new Date(Date.now() + 3_600_000);
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    apartment_id: task?.apartment_id ?? "company",
    reservation_id: task?.reservation_id ?? "none",
    task_type: task?.task_type ?? "manual",
    priority: task?.priority ?? "normal",
    assignee: task?.assignee ?? "both",
    date: localDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    reminder:
      task?.reminder_minutes_before == null
        ? "none"
        : String(task.reminder_minutes_before),
    recurrence: task?.recurrence ?? "none",
  };
}
function Picker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlarmClockIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <Icon className="size-4 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      variant={
        status === "cancelled"
          ? "destructive"
          : status === "completed"
            ? "default"
            : "secondary"
      }
    >
      {taskStatusLabels[status]}
    </Badge>
  );
}
function isLate(task: Task) {
  return (
    new Date(task.scheduled_at) < new Date() &&
    !["completed", "cancelled"].includes(task.status)
  );
}
function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}
function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
const filterLabels: Record<Filter, string> = {
  today: "Aujourd’hui",
  upcoming: "À venir",
  late: "En retard",
  completed: "Terminées",
  all: "Toutes",
};
const reminderOptions = [
  ["none", "Aucun"],
  ["15", "15 minutes avant"],
  ["60", "1 heure avant"],
  ["1440", "1 jour avant"],
  ["2880", "2 jours avant"],
];
