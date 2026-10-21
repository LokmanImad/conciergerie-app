import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { taskToForm, type TaskFormState } from "@/features/tasks/types";
import { taskPayload, validateTask } from "@/features/tasks/validation";
import { useTask } from "@/hooks/use-task";
import { useTaskOptions } from "@/hooks/use-task-options";
import { useSupabaseClient } from "@/lib/supabase";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const {
    task,
    loading: taskLoading,
    error: taskError,
    reload: reloadTask,
  } = useTask(id);
  const {
    apartments,
    reservations,
    loading: optionsLoading,
    error: optionsError,
    reload: reloadOptions,
  } = useTaskOptions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (form: TaskFormState) => {
    if (!task || task.source !== "manual") return;
    const validation = validateTask(form);
    if (validation) return setError(validation);
    setSubmitting(true);
    const reservation = reservations.find(
      (item) => item.id === form.reservation_id,
    );
    const { error: updateError } = await supabase
      .from("tasks")
      .update(taskPayload(form, reservation?.apartment_id))
      .eq("id", task.id);
    setSubmitting(false);
    if (updateError) return setError(updateError.message);
    router.replace(`/tasks/${task.id}` as Href);
  };
  const loading = taskLoading || optionsLoading;
  const loadError = taskError ?? optionsError;
  return (
    <Screen>
      <PageHeading
        eyebrow="MODIFICATION"
        title="Modifier la tâche"
        description="Mettez à jour le planning et son rappel."
        action={<NavigationBackButton onPress={() => router.back()} />}
      />
      {loading ? <LoadingView /> : null}
      {!loading && loadError ? (
        <ErrorView
          message={loadError}
          retry={() => {
            void reloadTask();
            void reloadOptions();
          }}
        />
      ) : null}
      {!loading && !loadError && task?.source !== "manual" ? (
        <ErrorView
          message="Cette tâche suit automatiquement la réservation."
          retry={() => router.back()}
        />
      ) : null}
      {!loading && !loadError && task?.source === "manual" ? (
        <TaskForm
          initialForm={taskToForm(task)}
          apartments={apartments}
          reservations={reservations}
          submitting={submitting}
          error={error}
          submitLabel="Enregistrer les modifications"
          onSubmit={(form) => void submit(form)}
        />
      ) : null}
    </Screen>
  );
}
