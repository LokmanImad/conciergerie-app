import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { reservationToForm, type ReservationFormState } from "@/features/reservations/types";
import { getReservationDatabaseError, validateReservationForm } from "@/features/reservations/validation";
import { useApartments } from "@/hooks/use-apartments";
import { useReservation } from "@/hooks/use-reservation";
import { useSupabaseClient } from "@/lib/supabase";

export default function EditReservationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { reservation, loading: reservationLoading, error: reservationError, reload: reloadReservation } = useReservation(params.id);
  const { apartments, loading: apartmentsLoading, error: apartmentsError, reload: reloadApartments } = useApartments();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = reservationLoading || apartmentsLoading;

  const submit = async (form: ReservationFormState) => {
    if (!reservation) return;
    setError(null);
    const validation = validateReservationForm(form);
    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("reservations")
      .update(validation.data)
      .eq("id", reservation.id);
    setSubmitting(false);

    if (updateError) {
      setError(getReservationDatabaseError(updateError));
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <PageHeading
        eyebrow="MISE À JOUR"
        title="Modifier la réservation"
        description={reservation?.reference ?? "Mettez à jour le séjour et le paiement."}
        action={<NavigationBackButton onPress={() => router.back()} />}
      />
      {loading ? <LoadingView /> : null}
      {!loading && reservationError ? <ErrorView message={reservationError} retry={() => void reloadReservation()} /> : null}
      {!loading && !reservationError && apartmentsError ? <ErrorView message={apartmentsError} retry={() => void reloadApartments()} /> : null}
      {!loading && !reservationError && !apartmentsError && reservation ? (
        <ReservationForm
          initialForm={reservationToForm(reservation)}
          apartments={apartments}
          submitting={submitting}
          error={error}
          submitLabel="Enregistrer les modifications"
          onSubmit={(form) => void submit(form)}
        />
      ) : null}
    </Screen>
  );
}
