import { notFound } from "next/navigation";

import { InvoiceSheet } from "@/components/invoices/invoice-sheet";
import { PrintInvoiceButton } from "@/components/invoices/print-invoice-button";
import type { BillingSettings, Invoice } from "@/features/invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const [{ data }, { data: settingsData }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "*, apartment:apartments(name), reservation:reservations(reference, check_in, check_out), invoice_items(*)",
      )
      .eq("id", id)
      .single(),
    supabase.from("billing_settings").select("*").single(),
  ]);
  if (!data || !settingsData) notFound();
  const invoice = {
    ...data,
    apartment: firstRelation(data.apartment),
    reservation: firstRelation(data.reservation),
    invoice_items: (data.invoice_items ?? []).sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position,
    ),
  } as Invoice;
  return (
    <div
      data-print-document
      className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0"
    >
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-xl bg-white p-4 shadow-sm print:hidden">
        <div>
          <h1 className="font-semibold">Aperçu de la facture</h1>
          <p className="text-sm text-muted-foreground">
            Vérifiez les informations avant l’impression.
          </p>
        </div>
        <PrintInvoiceButton />
      </div>
      <InvoiceSheet
        invoice={invoice}
        settings={settingsData as BillingSettings}
      />
    </div>
  );
}
