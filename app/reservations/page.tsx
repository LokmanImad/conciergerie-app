import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ReservationsList } from "@/components/reservations/reservations-list"
import { AddReservationDialog } from "@/components/reservations/add-reservation-dialog"

export default async function ReservationsPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: reservations }, { data: apartments }] = await Promise.all([
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
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold">Réservations</h1>
          <p className="text-pretty text-muted-foreground mt-2">
            Gérez les réservations et calculez automatiquement les bénéfices
          </p>
        </div>
        <AddReservationDialog apartments={apartments || []} />
      </div>

      <ReservationsList reservations={reservations || []} apartments={apartments || []} />
    </div>
  )
}
