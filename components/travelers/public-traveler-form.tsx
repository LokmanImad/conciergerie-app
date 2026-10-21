"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarDaysIcon, CheckCircle2Icon, ShieldCheckIcon, UsersIcon } from "lucide-react"

import { SignatureCanvas } from "@/components/travelers/signature-canvas"
import { IdentityDocumentUpload } from "@/components/travelers/identity-document-upload"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DOCUMENT_TYPE_LABELS,
  GENDER_LABELS,
  createEmptyTraveler,
  type DocumentType,
  type Gender,
  type PublicRegistration,
  type TravelerFormValue,
} from "@/features/travelers/types"
import { travelerSubmissionSchema } from "@/features/travelers/validation"

const REQUIRED_KEYS: Array<keyof TravelerFormValue> = [
  "first_name",
  "last_name",
  "gender",
  "birth_date",
  "birth_place",
  "nationality",
  "country_of_residence",
  "address",
  "document_type",
  "document_number",
  "document_front_path",
  "arrival_from",
  "next_destination",
]

function isTravelerComplete(traveler: TravelerFormValue) {
  return REQUIRED_KEYS.every((key) => String(traveler[key] ?? "").trim().length > 0)
    && (traveler.document_type !== "cin" || String(traveler.document_back_path ?? "").trim().length > 0)
}

function normalizeSavedTraveler(
  traveler: Partial<TravelerFormValue> | undefined,
  position: number,
): TravelerFormValue {
  const emptyTraveler = createEmptyTraveler(position)
  if (!traveler) return emptyTraveler

  return {
    ...emptyTraveler,
    ...traveler,
    position,
    is_primary: position === 1,
    profession: traveler.profession ?? "",
    document_expiry_date: traveler.document_expiry_date ?? "",
    document_front_path: traveler.document_front_path ?? "",
    document_back_path: traveler.document_back_path ?? "",
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`))
}

export function PublicTravelerForm() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [registration, setRegistration] = useState<PublicRegistration | null>(null)
  const [travelers, setTravelers] = useState<TravelerFormValue[]>([])
  const [activeTraveler, setActiveTraveler] = useState(0)
  const [signature, setSignature] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    fetch(`/api/check-in/${token}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || "Lien invalide")
        return body as PublicRegistration
      })
      .then((data) => {
        if (!active) return
        setRegistration(data)
        if (data.status === "submitted" || data.status === "verified") {
          setSubmitted(true)
          return
        }
        const savedTravelers = Array.isArray(data.travelers) ? data.travelers : []
        setTravelers(
          Array.from({ length: data.expected_adults }, (_, index) =>
            normalizeSavedTraveler(savedTravelers[index], index + 1),
          ),
        )
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [token])

  const completedCount = useMemo(() => travelers.filter(isTravelerComplete).length, [travelers])
  const signedBy = `${travelers[0]?.first_name ?? ""} ${travelers[0]?.last_name ?? ""}`.trim()

  const updateTraveler = (index: number, field: keyof TravelerFormValue, value: string) => {
    setTravelers((current) =>
      current.map((traveler, travelerIndex) =>
        travelerIndex === index ? { ...traveler, [field]: value } : traveler,
      ),
    )
  }

  const applyOcrResult = (index: number, fields: Partial<TravelerFormValue>) => {
    setTravelers((current) => current.map((currentTraveler, travelerIndex) => {
      if (travelerIndex !== index) return currentTraveler
      const usefulFields = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
      ) as Partial<TravelerFormValue>
      return { ...currentTraveler, ...usefulFields }
    }))
  }

  const submit = async () => {
    setError("")
    const payload = { travelers, signed_by: signedBy, consent, signature_data_url: signature }
    const parsed = travelerSubmissionSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Veuillez compléter le formulaire.")
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/check-in/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "Impossible d'envoyer le formulaire.")
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Une erreur est survenue.")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl p-6 text-center text-slate-600">Chargement du formulaire…</div>
  }

  if (error && !registration) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Alert variant="destructive">
          <AlertTitle>Lien indisponible</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!registration) return null

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl p-6 py-16">
        <Card className="border-emerald-200 text-center">
          <CardContent className="space-y-4 py-10">
            <CheckCircle2Icon className="mx-auto size-14 text-emerald-600" />
            <h1 className="text-2xl font-bold">Formulaire envoyé</h1>
            <p className="text-muted-foreground">
              Merci. Les informations des voyageurs ont été transmises à l'hébergement pour vérification.
            </p>
            <p className="font-mono text-sm">{registration.reservation_reference}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const traveler = travelers[activeTraveler]
  const progress = registration.expected_adults > 0 ? (completedCount / registration.expected_adults) * 100 : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 py-8 sm:p-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheckIcon className="size-6" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Enregistrement des voyageurs</h1>
        <p className="text-muted-foreground">Informations nécessaires à la préparation des fiches de police</p>
      </div>

      {registration.status === "rejected" && (
        <Alert>
          <AlertTitle>Une correction est nécessaire</AlertTitle>
          <AlertDescription>Vérifiez les informations préremplies, signez de nouveau puis renvoyez le formulaire.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Formulaire incomplet</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Réservation</p>
            <p className="font-mono text-sm font-medium">{registration.reservation_reference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hébergement</p>
            <p className="font-medium">{registration.apartment_name}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDaysIcon className="size-3" /> Séjour
            </p>
            <p className="text-sm">{formatDate(registration.check_in)} – {formatDate(registration.check_out)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-5" /> Adultes à renseigner
              </CardTitle>
              <CardDescription>
                {registration.expected_adults} adulte{registration.expected_adults > 1 ? "s" : ""} attendu{registration.expected_adults > 1 ? "s" : ""}.
                {registration.children > 0 && ` Les ${registration.children} enfant${registration.children > 1 ? "s" : ""} ne nécessitent pas de fiche dans ce formulaire.`}
              </CardDescription>
            </div>
            <Badge variant="outline">{completedCount}/{registration.expected_adults} complétés</Badge>
          </div>
          <Progress value={progress} />
          <div className="flex flex-wrap gap-2 pt-2">
            {travelers.map((item, index) => (
              <Button
                key={item.position}
                type="button"
                size="sm"
                variant={activeTraveler === index ? "default" : "outline"}
                onClick={() => setActiveTraveler(index)}
              >
                {item.is_primary ? "Voyageur principal" : `Adulte ${item.position}`}
                {isTravelerComplete(item) ? " ✓" : ""}
              </Button>
            ))}
          </div>
        </CardHeader>

        {traveler && (
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Prénom *" value={traveler.first_name} onChange={(value) => updateTraveler(activeTraveler, "first_name", value)} />
              <FormInput label="Nom *" value={traveler.last_name} onChange={(value) => updateTraveler(activeTraveler, "last_name", value)} />
              <div className="space-y-2">
                <Label>Sexe *</Label>
                <Select value={traveler.gender} onValueChange={(value: Gender) => updateTraveler(activeTraveler, "gender", value)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(GENDER_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FormInput label="Date de naissance *" type="date" value={traveler.birth_date} onChange={(value) => updateTraveler(activeTraveler, "birth_date", value)} />
              <FormInput label="Lieu de naissance *" value={traveler.birth_place} onChange={(value) => updateTraveler(activeTraveler, "birth_place", value)} />
              <FormInput label="Nationalité *" value={traveler.nationality} onChange={(value) => updateTraveler(activeTraveler, "nationality", value)} />
              <FormInput label="Pays de résidence *" value={traveler.country_of_residence} onChange={(value) => updateTraveler(activeTraveler, "country_of_residence", value)} />
              <FormInput label="Profession" value={traveler.profession} onChange={(value) => updateTraveler(activeTraveler, "profession", value)} />
              <div className="sm:col-span-2">
                <FormInput label="Adresse de résidence *" value={traveler.address} onChange={(value) => updateTraveler(activeTraveler, "address", value)} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="mb-4 font-semibold">Document d'identité</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type de document *</Label>
                  <Select value={traveler.document_type} onValueChange={(value: DocumentType) => updateTraveler(activeTraveler, "document_type", value)}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FormInput label="Numéro du document *" value={traveler.document_number} onChange={(value) => updateTraveler(activeTraveler, "document_number", value)} />
                <FormInput label="Date d'expiration (si applicable)" type="date" value={traveler.document_expiry_date} onChange={(value) => updateTraveler(activeTraveler, "document_expiry_date", value)} />
              </div>
              {traveler.document_type ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <IdentityDocumentUpload
                    token={token}
                    position={traveler.position}
                    side="front"
                    label={traveler.document_type === "cin" ? "Photo de la CIN — recto" : "Photo de la page d'identité"}
                    existingPath={traveler.document_front_path}
                    onUploaded={(path) => updateTraveler(activeTraveler, "document_front_path", path)}
                    onOcrResult={(fields) => applyOcrResult(activeTraveler, fields)}
                  />
                  {traveler.document_type === "cin" && (
                    <IdentityDocumentUpload
                      token={token}
                      position={traveler.position}
                      side="back"
                      label="Photo de la CIN — verso"
                      existingPath={traveler.document_back_path}
                      onUploaded={(path) => updateTraveler(activeTraveler, "document_back_path", path)}
                    />
                  )}
                </div>
              ) : (
                <Alert className="mt-5">
                  <AlertDescription>Sélectionnez le type de document avant d'ajouter les photos.</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="mb-4 font-semibold">Itinéraire</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Provenance *" placeholder="Ville ou pays" value={traveler.arrival_from} onChange={(value) => updateTraveler(activeTraveler, "arrival_from", value)} />
                <FormInput label="Prochaine destination *" placeholder="Ville ou pays" value={traveler.next_destination} onChange={(value) => updateTraveler(activeTraveler, "next_destination", value)} />
              </div>
            </div>

            <div className="flex justify-between border-t pt-4">
              <Button type="button" variant="outline" disabled={activeTraveler === 0} onClick={() => setActiveTraveler((value) => value - 1)}>Précédent</Button>
              <Button type="button" disabled={activeTraveler === travelers.length - 1} onClick={() => setActiveTraveler((value) => value + 1)}>Adulte suivant</Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Déclaration et signature du voyageur principal</CardTitle>
          <CardDescription>
            Cette signature confirme l'exactitude des informations saisies. Elle sera intégrée à la fiche de police liée au séjour et utilisée uniquement pour les formalités administratives de l'hébergement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md bg-muted p-4 text-sm">
            Signataire : <strong>{signedBy || "renseignez d'abord le voyageur principal"}</strong>
          </div>
          <SignatureCanvas onChange={setSignature} />
          <div className="flex items-start gap-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
            <Label htmlFor="consent" className="cursor-pointer text-sm leading-relaxed">
              Je certifie l'exactitude des informations fournies et j'accepte l'utilisation de ma signature pour préparer la fiche de police liée à ce séjour.
            </Label>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={submitting || completedCount !== registration.expected_adults || !signature || !consent || !signedBy}
            onClick={submit}
          >
            {submitting ? "Envoi en cours…" : `Envoyer les ${registration.expected_adults} fiche${registration.expected_adults > 1 ? "s" : ""}`}
          </Button>
          {completedCount !== registration.expected_adults && (
            <p className="text-center text-xs text-muted-foreground">
              Le bouton sera disponible lorsque les {registration.expected_adults} adultes seront complètement renseignés.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
