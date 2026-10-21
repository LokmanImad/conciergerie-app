"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  RESERVATION_SOURCES,
  RESERVATION_SOURCE_LABELS,
  type ApartmentOption,
  type ReservationFormState,
} from "@/features/reservations/types"

type ReservationFormFieldsProps = {
  apartments: ApartmentOption[]
  form: ReservationFormState
  idPrefix: string
  error?: string | null
  onChange: (next: ReservationFormState) => void
}

export function ReservationFormFields({
  apartments,
  form,
  idPrefix,
  error,
  onChange,
}: ReservationFormFieldsProps) {
  const update = <Key extends keyof ReservationFormState>(key: Key, value: ReservationFormState[Key]) => {
    onChange({ ...form, [key]: value })
  }

  const total = Number(form.total_amount) || 0
  const paid = Number(form.amount_paid) || 0
  const balance = Math.max(total - paid, 0)

  return (
    <div className="grid gap-5 py-4 max-h-[68vh] overflow-y-auto pr-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Réservation</h3>
          <p className="text-sm text-muted-foreground">Appartement, origine et état du dossier.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor={`${idPrefix}-apartment`}>Appartement *</Label>
            <Select value={form.apartment_id} onValueChange={(value) => update("apartment_id", value)}>
              <SelectTrigger id={`${idPrefix}-apartment`} className="w-full">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((apartment) => (
                  <SelectItem key={apartment.id} value={apartment.id}>
                    {apartment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-source`}>Source *</Label>
            <Select value={form.source} onValueChange={(value) => update("source", value as ReservationFormState["source"])}>
              <SelectTrigger id={`${idPrefix}-source`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESERVATION_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {RESERVATION_SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-status`}>Statut *</Label>
            <Select
              value={form.booking_status}
              onValueChange={(value) => update("booking_status", value as ReservationFormState["booking_status"])}
            >
              <SelectTrigger id={`${idPrefix}-status`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {BOOKING_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Séjour</h3>
          <p className="text-sm text-muted-foreground">Dates, horaires et nombre de voyageurs.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-check-in`}>Arrivée *</Label>
            <Input
              id={`${idPrefix}-check-in`}
              type="date"
              value={form.check_in}
              onChange={(event) => update("check_in", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-check-in-time`}>Heure d’arrivée</Label>
            <Input
              id={`${idPrefix}-check-in-time`}
              type="time"
              value={form.check_in_time}
              onChange={(event) => update("check_in_time", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-check-out`}>Départ *</Label>
            <Input
              id={`${idPrefix}-check-out`}
              type="date"
              min={form.check_in || undefined}
              value={form.check_out}
              onChange={(event) => update("check_out", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-check-out-time`}>Heure de départ</Label>
            <Input
              id={`${idPrefix}-check-out-time`}
              type="time"
              value={form.check_out_time}
              onChange={(event) => update("check_out_time", event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-adults`}>Adultes *</Label>
            <Input
              id={`${idPrefix}-adults`}
              type="number"
              min="1"
              step="1"
              value={form.adults}
              onChange={(event) => update("adults", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-children`}>Enfants</Label>
            <Input
              id={`${idPrefix}-children`}
              type="number"
              min="0"
              step="1"
              value={form.children}
              onChange={(event) => update("children", event.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Client principal</h3>
          <p className="text-sm text-muted-foreground">Les autres voyageurs seront ajoutés dans le prochain module.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-client-name`}>Nom complet *</Label>
            <Input
              id={`${idPrefix}-client-name`}
              placeholder="Ex. Ahmed Alaoui"
              value={form.client_name}
              onChange={(event) => update("client_name", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-client-number`}>Téléphone</Label>
            <Input
              id={`${idPrefix}-client-number`}
              type="tel"
              placeholder="Ex. +212 6XX XX XX XX"
              value={form.client_number}
              onChange={(event) => update("client_number", event.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="font-semibold">Paiement</h3>
          <p className="text-sm text-muted-foreground">Le reste à payer est calculé automatiquement.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-total`}>Montant total (DH) *</Label>
            <Input
              id={`${idPrefix}-total`}
              type="number"
              min="0"
              step="0.01"
              value={form.total_amount}
              onChange={(event) => update("total_amount", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-paid`}>Montant payé (DH)</Label>
            <Input
              id={`${idPrefix}-paid`}
              type="number"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={(event) => update("amount_paid", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-payment-method`}>Mode de paiement *</Label>
            <Select
              value={form.payment_method}
              onValueChange={(value) => update("payment_method", value as ReservationFormState["payment_method"])}
            >
              <SelectTrigger id={`${idPrefix}-payment-method`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Banque</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Reste à payer : </span>
          <span className="font-semibold">{balance.toFixed(2)} DH</span>
        </div>
      </section>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes internes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder="Informations utiles pour l’équipe…"
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </div>
    </div>
  )
}
