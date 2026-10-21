import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ChargesList } from "@/components/charges/charges-list"
import { AddChargeDialog } from "@/components/charges/add-charge-dialog"
import { PageHeader } from "@/components/page-header"

export default async function ChargesPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: charges }, { data: apartments }, { data: serviceTypes }, { data: reservations }] = await Promise.all([
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name, paid_by),
        reservation:reservations(id, client_name, check_in, check_out)
      `,
      )
      .order("date", { ascending: false }),
    supabase.from("apartments").select("id, name").order("name"),
    supabase.from("service_types").select("*").order("name"),
    supabase
      .from("reservations")
      .select("id, apartment_id, client_name, check_in, check_out, total_amount")
      .order("check_in", { ascending: false })
      .limit(100), // Limiter aux 100 dernières réservations
  ])

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Suivi des dépenses"
        title="Charges"
        description="Suivez les dépenses des appartements et de la société, avec leur état de paiement."
        actions={<AddChargeDialog
          apartments={apartments || []}
          serviceTypes={serviceTypes || []}
          reservations={reservations || []}
        />}
      />

      <ChargesList
        charges={charges || []}
        apartments={apartments || []}
        serviceTypes={serviceTypes || []}
        reservations={reservations || []}
      />
    </div>
  )
}
