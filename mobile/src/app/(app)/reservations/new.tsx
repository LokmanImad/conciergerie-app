import { useRouter } from "expo-router";
import { useState } from "react";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { createEmptyReservationForm, type ReservationFormState } from "@/features/reservations/types";
import { getReservationDatabaseError, validateReservationForm } from "@/features/reservations/validation";
import { useApartments } from "@/hooks/use-apartments";
import { useSupabaseClient } from "@/lib/supabase";

export default function NewReservationScreen() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { apartments, loading, error: apartmentsError, reload } = useApartments();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: ReservationFormState) => {
    setError(null);
    const validation = validateReservationForm(form);
    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("reservations").insert(validation.data);
    setSubmitting(false);

    if (insertError) {
      setError(getReservationDatabaseError(insertError));
      return;
    }
    router.replace("/reservations");
  };

  return (
    <Screen>
      <PageHeading
        eyebrow="NOUVEAU SÉJOUR"
        title="Créer une réservation"
        description="Enregistrez le client, le séjour et le paiement initial."
        action={<NavigationBackButton onPress={() => router.back()} />}
      />
      {loading ? <LoadingView /> : null}
      {!loading && apartmentsError ? <ErrorView message={apartmentsError} retry={() => void reload()} /> : null}
      {!loading && !apartmentsError ? (
        <ReservationForm
          initialForm={createEmptyReservationForm()}
          apartments={apartments}
          submitting={submitting}
          error={error}
          submitLabel="Créer la réservation"
          onSubmit={(form) => void submit(form)}
        />
      ) : null}
    </Screen>
  );
}
