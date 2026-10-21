import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ApartmentsList } from "@/components/apartments/apartments-list"
import { AddApartmentDialog } from "@/components/apartments/add-apartment-dialog"
import { PageHeader } from "@/components/page-header"

export default async function ApartmentsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: apartments } = await supabase
    .from("apartments")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Votre portefeuille"
        title="Appartements"
        description="Centralisez vos biens, leurs propriétaires et les règles de commission."
        actions={<AddApartmentDialog />}
      />

      <ApartmentsList apartments={apartments || []} />
    </div>
  )
}
