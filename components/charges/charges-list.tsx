"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditChargeDialog } from "./edit-charge-dialog"
import { DeleteChargeDialog } from "./delete-charge-dialog"
import { ReceiptIcon, BuildingIcon, CalendarIcon, CoinsIcon, UserIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Charge = {
  id: string
  apartment_id: string
  service_type_id: string
  amount: number
  date: string
  description: string | null
  paid_by_person: string
  notes: string | null
  apartment: { name: string } | null
  service_type: { name: string; paid_by: string } | null
}

type Apartment = { id: string; name: string }
type ServiceType = { id: string; name: string; paid_by: string; description: string | null }

export function ChargesList({
  charges,
  apartments,
  serviceTypes,
}: {
  charges: Charge[]
  apartments: Apartment[]
  serviceTypes: ServiceType[]
}) {
  const [filterApartment, setFilterApartment] = useState<string>("all")
  const [filterPaidBy, setFilterPaidBy] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const filteredCharges = charges.filter((charge) => {
    if (filterApartment !== "all" && charge.apartment_id !== filterApartment) return false
    if (filterPaidBy !== "all" && charge.paid_by_person !== filterPaidBy) return false
    if (startDate && new Date(charge.date) < new Date(startDate)) return false
    if (endDate && new Date(charge.date) > new Date(endDate)) return false
    return true
  })

  const totalAmount = filteredCharges.reduce((sum, charge) => sum + Number(charge.amount), 0)

  if (charges.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ReceiptIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucune charge pour le moment</p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour ajouter votre première charge
          </p>
        </CardContent>
      </Card>
    )
  }

  const getPersonBadge = (person: string) => {
    if (person === "imad") return { label: "Imad", variant: "default" as const }
    if (person === "jassem") return { label: "Jassem", variant: "secondary" as const }
    return { label: "Société", variant: "outline" as const }
  }

  const getPayerBadge = (paidBy: string) => {
    if (paidBy === "company") return { label: "Société", variant: "outline" as const }
    return { label: "Propriétaire", variant: "secondary" as const }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Filtrez les charges par appartement, payeur ou date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={filterApartment} onValueChange={setFilterApartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les appartements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les appartements</SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={filterPaidBy} onValueChange={setFilterPaidBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Payé par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="imad">Imad</SelectItem>
                  <SelectItem value="jassem">Jassem</SelectItem>
                  <SelectItem value="company">Société</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Date début</Label>
              <Input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="end-date">Date fin</Label>
              <Input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 border border-primary/20">
            <CoinsIcon className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{totalAmount.toFixed(2)} TND</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredCharges.map((charge) => {
          const personBadge = getPersonBadge(charge.paid_by_person)
          const payerBadge = charge.service_type ? getPayerBadge(charge.service_type.paid_by) : null

          return (
            <Card key={charge.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptIcon className="size-5 text-primary shrink-0" />
                      <span className="truncate">{charge.service_type?.name || "Service inconnu"}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <BuildingIcon className="size-4 shrink-0" />
                      <span className="truncate">{charge.apartment?.name || "Appartement inconnu"}</span>
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{Number(charge.amount).toFixed(2)} TND</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="size-4" />
                  <span>{format(new Date(charge.date), "d MMMM yyyy", { locale: fr })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={personBadge.variant} className="flex items-center gap-1.5">
                    <UserIcon className="size-3.5" />
                    Payé par: {personBadge.label}
                  </Badge>
                  {payerBadge && (
                    <Badge variant={payerBadge.variant} className="flex items-center gap-1.5">
                      À charge de: {payerBadge.label}
                    </Badge>
                  )}
                </div>
                {charge.description && (
                  <p className="text-pretty text-sm text-muted-foreground border-t pt-3">{charge.description}</p>
                )}
                {charge.notes && <p className="text-pretty text-sm text-muted-foreground italic">{charge.notes}</p>}
                <div className="flex gap-2 pt-3 border-t">
                  <EditChargeDialog charge={charge} apartments={apartments} serviceTypes={serviceTypes} />
                  <DeleteChargeDialog chargeId={charge.id} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
