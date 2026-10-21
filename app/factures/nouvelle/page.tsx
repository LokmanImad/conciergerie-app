import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
import { PageHeader } from "@/components/page-header";
import type { BillingSettings } from "@/features/invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function NewInvoicePage() {
  const supabase = await getSupabaseServerClient();
  const [{ data: reservations }, { data: invoices }, { data: settingsData }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select(
          "id, reference, client_name, total_amount, check_in, check_out, apartment:apartments(name)",
        )
        .neq("booking_status", "cancelled")
        .order("check_in", { ascending: false }),
      supabase
        .from("invoices")
        .select("reservation_id, status")
        .neq("status", "cancelled"),
      supabase.from("billing_settings").select("*").single(),
    ]);
  const usedIds = new Set(
    (invoices ?? []).map((invoice) => invoice.reservation_id).filter(Boolean),
  );
  const options = (reservations ?? [])
    .filter((reservation) => !usedIds.has(reservation.id))
    .map((reservation) => ({
      ...reservation,
      apartment: firstRelation(reservation.apartment),
    }));
  const settings = settingsData as BillingSettings | null;
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Nouvelle vente"
        title="Créer une facture"
        description="Sélectionnez une réservation : les montants et le séjour seront repris automatiquement."
      />
      <NewInvoiceForm
        reservations={options}
        defaultTaxRate={Number(settings?.default_tax_rate ?? 0)}
        paymentTermsDays={settings?.payment_terms_days ?? 7}
      />
    </div>
  );
}
