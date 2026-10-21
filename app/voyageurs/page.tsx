import { TravelerManagement } from "@/components/travelers/traveler-management"
import type {
  TravelerRecord,
  TravelerRegistrationRecord,
  TravelerReservationSummary,
} from "@/features/travelers/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function TravelersPage() {
  const supabase = await getSupabaseServerClient()
  const [reservationsResult, registrationsResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, reference, client_name, client_number, check_in, check_out, adults, children, apartment:apartments(name)")
      .neq("booking_status", "cancelled")
      .order("check_in", { ascending: false }),
    supabase
      .from("traveler_registrations")
      .select("id, reservation_id, status, expected_adults, expires_at, last_opened_at, submitted_at, verified_at, revoked_at, signed_by, signed_at, signature_data_url, declaration_version, travelers(*)")
      .order("created_at", { ascending: false }),
  ])

  const reservations = (reservationsResult.data ?? []).map((reservation) => ({
    ...reservation,
    apartment: firstRelation(reservation.apartment),
  })) as TravelerReservationSummary[]

  const registrations = (registrationsResult.data ?? []).map((registration) => ({
    ...registration,
    travelers: (registration.travelers ?? []) as unknown as TravelerRecord[],
  })) as unknown as TravelerRegistrationRecord[]

  const setupError = registrationsResult.error
    ? "Le module Voyageurs n'est pas encore installé dans Supabase. Exécutez d'abord les migrations 32 puis 33."
    : undefined

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Pré-enregistrement"
        title="Voyageurs et fiches de police"
        description="Envoyez le formulaire sécurisé au voyageur principal, vérifiez les documents puis générez les fiches."
      />
      <TravelerManagement reservations={reservations} registrations={registrations} setupError={setupError} />
    </div>
  )
}
