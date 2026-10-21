import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ServiceTypesList } from "@/components/services/service-types-list"
import { AddServiceTypeDialog } from "@/components/services/add-service-type-dialog"
import { PageHeader } from "@/components/page-header"

export default async function ServicesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: serviceTypes } = await supabase
    .from("service_types")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Configuration"
        title="Types de services"
        description="Définissez les prestations, leur facturation et la personne qui les prend en charge."
        actions={<AddServiceTypeDialog />}
      />

      <ServiceTypesList serviceTypes={serviceTypes || []} />
    </div>
  )
}
