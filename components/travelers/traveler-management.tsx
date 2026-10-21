"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, CheckCircle2Icon, EyeIcon, FileWarningIcon, ImageIcon, PrinterIcon, SearchIcon, UsersIcon } from "lucide-react"

import { TravelerLinkDialog } from "@/components/travelers/traveler-link-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DOCUMENT_TYPE_LABELS,
  GENDER_LABELS,
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
  type TravelerRegistrationRecord,
  type TravelerReservationSummary,
} from "@/features/travelers/types"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"

const statusStyles: Record<RegistrationStatus, string> = {
  sent: "bg-slate-100 text-slate-700",
  opened: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
}

export function TravelerManagement({
  reservations,
  registrations,
  setupError,
}: {
  reservations: TravelerReservationSummary[]
  registrations: TravelerRegistrationRecord[]
  setupError?: string
}) {
  const supabase = useSupabaseBrowserClient()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState("")
  const registrationByReservation = useMemo(
    () => new Map(registrations.map((registration) => [registration.reservation_id, registration])),
    [registrations],
  )

  const filteredReservations = reservations.filter((reservation) => {
    const query = search.trim().toLowerCase()
    return !query || reservation.reference.toLowerCase().includes(query) || reservation.client_name.toLowerCase().includes(query)
  })

  const review = async (registrationId: string, status: "verified" | "rejected") => {
    setReviewing(registrationId)
    setReviewError("")
    const { error } = await supabase.rpc("review_traveler_registration", {
      p_registration_id: registrationId,
      p_status: status,
    })
    if (error) setReviewError("Impossible d'enregistrer la vérification.")
    else router.refresh()
    setReviewing(null)
  }

  return (
    <div className="space-y-6">
      {setupError && (
        <Alert variant="destructive">
          <AlertDescription>{setupError}</AlertDescription>
        </Alert>
      )}
      {reviewError && (
        <Alert variant="destructive"><AlertDescription>{reviewError}</AlertDescription></Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Dossiers" value={registrations.length} icon={<UsersIcon className="size-5" />} />
        <SummaryCard label="À vérifier" value={registrations.filter((item) => item.status === "submitted").length} icon={<FileWarningIcon className="size-5" />} />
        <SummaryCard label="Vérifiés" value={registrations.filter((item) => item.status === "verified").length} icon={<CheckCircle2Icon className="size-5" />} />
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher par référence ou voyageur principal…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredReservations.map((reservation) => {
          const registration = registrationByReservation.get(reservation.id)
          return (
            <Card key={reservation.id} className="group overflow-hidden bg-card/85 transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{reservation.reference}</p>
                    <CardTitle className="mt-1 text-lg">{reservation.client_name}</CardTitle>
                    <CardDescription>{reservation.apartment?.name ?? "Appartement inconnu"}</CardDescription>
                  </div>
                  {registration ? (
                    <Badge className={statusStyles[registration.status]}>{REGISTRATION_STATUS_LABELS[registration.status]}</Badge>
                  ) : (
                    <Badge variant="outline">Non envoyé</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/60 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Voyageurs</p>
                    <p>{reservation.adults} adulte{reservation.adults > 1 ? "s" : ""}{reservation.children > 0 ? ` · ${reservation.children} enfant${reservation.children > 1 ? "s" : ""}` : ""}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarIcon className="size-3" /> Arrivée</p>
                    <p>{new Intl.DateTimeFormat("fr-FR").format(new Date(`${reservation.check_in}T12:00:00`))}</p>
                  </div>
                </div>

                {registration && (
                  <div className="text-sm text-muted-foreground">
                    {registration.travelers.length}/{registration.expected_adults} adultes enregistrés
                    {registration.submitted_at && ` · Reçu le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(registration.submitted_at))}`}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <TravelerLinkDialog
                    reservationId={reservation.id}
                    reservationReference={reservation.reference}
                    principalGuest={reservation.client_name}
                    registrationStatus={registration?.status}
                  />
                  {registration && registration.travelers.length > 0 && (
                    <TravelerDetailsDialog registration={registration} />
                  )}
                  {registration?.status === "submitted" && (
                    <>
                      <Button size="sm" onClick={() => review(registration.id, "verified")} disabled={reviewing === registration.id}>
                        Valider
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => review(registration.id, "rejected")} disabled={reviewing === registration.id}>
                        Demander une correction
                      </Button>
                    </>
                  )}
                  {registration?.status === "verified" && (
                    <>
                      <Button size="sm" asChild>
                        <a href={`/voyageurs/${registration.id}/fiche`} target="_blank" rel="noreferrer">
                          <PrinterIcon className="mr-1 size-4" /> Générer les fiches
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(registration.id, "rejected")} disabled={reviewing === registration.id}>
                        Rouvrir le dossier
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredReservations.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune réservation trouvée.</CardContent></Card>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>
  )
}

function TravelerDetailsDialog({ registration }: { registration: TravelerRegistrationRecord }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm" variant="outline"><EyeIcon className="mr-1 size-4" />Voir les informations</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Informations des voyageurs</DialogTitle>
          <DialogDescription>{registration.expected_adults} adulte{registration.expected_adults > 1 ? "s" : ""} · Signature du voyageur principal</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {[...registration.travelers].sort((a, b) => a.position - b.position).map((traveler) => (
            <div key={traveler.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-semibold">{traveler.first_name} {traveler.last_name}</h3>
                {traveler.is_primary && <Badge>Principal</Badge>}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Sexe" value={traveler.gender ? GENDER_LABELS[traveler.gender] : "—"} />
                <Detail label="Naissance" value={`${traveler.birth_date} · ${traveler.birth_place}`} />
                <Detail label="Nationalité" value={traveler.nationality} />
                <Detail label="Pays de résidence" value={traveler.country_of_residence} />
                <Detail label="Adresse" value={traveler.address} />
                <Detail label="Profession" value={traveler.profession || "—"} />
                <Detail
                  label="Document"
                  value={`${traveler.document_type ? DOCUMENT_TYPE_LABELS[traveler.document_type] : "Document"} · ${traveler.document_number}`}
                />
                <Detail label="Expiration" value={traveler.document_expiry_date || "—"} />
                <Detail label="Provenance" value={traveler.arrival_from} />
                <Detail label="Destination suivante" value={traveler.next_destination} />
              </dl>
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                {traveler.document_front_path && (
                  <IdentityDocumentPreview
                    registrationId={registration.id}
                    path={traveler.document_front_path}
                    label={traveler.document_type === "cin" ? "CIN — recto" : "Page d'identité"}
                  />
                )}
                {traveler.document_back_path && (
                  <IdentityDocumentPreview
                    registrationId={registration.id}
                    path={traveler.document_back_path}
                    label="CIN — verso"
                  />
                )}
              </div>
            </div>
          ))}
          {registration.signature_data_url && (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Signature du voyageur principal : {registration.signed_by}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {registration.signed_at && new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(registration.signed_at))}
              </p>
              {/* The signature is an internal PNG data URL, visible only to authenticated admins. */}
              <img src={registration.signature_data_url} alt={`Signature de ${registration.signed_by ?? "voyageur principal"}`} className="h-32 w-full rounded-md border bg-white object-contain" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
}

function IdentityDocumentPreview({
  registrationId,
  path,
  label,
}: {
  registrationId: string
  path: string
  label: string
}) {
  const [url, setUrl] = useState("")

  useEffect(() => {
    let active = true
    fetch(`/api/admin/travelers/${registrationId}/documents?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error)
        return body.url as string
      })
      .then((signedUrl) => active && setUrl(signedUrl))
      .catch(() => undefined)
    return () => { active = false }
  }, [path, registrationId])

  return (
    <figure className="rounded-md bg-muted/50 p-2">
      <figcaption className="mb-2 flex items-center gap-1 text-xs font-medium"><ImageIcon className="size-3" />{label}</figcaption>
      {url
        ? <img src={url} alt={label} className="h-40 w-full rounded bg-white object-contain" />
        : <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Chargement sécurisé…</div>}
    </figure>
  )
}
