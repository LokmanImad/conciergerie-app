import { useRouter, type Href } from "expo-router";
import { useState } from "react";

import { ChargeForm } from "@/components/charges/charge-form";
import { NavigationBackButton } from "@/components/navigation-back-button";
import { PageHeading } from "@/components/page-heading";
import { Screen } from "@/components/screen";
import { ErrorView, LoadingView } from "@/components/state-view";
import { uploadChargeReceipt } from "@/features/charges/receipt";
import { createEmptyChargeForm, type ChargeFormState, type ChargeReceiptDraft } from "@/features/charges/types";
import { chargePayload, getChargeDatabaseError, validateCharge } from "@/features/charges/validation";
import { useChargeOptions } from "@/hooks/use-charge-options";
import { useSupabaseClient } from "@/lib/supabase";

export default function NewChargeScreen() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { apartments, serviceTypes, reservations, loading, error: optionsError, reload } = useChargeOptions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (form: ChargeFormState, receipt: ChargeReceiptDraft | null) => {
    const validationError = validateCharge(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("charges")
      .insert(chargePayload(form))
      .select("id")
      .single();

    if (insertError || !data) {
      setSubmitting(false);
      setError(getChargeDatabaseError(insertError ?? {}));
      return;
    }

    let receiptPath: string | null = null;
    try {
      if (receipt) {
        receiptPath = await uploadChargeReceipt(supabase, data.id, receipt);
        const { error: receiptUpdateError } = await supabase
          .from("charges")
          .update({ receipt_path: receiptPath })
          .eq("id", data.id);
        if (receiptUpdateError) throw receiptUpdateError;
      }
    } catch (uploadError) {
      if (receiptPath) await supabase.storage.from("charge-receipts").remove([receiptPath]);
      await supabase.from("charges").delete().eq("id", data.id);
      setSubmitting(false);
      setError(uploadError instanceof Error ? uploadError.message : "Le justificatif n’a pas pu être enregistré.");
      return;
    }

    router.replace(`/charges/${data.id}` as Href);
  };

  return (
    <Screen>
      <PageHeading eyebrow="NOUVELLE DÉPENSE" title="Ajouter une charge" description="Enregistrez la dépense et son justificatif." action={<NavigationBackButton onPress={() => router.back()} />} />
      {loading ? <LoadingView /> : null}
      {!loading && optionsError ? <ErrorView message={optionsError} retry={() => void reload()} /> : null}
      {!loading && !optionsError ? (
        <ChargeForm
          initialForm={createEmptyChargeForm()}
          apartments={apartments}
          serviceTypes={serviceTypes}
          reservations={reservations}
          submitting={submitting}
          error={error}
          submitLabel="Ajouter la charge"
          onSubmit={(form, receipt) => void submit(form, receipt)}
        />
      ) : null}
    </Screen>
  );
}
