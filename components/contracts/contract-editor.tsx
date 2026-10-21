"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, FileSignatureIcon, SaveIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CONTRACT_PLACEHOLDERS,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABELS,
  type ContractApartment,
  type ContractFormState,
} from "@/features/contracts/types"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"

export function ContractEditor({
  apartments,
  initialForm,
  contractId,
}: {
  apartments: ContractApartment[]
  initialForm: ContractFormState
  contractId?: string
}) {
  const router = useRouter()
  const supabase = useSupabaseBrowserClient()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const selectApartment = (apartmentId: string) => {
    const apartment = apartments.find((item) => item.id === apartmentId)
    setForm((current) => ({
      ...current,
      apartment_id: apartmentId,
      owner_name: apartment?.owner_name ?? current.owner_name,
      owner_contact: apartment?.owner_contact ?? current.owner_contact,
      property_address: apartment?.name ?? current.property_address,
      commission_rate: String(apartment?.commission_rate ?? current.commission_rate),
    }))
  }

  const save = async () => {
    const rate = Number(form.commission_rate.replace(",", "."))
    if (!form.apartment_id || !form.owner_name.trim() || !form.manager_name.trim() || !form.start_date || !form.content.trim()) {
      setError("Complétez l’appartement, les parties, la date de début et le contenu du contrat.")
      return
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError("Le taux de commission doit être compris entre 0 et 100.")
      return
    }
    if (form.end_date && form.end_date < form.start_date) {
      setError("La date de fin doit être postérieure à la date de début.")
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      apartment_id: form.apartment_id,
      contract_number: form.contract_number.trim(),
      title: form.title.trim(),
      status: form.status,
      owner_name: form.owner_name.trim(),
      owner_contact: form.owner_contact.trim() || null,
      owner_address: form.owner_address.trim() || null,
      owner_identifier: form.owner_identifier.trim() || null,
      manager_name: form.manager_name.trim(),
      manager_address: form.manager_address.trim() || null,
      manager_identifier: form.manager_identifier.trim() || null,
      property_address: form.property_address.trim() || null,
      commission_rate: rate,
      start_date: form.start_date,
      end_date: form.end_date || null,
      content: form.content.trim(),
      notes: form.notes.trim() || null,
    }

    const result = contractId
      ? await supabase.from("owner_contracts").update(payload).eq("id", contractId).select("id").single()
      : await supabase.from("owner_contracts").insert(payload).select("id").single()

    setSaving(false)
    if (result.error || !result.data) {
      setError(result.error?.message.includes("owner_contracts")
        ? "Installez d’abord la migration 36 dans Supabase."
        : result.error?.message ?? "Impossible d’enregistrer le contrat.")
      return
    }

    router.push(`/contrats/${result.data.id}`)
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Identification du contrat</CardTitle>
            <CardDescription>Appartement, numéro interne, durée et état du dossier.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Appartement *">
              <Select value={form.apartment_id} onValueChange={selectApartment}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner un appartement" /></SelectTrigger>
                <SelectContent>{apartments.map((apartment) => <SelectItem key={apartment.id} value={apartment.id}>{apartment.name} · {apartment.owner_name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Numéro du contrat *"><Input value={form.contract_number} onChange={(event) => update("contract_number", event.target.value)} /></Field>
            <Field label="Titre *"><Input value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
            <Field label="Statut">
              <Select value={form.status} onValueChange={(value) => update("status", value as ContractFormState["status"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_STATUSES.map((status) => <SelectItem key={status} value={status}>{CONTRACT_STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date de début *"><Input type="date" value={form.start_date} onChange={(event) => update("start_date", event.target.value)} /></Field>
            <Field label="Date de fin"><Input type="date" min={form.start_date} value={form.end_date} onChange={(event) => update("end_date", event.target.value)} /></Field>
            <Field label="Commission (%) *"><Input type="number" min="0" max="100" step="0.01" value={form.commission_rate} onChange={(event) => update("commission_rate", event.target.value)} /></Field>
            <Field label="Adresse du logement"><Input value={form.property_address} onChange={(event) => update("property_address", event.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parties au contrat</CardTitle><CardDescription>Ces informations sont conservées dans le contrat même si la fiche appartement change plus tard.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nom du propriétaire *"><Input value={form.owner_name} onChange={(event) => update("owner_name", event.target.value)} /></Field>
            <Field label="Téléphone du propriétaire"><Input value={form.owner_contact} onChange={(event) => update("owner_contact", event.target.value)} /></Field>
            <Field label="Adresse du propriétaire"><Input value={form.owner_address} onChange={(event) => update("owner_address", event.target.value)} /></Field>
            <Field label="CIN / identifiant du propriétaire"><Input value={form.owner_identifier} onChange={(event) => update("owner_identifier", event.target.value)} /></Field>
            <Field label="Nom du gestionnaire *"><Input value={form.manager_name} onChange={(event) => update("manager_name", event.target.value)} /></Field>
            <Field label="Identifiant du gestionnaire"><Input value={form.manager_identifier} onChange={(event) => update("manager_identifier", event.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="Adresse du gestionnaire"><Input value={form.manager_address} onChange={(event) => update("manager_address", event.target.value)} /></Field></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rédaction du contrat</CardTitle><CardDescription>Modifiez librement le modèle. Les variables entre accolades seront remplacées lors de l’impression.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Textarea className="min-h-[620px] font-mono text-sm leading-relaxed" value={form.content} onChange={(event) => update("content", event.target.value)} />
            <Field label="Notes internes"><Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Notes non imprimées…" /></Field>
          </CardContent>
        </Card>

        <Button size="lg" disabled={saving} onClick={() => void save()}>
          <SaveIcon className="size-4" /> {saving ? "Enregistrement…" : contractId ? "Enregistrer les modifications" : "Créer le contrat"}
        </Button>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSignatureIcon className="size-5" /> Variables disponibles</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CONTRACT_PLACEHOLDERS.map((placeholder) => <code key={placeholder} className="rounded-md bg-muted px-2 py-1 text-[11px]">{placeholder}</code>)}
          </CardContent>
        </Card>
        <Alert>
          <AlertCircleIcon className="size-4" />
          <AlertDescription>Le modèle constitue une base de travail. Faites valider sa rédaction juridique avant une utilisation réelle.</AlertDescription>
        </Alert>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
