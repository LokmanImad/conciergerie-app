"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditReservationDialog } from "./edit-reservation-dialog"
import { DeleteReservationDialog } from "./delete-reservation-dialog"
import { CalendarIcon, UserIcon, CoinsIcon, TrendingUpIcon, BuildingIcon } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"

type Reservation = {
  id: string
  apartment_id: string
  client_name: string
  check_in: string
  check_out: string
  total_amount: number
  notes: string | null
  apartment: { name: string; commission_rate: number } | null
}

type Apartment = { id: string; name: string; commission_rate: number }

export function ReservationsList({
  reservations,
  apartments,
}: {
  reservations: Reservation[]
  apartments: Apartment[]
}) {
  const [filterApartment, setFilterApartment] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const filteredReservations = reservations.filter((reservation) => {
    if (filterApartment !== "all" && reservation.apartment_id !== filterApartment) return false
    if (startDate && new Date(reservation.check_in) < new Date(startDate)) return false
    if (endDate && new Date(reservation.check_in) > new Date(endDate)) return false
    return true
  })

  const totalRevenue = filteredReservations.reduce((sum, res) => sum + Number(res.total_amount), 0)
  const totalCommission = filteredReservations.reduce((sum, res) => {
    const commission = (Number(res.total_amount) * (res.apartment?.commission_rate || 25)) / 100
    return sum + commission
  }, 0)
  const totalOwnerAmount = totalRevenue - totalCommission

  if (reservations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucune réservation pour le moment</p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour ajouter votre première réservation
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <CoinsIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenu total</p>
                <p className="text-lg font-bold">{totalRevenue.toFixed(2)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-accent/10">
                <TrendingUpIcon className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commission société</p>
                <p className="text-lg font-bold text-accent">{totalCommission.toFixed(2)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary/10">
                <BuildingIcon className="size-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Part propriétaires</p>
                <p className="text-lg font-bold">{totalOwnerAmount.toFixed(2)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">
                <CalendarIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Réservations</p>
                <p className="text-lg font-bold">{filteredReservations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Filtrez les réservations par appartement ou date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={filterApartment} onValueChange={setFilterApartment}>
            <SelectTrigger className="w-full max-w-xs">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="res-start-date">Date début (Check-in)</Label>
              <Input
                type="date"
                id="res-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="res-end-date">Date fin (Check-in)</Label>
              <Input
                type="date"
                id="res-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredReservations.map((reservation) => {
          const nights = differenceInDays(new Date(reservation.check_out), new Date(reservation.check_in))
          const commission = (Number(reservation.total_amount) * (reservation.apartment?.commission_rate || 25)) / 100
          const ownerAmount = Number(reservation.total_amount) - commission

          return (
            <Card key={reservation.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserIcon className="size-5 text-primary shrink-0" />
                      <span className="truncate">{reservation.client_name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <BuildingIcon className="size-4 shrink-0" />
                      <span className="truncate">{reservation.apartment?.name || "Appartement inconnu"}</span>
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{Number(reservation.total_amount).toFixed(2)} TND</p>
                    <p className="text-xs text-muted-foreground">
                      {nights} nuit{nights > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="size-4" />
                    <span>{format(new Date(reservation.check_in), "d MMM", { locale: fr })}</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="size-4" />
                    <span>{format(new Date(reservation.check_out), "d MMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Commission ({reservation.apartment?.commission_rate}%)
                    </p>
                    <p className="text-sm font-semibold text-accent">{commission.toFixed(2)} TND</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pour propriétaire</p>
                    <p className="text-sm font-semibold">{ownerAmount.toFixed(2)} TND</p>
                  </div>
                </div>
                {reservation.notes && (
                  <p className="text-pretty text-sm text-muted-foreground border-t pt-3">{reservation.notes}</p>
                )}
                <div className="flex gap-2 pt-3 border-t">
                  <EditReservationDialog reservation={reservation} apartments={apartments} />
                  <DeleteReservationDialog reservationId={reservation.id} clientName={reservation.client_name} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
