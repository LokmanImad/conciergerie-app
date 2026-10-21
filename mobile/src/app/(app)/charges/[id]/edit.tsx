import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";

import { ChargeForm } from "@/components/charges/charge-form";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { uploadChargeReceipt } from "@/features/charges/receipt";
import { chargeToForm, type ChargeFormState, type ChargeReceiptDraft } from "@/features/charges/types";
import { chargePayload, getChargeDatabaseError, validateCharge } from "@/features/charges/validation";
import { useChargeOptions } from "@/hooks/use-charge-options";
import { useCharge } from "@/hooks/use-charge";
import { useSupabaseClient } from "@/lib/supabase";

export default function EditChargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { charge, receiptUrl, loading: chargeLoading, error: chargeError, reload: reloadCharge } = useCharge(id);
  const { apartments, serviceTypes, reservations, loading: optionsLoading, error: optionsError, reload: reloadOptions } = useChargeOptions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: ChargeFormState, receipt: ChargeReceiptDraft | null, removeExistingReceipt: boolean) => {
    if (!charge || charge.cancelled_at) return;
    const validationError = validateCharge(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    let newReceiptPath: string | null = null;
    try {
      if (receipt) newReceiptPath = await uploadChargeReceipt(supabase, charge.id, receipt);
      const receiptPath = newReceiptPath ?? (removeExistingReceipt ? null : charge.receipt_path);
      const { error: updateError } = await supabase
        .from("charges")
        .update({ ...chargePayload(form), receipt_path: receiptPath })
        .eq("id", charge.id)
        .is("cancelled_at", null);
      if (updateError) throw updateError;

      if (charge.receipt_path && (removeExistingReceipt || newReceiptPath)) {
        await supabase.storage.from("charge-receipts").remove([charge.receipt_path]);
      }
      router.replace(`/charges/${charge.id}` as Href);
    } catch (updateError) {
      if (newReceiptPath) await supabase.storage.from("charge-receipts").remove([newReceiptPath]);
      setError(getChargeDatabaseError(updateError instanceof Error ? updateError : {}));
      setSubmitting(false);
    }
  };

  const loading = chargeLoading || optionsLoading;
  const loadError = chargeError ?? optionsError;
  return (
    <Screen>
      <PageHeading eyebrow="MODIFICATION" title="Modifier la charge" description={charge?.service_type?.name ?? "Informations de la dépense"} action={<NavigationBackButton onPress={() => router.back()} />} />
      {loading ? <LoadingView /> : null}
      {!loading && loadError ? <ErrorView message={loadError} retry={() => { void reloadCharge(); void reloadOptions(); }} /> : null}
      {!loading && !loadError && charge?.cancelled_at ? <ErrorView message="Une charge annulée ne peut plus être modifiée." retry={() => router.back()} /> : null}
      {!loading && !loadError && charge && !charge.cancelled_at ? (
        <ChargeForm
          initialForm={chargeToForm(charge)}
          apartments={apartments}
          serviceTypes={serviceTypes}
          reservations={reservations}
          initialReceiptUrl={receiptUrl}
          submitting={submitting}
          error={error}
          submitLabel="Enregistrer les modifications"
          onSubmit={(form, receipt, removeExisting) => void submit(form, receipt, removeExisting)}
        />
      ) : null}
    </Screen>
  );
}
