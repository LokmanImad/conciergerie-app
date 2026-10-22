"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EditReservationDialog } from "./edit-reservation-dialog"
import { DeleteReservationDialog } from "./delete-reservation-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { CalendarIcon, UserIcon, CoinsIcon, TrendingUpIcon, BuildingIcon, FileTextIcon } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"
import { TravelerLinkDialog } from "@/components/travelers/traveler-link-dialog"
import { useModuleEntitlements } from "@/components/module-entitlements-context"
import type { RegistrationStatus } from "@/features/travelers/types"
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RESERVATION_SOURCES,
  RESERVATION_SOURCE_LABELS,
  type ApartmentOption,
  type BookingStatus,
  type ReservationRecord,
  type ReservationSource,
} from "@/features/reservations/types"

type Charge = {
  id: string
  reservation_id: string | null
  amount: number
  service_type: { name: string } | null
}

type ReservationInvoice = {
  id: string
  reservation_id: string
  invoice_number: string
}

const bookingStatusStyles: Record<BookingStatus, string> = {
  option: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  checked_in: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  completed: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
}

export function ReservationsList({
  reservations,
  apartments,
  charges = [],
  travelerRegistrations = [],
  invoices = [],
}: {
  reservations: ReservationRecord[]
  apartments: ApartmentOption[]
  charges?: Charge[]
  travelerRegistrations?: Array<{ reservation_id: string; status: RegistrationStatus }>
  invoices?: ReservationInvoice[]
}) {
  const router = useRouter()
  const entitlements = useModuleEntitlements()
  const supabase = useSupabaseBrowserClient()
  const [search, setSearch] = useState("")
  const [filterApartment, setFilterApartment] = useState<string>("all")
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all")
  const [filterBookingStatus, setFilterBookingStatus] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loadingReservationId, setLoadingReservationId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(12)

  const handleCreateInvoice = async (reservationId: string) => {
    setLoadingReservationId(reservationId)
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase.rpc("create_invoice_from_reservation", {
      p_reservation_id: reservationId,
      p_issue_date: today,
      p_due_date: null,
      p_tax_rate: null,
      p_notes: null,
    })

    if (!error && data) {
      router.push(`/factures/${data}`)
      router.refresh()
      setLoadingReservationId(null)
      return
    }

    // La base interdit deux factures actives pour une même réservation.
    // En cas de double clic, on ouvre simplement la facture déjà créée.
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("reservation_id", reservationId)
      .neq("status", "cancelled")
      .maybeSingle()

    if (existingInvoice?.id) {
      router.push(`/factures/${existingInvoice.id}`)
      router.refresh()
    } else {
      alert(`Erreur : ${error?.message || "Impossible de créer la facture."}`)
    }
    setLoadingReservationId(null)
  }

  const filteredReservations = reservations.filter((reservation) => {
    const normalizedSearch = search.trim().toLowerCase()
    if (
      normalizedSearch &&
      !reservation.client_name.toLowerCase().includes(normalizedSearch) &&
      !reservation.reference.toLowerCase().includes(normalizedSearch) &&
      !reservation.client_number?.toLowerCase().includes(normalizedSearch)
    ) {
      return false
    }
    if (filterApartment !== "all" && reservation.apartment_id !== filterApartment) return false
    if (filterBookingStatus !== "all" && reservation.booking_status !== filterBookingStatus) return false
    if (filterSource !== "all" && reservation.source !== filterSource) return false
    if (filterPaymentMethod !== "all") {
      const paymentMethod = reservation.payment_method || "bank"
      if (filterPaymentMethod !== paymentMethod) return false
    }
    if (startDate && new Date(reservation.check_in) < new Date(startDate)) return false
    if (endDate && new Date(reservation.check_in) > new Date(endDate)) return false
    return true
  })

  // Fonction pour identifier les frais de ménage
  const isCleaningFee = (charge: Charge) => {
    const serviceName = charge.service_type?.name?.toLowerCase() || ""
    const cleaningFeeServiceNames = ["ménage", "menage", "cleaning", "nettoyage", "frais de ménage"]
    return cleaningFeeServiceNames.some(name => serviceName.includes(name))
  }

  const totalRevenue = filteredReservations.reduce((sum, res) => sum + Number(res.total_amount), 0)
  const totalCollected = filteredReservations.reduce((sum, res) => sum + Number(res.amount_paid || 0), 0)
  const totalCommission = filteredReservations.reduce((sum, res) => {
    // Calculer les frais de ménage UNIQUEMENT depuis les charges liées à cette réservation
    let cleaningFees = 0
    
    const reservationCharges = charges.filter((charge) => {
      return charge.reservation_id === res.id && isCleaningFee(charge)
    })
    
    reservationCharges.forEach((charge) => {
      cleaningFees += Number(charge.amount) || 0
    })
    
    // Calculer le montant après déduction des frais de ménage
    const amountAfterCleaning = Number(res.total_amount) - cleaningFees
    
    // Calculer la commission : (réservation - frais de ménage) * pourcentage de l'appartement
    const commission = (amountAfterCleaning * (res.apartment?.commission_rate || 25)) / 100
    return sum + commission
  }, 0)
  const totalOwnerAmount = totalRevenue - totalCommission

  // Pagination logic
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterApartment, filterPaymentMethod, filterBookingStatus, filterSource, startDate, endDate])

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <CoinsIcon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenu total</p>
                <p className="text-lg font-bold">{totalRevenue.toFixed(2)} DH</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-500/10">
                <CoinsIcon className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Montant encaissé</p>
                <p className="text-lg font-bold text-emerald-600">{totalCollected.toFixed(2)} DH</p>
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
                <p className="text-lg font-bold text-accent">{totalCommission.toFixed(2)} DH</p>
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
                <p className="text-lg font-bold">{totalOwnerAmount.toFixed(2)} DH</p>
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
          <CardDescription>Filtrez les réservations par appartement, mode de paiement ou date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="search"
            placeholder="Rechercher par référence, client ou téléphone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <Select value={filterBookingStatus} onValueChange={setFilterBookingStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Statut du séjour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {BOOKING_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {BOOKING_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  {RESERVATION_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {RESERVATION_SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mode de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modes</SelectItem>
                  <SelectItem value="bank">Banque</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">
                Éléments par page:
              </Label>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger id="items-per-page" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Affichage {startIndex + 1}-{Math.min(endIndex, filteredReservations.length)} sur {filteredReservations.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {paginatedReservations.map((reservation) => {
          const nights = differenceInDays(new Date(reservation.check_out), new Date(reservation.check_in))
          const travelerRegistration = travelerRegistrations.find((item) => item.reservation_id === reservation.id)
          const invoice = invoices.find((item) => item.reservation_id === reservation.id)
          
          // Calculer les frais de ménage UNIQUEMENT depuis les charges liées à cette réservation
          let cleaningFees = 0
          
          const reservationCharges = charges.filter((charge) => {
            return charge.reservation_id === reservation.id && isCleaningFee(charge)
          })
          
          reservationCharges.forEach((charge) => {
            cleaningFees += Number(charge.amount) || 0
          })
          
          // Calculer le montant après déduction des frais de ménage
          const amountAfterCleaning = Number(reservation.total_amount) - cleaningFees
          
          // Calculer la commission : (réservation - frais de ménage) * pourcentage de l'appartement
          const commission = (amountAfterCleaning * (reservation.apartment?.commission_rate || 25)) / 100
          const ownerAmount = Number(reservation.total_amount) - commission

          return (
            <Card key={reservation.id} className="group overflow-hidden bg-card/85 transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{reservation.reference}</span>
                  <Badge className={bookingStatusStyles[reservation.booking_status]}>
                    {BOOKING_STATUS_LABELS[reservation.booking_status]}
                  </Badge>
                  <Badge variant="outline">{RESERVATION_SOURCE_LABELS[reservation.source]}</Badge>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserIcon className="size-5 text-primary shrink-0" />
                      <span className="truncate">{reservation.client_name}</span>
                    </CardTitle>
                    {reservation.client_number && (
                      <p className="text-xs text-muted-foreground mt-1 ml-7">
                        N°: {reservation.client_number}
                      </p>
                    )}
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <BuildingIcon className="size-4 shrink-0" />
                      <span className="truncate">{reservation.apartment?.name || "Appartement inconnu"}</span>
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{Number(reservation.total_amount).toFixed(2)} DH</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {PAYMENT_STATUS_LABELS[reservation.payment_status]}
                    </p>
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
                <p className="text-sm text-muted-foreground">
                  Arrivée {reservation.check_in_time?.slice(0, 5)} · Départ {reservation.check_out_time?.slice(0, 5)} ·{" "}
                  {reservation.adults} adulte{reservation.adults > 1 ? "s" : ""}
                  {reservation.children > 0
                    ? ` · ${reservation.children} enfant${reservation.children > 1 ? "s" : ""}`
                    : ""}
                </p>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Commission ({reservation.apartment?.commission_rate}%)
                    </p>
                    <p className="text-sm font-semibold text-accent">{commission.toFixed(2)} DH</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pour propriétaire</p>
                    <p className="text-sm font-semibold">{ownerAmount.toFixed(2)} DH</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant encaissé</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {Number(reservation.amount_paid).toFixed(2)} DH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reste à payer</p>
                    <p className="text-sm font-semibold text-amber-700">
                      {Number(reservation.balance_due).toFixed(2)} DH
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invoice && (
                    <Badge variant="default" className="flex items-center gap-1.5 bg-blue-600 w-fit">
                      <FileTextIcon className="size-3.5" />
                      {invoice.invoice_number}
                    </Badge>
                  )}
                  {reservation.payment_method && (
                    <Badge 
                      variant={reservation.payment_method === "cash" ? "destructive" : "default"}
                      className="flex items-center gap-1.5 w-fit"
                    >
                      {reservation.payment_method === "cash" ? "Espèces" : "Banque"}
                    </Badge>
                  )}
                </div>
                {reservation.notes && (
                  <p className="text-pretty text-sm text-muted-foreground border-t pt-3">{reservation.notes}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <EditReservationDialog reservation={reservation} apartments={apartments} />
                  <DeleteReservationDialog reservationId={reservation.id} clientName={reservation.client_name} />
                  {entitlements.canUse("police_forms") && (
                    <TravelerLinkDialog
                      reservationId={reservation.id}
                      reservationReference={reservation.reference}
                      principalGuest={reservation.client_name}
                      registrationStatus={travelerRegistration?.status}
                    />
                  )}
                  {entitlements.canUse("invoices") && (invoice ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      <Link href={`/factures/${invoice.id}`}>
                        <FileTextIcon className="size-4 mr-1" />
                        Voir la facture
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      onClick={() => handleCreateInvoice(reservation.id)}
                      disabled={loadingReservationId === reservation.id}
                    >
                      <FileTextIcon className="size-4 mr-1" />
                      {loadingReservationId === reservation.id ? "Création..." : "Facturer"}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) setCurrentPage(currentPage - 1)
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(page)
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }
                return null
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
