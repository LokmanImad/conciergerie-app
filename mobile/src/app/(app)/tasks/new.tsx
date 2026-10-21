import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { emptyTaskForm, type TaskFormState } from "@/features/tasks/types";
import { taskPayload, validateTask } from "@/features/tasks/validation";
import { useTaskOptions } from "@/hooks/use-task-options";
import { useSupabaseClient } from "@/lib/supabase";

export default function NewTaskScreen() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const {
    apartments,
    reservations,
    loading,
    error: optionsError,
    reload,
  } = useTaskOptions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (form: TaskFormState) => {
    const validation = validateTask(form);
    if (validation) return setError(validation);
    setSubmitting(true);
    setError(null);
    const reservation = reservations.find(
      (item) => item.id === form.reservation_id,
    );
    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert(taskPayload(form, reservation?.apartment_id))
      .select("id")
      .single();
    setSubmitting(false);
    if (insertError || !data)
      return setError(
        insertError?.message.includes("tasks")
          ? "Exécutez la migration 39 dans Supabase."
          : (insertError?.message ?? "Impossible d’enregistrer la tâche."),
      );
    router.replace(`/tasks/${data.id}` as Href);
  };
  return (
    <Screen>
      <PageHeading
        eyebrow="NOUVELLE TÂCHE"
        title="Planifier une action"
        description="Société, appartement ou réservation."
        action={<NavigationBackButton onPress={() => router.back()} />}
      />
      {loading ? <LoadingView /> : null}
      {!loading && optionsError ? (
        <ErrorView message={optionsError} retry={() => void reload()} />
      ) : null}
      {!loading && !optionsError ? (
        <TaskForm
          initialForm={emptyTaskForm()}
          apartments={apartments}
          reservations={reservations}
          submitting={submitting}
          error={error}
          submitLabel="Créer la tâche"
          onSubmit={(form) => void submit(form)}
        />
      ) : null}
    </Screen>
  );
}
