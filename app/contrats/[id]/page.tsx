import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDaysIcon, DownloadIcon, FilePenLineIcon, FileTextIcon, PrinterIcon, ScanLineIcon } from "lucide-react"

import { ContractStatusBadge } from "@/components/contracts/contracts-list"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ContractDocument, OwnerContract } from "@/features/contracts/types"
import { renderContractContent } from "@/features/contracts/types"
import { getSupabaseServerClient } from "@/lib/supabase/server"

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const [{ data }, { data: documentData }] = await Promise.all([
    supabase.from("owner_contracts").select("*, apartment:apartments(name)").eq("id", id).single(),
    supabase.from("owner_contract_documents").select("*").eq("contract_id", id).order("position"),
  ])
  if (!data) notFound()
  const contract = { ...data, apartment: firstRelation(data.apartment) } as OwnerContract
  const documents = await Promise.all(((documentData ?? []) as ContractDocument[]).map(async (document) => {
    const { data: signed } = await supabase.storage.from("owner-contracts").createSignedUrl(document.storage_path, 900)
    return { ...document, signed_url: signed?.signedUrl ?? null }
  }))

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={contract.contract_number}
        title={contract.title}
        description={`${contract.owner_name} · ${contract.apartment?.name ?? "Appartement"}`}
        actions={<><Button variant="outline" asChild><Link href={`/contrats/${id}/modifier`}><FilePenLineIcon className="size-4" /> Modifier</Link></Button><Button asChild><Link href={`/contrats/${id}/impression`}><PrinterIcon className="size-4" /> Préparer le PDF</Link></Button></>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Aperçu du contrat</CardTitle><ContractStatusBadge status={contract.status} /></div></CardHeader><CardContent><div className="max-h-[720px] overflow-y-auto whitespace-pre-wrap rounded-xl border bg-white p-6 text-sm leading-7 text-slate-900">{renderContractContent(contract)}</div></CardContent></Card>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><Info icon={<CalendarDaysIcon />} label="Période" value={`${formatDate(contract.start_date)} → ${contract.end_date ? formatDate(contract.end_date) : "Indéterminée"}`} /><Info icon={<FileTextIcon />} label="Commission" value={`${Number(contract.commission_rate).toFixed(2)} %`} /><Info icon={<FileTextIcon />} label="Propriétaire" value={contract.owner_name} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLineIcon className="size-5" /> Contrat signé</CardTitle></CardHeader><CardContent className="space-y-3">
            {documents.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Aucun scan pour le moment.<br />Ajoutez les pages depuis l’application mobile.</div> : documents.map((document) => document.signed_url ? <a key={document.id} href={document.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileTextIcon className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Page {document.position}</p><p className="truncate text-xs text-muted-foreground">{document.file_name}</p></div><DownloadIcon className="size-4 text-muted-foreground" /></a> : null)}
          </CardContent></Card>
        </div>
      </div>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3 [&_svg]:size-4 [&_svg]:text-primary"><div className="mt-0.5">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div></div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`))
}
