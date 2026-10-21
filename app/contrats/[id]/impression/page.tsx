import { notFound } from "next/navigation";

import { ContractSheet } from "@/components/contracts/contract-sheet";
import { PrintContractButton } from "@/components/contracts/print-contract-button";
import type { OwnerContract } from "@/features/contracts/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PrintContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("owner_contracts")
    .select("*, apartment:apartments(name)")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const contract = {
    ...data,
    apartment: firstRelation(data.apartment),
  } as OwnerContract;
  return (
    <div data-print-document className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-xl bg-white p-4 shadow-sm print:hidden">
        <div>
          <h1 className="font-semibold">Aperçu avant impression</h1>
          <p className="text-sm text-muted-foreground">
            Vérifiez le contenu avant de générer le PDF.
          </p>
        </div>
        <PrintContractButton contractId={id} status={contract.status} />
      </div>
      <ContractSheet contract={contract} />
    </div>
  );
}
