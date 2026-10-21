import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ReservationsList } from "@/components/reservations/reservations-list"
import { AddReservationDialog } from "@/components/reservations/add-reservation-dialog"
import type { ApartmentOption, ReservationRecord } from "@/features/reservations/types"
import { PageHeader } from "@/components/page-header"

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ReservationsPage() {
  const supabase = await getSupabaseServerClient()

  const [
    { data: reservations },
    { data: apartments },
    { data: charges },
    { data: travelerRegistrations },
    { data: invoices },
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        `
        *,
        apartment:apartments(name, commission_rate)
      `,
      )
      .order("check_in", { ascending: false }),
    supabase.from("apartments").select("id, name, commission_rate").order("name"),
    supabase
      .from("charges")
      .select("id, reservation_id, amount, service_type:service_types(name)")
      .is("cancelled_at", null),
    supabase
      .from("traveler_registrations")
      .select("reservation_id, status"),
    supabase
      .from("invoices")
      .select("id, reservation_id, invoice_number")
      .neq("status", "cancelled"),
  ])

  const normalizedCharges = (charges || []).map((charge) => ({
    ...charge,
    service_type: firstRelation(charge.service_type),
  }))

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Planning et séjours"
        title="Réservations"
        description="Créez les séjours, suivez les paiements et préparez l'arrivée de chaque voyageur."
        actions={<AddReservationDialog apartments={(apartments || []) as ApartmentOption[]} />}
      />

      <ReservationsList
        reservations={(reservations || []) as ReservationRecord[]}
        apartments={(apartments || []) as ApartmentOption[]}
        charges={normalizedCharges}
        travelerRegistrations={(travelerRegistrations || []) as Array<{
          reservation_id: string
          status: "sent" | "opened" | "submitted" | "verified" | "rejected"
        }>}
        invoices={(invoices || []) as Array<{
          id: string
          reservation_id: string
          invoice_number: string
        }>}
      />
    </div>
  )
}
