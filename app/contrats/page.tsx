import Link from "next/link"
import { FilePlus2Icon } from "lucide-react"

import { ContractsList } from "@/components/contracts/contracts-list"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import type { OwnerContract } from "@/features/contracts/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ContractsPage() {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("owner_contracts")
    .select("*, apartment:apartments(name)")
    .order("created_at", { ascending: false })

  const contracts = (data ?? []).map((contract) => ({
    ...contract,
    apartment: firstRelation(contract.apartment),
  })) as OwnerContract[]

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Documents propriétaires"
        title="Contrats"
        description="Rédigez, imprimez et conservez les contrats de gestion signés et cachetés."
        actions={<Button asChild><Link href="/contrats/nouveau"><FilePlus2Icon className="size-4" /> Nouveau contrat</Link></Button>}
      />
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Le module n’est pas encore installé dans Supabase. Exécutez la migration 36 avant de créer un contrat.
        </div>
      ) : <ContractsList contracts={contracts} />}
    </div>
  )
}
