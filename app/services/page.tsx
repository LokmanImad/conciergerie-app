import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ServiceTypesList } from "@/components/services/service-types-list"
import { AddServiceTypeDialog } from "@/components/services/add-service-type-dialog"

export default async function ServicesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: serviceTypes, error } = await supabase
    .from("service_types")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching service types:", error)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold">Types de services</h1>
          <p className="text-pretty text-muted-foreground mt-2">
            Définissez les types de charges et qui doit les payer
          </p>
        </div>
        <AddServiceTypeDialog />
      </div>

      <ServiceTypesList serviceTypes={serviceTypes || []} />
    </div>
  )
}
