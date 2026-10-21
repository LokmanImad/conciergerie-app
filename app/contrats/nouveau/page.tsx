import { ContractEditor } from "@/components/contracts/contract-editor"
import { PageHeader } from "@/components/page-header"
import { createEmptyContractForm, type ContractApartment } from "@/features/contracts/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function NewContractPage() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.from("apartments").select("id, name, owner_name, owner_contact, commission_rate").order("name")
  const apartments = (data ?? []) as ContractApartment[]

  return <div className="page-shell"><PageHeader eyebrow="Nouveau document" title="Rédiger un contrat" description="Complétez les parties puis adaptez librement les clauses avant impression." /><ContractEditor apartments={apartments} initialForm={createEmptyContractForm(apartments[0])} /></div>
}
