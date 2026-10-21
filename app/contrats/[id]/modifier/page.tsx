import { notFound } from "next/navigation"

import { ContractEditor } from "@/components/contracts/contract-editor"
import { PageHeader } from "@/components/page-header"
import { contractToForm, type ContractApartment, type OwnerContract } from "@/features/contracts/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const [{ data: contractData }, { data: apartmentData }] = await Promise.all([
    supabase.from("owner_contracts").select("*, apartment:apartments(name)").eq("id", id).single(),
    supabase.from("apartments").select("id, name, owner_name, owner_contact, commission_rate").order("name"),
  ])
  if (!contractData) notFound()
  const contract = { ...contractData, apartment: firstRelation(contractData.apartment) } as OwnerContract
  return <div className="page-shell"><PageHeader eyebrow={contract.contract_number} title="Modifier le contrat" description="Les modifications seront visibles dans le prochain document généré." /><ContractEditor contractId={id} apartments={(apartmentData ?? []) as ContractApartment[]} initialForm={contractToForm(contract)} /></div>
}
