import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ChargesList } from "@/components/charges/charges-list"
import { AddChargeDialog } from "@/components/charges/add-charge-dialog"

export default async function ChargesPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: charges }, { data: apartments }, { data: serviceTypes }] = await Promise.all([
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name, paid_by)
      `,
      )
      .order("date", { ascending: false }),
    supabase.from("apartments").select("id, name").order("name"),
    supabase.from("service_types").select("*").order("name"),
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold">Charges</h1>
          <p className="text-pretty text-muted-foreground mt-2">
            Gérez toutes les charges de vos appartements et suivez les paiements
          </p>
        </div>
        <AddChargeDialog apartments={apartments || []} serviceTypes={serviceTypes || []} />
      </div>

      <ChargesList charges={charges || []} apartments={apartments || []} serviceTypes={serviceTypes || []} />
    </div>
  )
}
