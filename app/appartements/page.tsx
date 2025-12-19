import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ApartmentsList } from "@/components/apartments/apartments-list"
import { AddApartmentDialog } from "@/components/apartments/add-apartment-dialog"

export default async function ApartmentsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: apartments, error } = await supabase
    .from("apartments")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching apartments:", error)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold">Appartements</h1>
          <p className="text-pretty text-muted-foreground mt-2">Gérez tous vos appartements et leurs informations</p>
        </div>
        <AddApartmentDialog />
      </div>

      <ApartmentsList apartments={apartments || []} />
    </div>
  )
}
