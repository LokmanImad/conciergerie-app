import { notFound } from "next/navigation";

import { PrintInvoiceButton } from "@/components/invoices/print-invoice-button";
import { OwnerInvoiceSheet } from "@/components/owners/owner-invoice-sheet";
import type { BillingSettings } from "@/features/invoices/types";
import type { OwnerInvoice } from "@/features/owner-invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PrintOwnerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("owner_invoices")
      .select(
        "*, apartment:apartments(name, address), items:owner_invoice_items(*)",
      )
      .eq("id", id)
      .single(),
    supabase.from("billing_settings").select("*").single(),
  ]);
  if (!data) notFound();
  const invoice = {
    ...data,
    apartment: firstRelation(data.apartment),
    items: (data.items ?? []).sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position,
    ),
  } as OwnerInvoice;
  return (
    <div
      data-print-document
      className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0"
    >
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-xl bg-white p-4 shadow-sm print:hidden">
        <div>
          <h1 className="font-semibold">Facture propriétaire</h1>
          <p className="text-sm text-muted-foreground">
            Vérifiez le document avant de l’envoyer.
          </p>
        </div>
        <PrintInvoiceButton />
      </div>
      <OwnerInvoiceSheet
        invoice={invoice}
        settings={settings as BillingSettings | null}
      />
    </div>
  );
}
