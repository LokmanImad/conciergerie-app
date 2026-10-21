import { createServerClient } from "@/lib/supabase/server";
import { OwnerPaymentsList } from "@/components/owners/owner-payments-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FileSignatureIcon, ReceiptTextIcon } from "lucide-react";
import Link from "next/link";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ProprietairesPage() {
  const supabase = await createServerClient();

  const [
    { data: apartments },
    { data: reservations },
    { data: charges },
    { data: serviceTypes },
  ] = await Promise.all([
    supabase.from("apartments").select("*").order("name"),
    supabase
      .from("reservations")
      .select(
        "id, apartment_id, total_amount, payment_method, check_in, check_out, apartment:apartments(commission_rate, default_cleaning_fee)",
      )
      .order("check_in", { ascending: false }),
    supabase
      .from("charges")
      .select(
        "id, apartment_id, reservation_id, amount, payment_method, date, billable_to_owner, service_type:service_types(id, name, paid_by), apartment:apartments(id)",
      )
      .is("cancelled_at", null)
      .order("date", { ascending: false }),
    supabase.from("service_types").select("*"),
  ]);

  const normalizedReservations = (reservations || []).map((reservation) => ({
    ...reservation,
    apartment: firstRelation(reservation.apartment),
  }));
  const normalizedCharges = (charges || []).map((charge) => ({
    ...charge,
    service_type: firstRelation(charge.service_type),
  }));

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Comptes propriétaires"
        title="Paiements aux propriétaires"
        description="Préparez le calcul mensuel des montants à reverser à chaque propriétaire."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/proprietaires/factures">
                <ReceiptTextIcon className="size-4" /> Factures propriétaires
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contrats">
                <FileSignatureIcon className="size-4" /> Contrats
              </Link>
            </Button>
          </>
        }
      />

      <OwnerPaymentsList
        apartments={apartments || []}
        reservations={normalizedReservations}
        charges={normalizedCharges}
        serviceTypes={serviceTypes || []}
      />
    </div>
  );
}
