"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Building2Icon, CalendarDaysIcon, ChevronRightIcon, FileCheck2Icon, FileClockIcon, SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONTRACT_STATUSES, CONTRACT_STATUS_LABELS, type ContractStatus, type OwnerContract } from "@/features/contracts/types"

export function ContractsList({ contracts }: { contracts: OwnerContract[] }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ContractStatus | "all">("all")
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return contracts.filter((contract) => {
      const matchesStatus = status === "all" || contract.status === status
      const matchesSearch = !query || [contract.contract_number, contract.title, contract.owner_name, contract.apartment?.name]
        .some((value) => value?.toLocaleLowerCase("fr").includes(query))
      return matchesStatus && matchesSearch
    })
  }, [contracts, search, status])

  if (contracts.length === 0) {
    return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><FileClockIcon className="mb-4 size-10 text-muted-foreground" /><h2 className="font-semibold">Aucun contrat</h2><p className="mt-1 text-sm text-muted-foreground">Créez le premier contrat propriétaire depuis le bouton ci-dessus.</p></CardContent></Card>
  }

  return (
    <div className="space-y-5">
      <Card><CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_240px]">
        <div className="relative"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Numéro, propriétaire ou appartement…" /></div>
        <Select value={status} onValueChange={(value) => setStatus(value as ContractStatus | "all")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{CONTRACT_STATUSES.map((item) => <SelectItem key={item} value={item}>{CONTRACT_STATUS_LABELS[item]}</SelectItem>)}</SelectContent></Select>
      </CardContent></Card>

      <p className="text-sm text-muted-foreground">{filtered.length} contrat{filtered.length > 1 ? "s" : ""}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((contract) => (
          <Link key={contract.id} href={`/contrats/${contract.id}`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40"><CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileCheck2Icon className="size-5" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{contract.title}</h2><ContractStatusBadge status={contract.status} /></div><p className="mt-1 text-xs text-muted-foreground">{contract.contract_number}</p></div>
                <ChevronRightIcon className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <div className="grid gap-2 border-t pt-4 text-sm text-muted-foreground sm:grid-cols-2">
                <span className="flex items-center gap-2"><Building2Icon className="size-4" /> {contract.apartment?.name ?? "Appartement"}</span>
                <span className="flex items-center gap-2"><CalendarDaysIcon className="size-4" /> Depuis le {formatDate(contract.start_date)}</span>
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Propriétaire :</span> <span className="font-medium">{contract.owner_name}</span></p>
            </CardContent></Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const variant = status === "signed" ? "default" : status === "expired" || status === "archived" ? "secondary" : "outline"
  return <Badge variant={variant}>{CONTRACT_STATUS_LABELS[status]}</Badge>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`))
}
