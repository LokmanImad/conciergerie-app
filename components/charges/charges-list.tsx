"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditChargeDialog } from "./edit-charge-dialog";
import { DeleteChargeDialog } from "./delete-charge-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  ReceiptIcon,
  BuildingIcon,
  CalendarIcon,
  CoinsIcon,
  UserIcon,
  CheckCircleIcon,
  FileTextIcon,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

type Charge = {
  id: string;
  apartment_id: string | null;
  service_type_id: string;
  amount: number;
  date: string;
  description: string | null;
  paid_by_person: string;
  payment_method?: string;
  notes: string | null;
  reservation_id: string | null;
  is_paid?: boolean;
  is_invoiced?: boolean;
  billable_to_owner?: boolean;
  apartment: { name: string } | null;
  service_type: { name: string; paid_by: string } | null;
  reservation?: {
    id: string;
    client_name: string;
    check_in: string;
    check_out: string;
  } | null;
};

type Apartment = { id: string; name: string };
type ServiceType = {
  id: string;
  name: string;
  paid_by: string;
  description: string | null;
};
type Reservation = {
  id: string;
  apartment_id: string;
  client_name: string;
  check_in: string;
  check_out: string;
  total_amount: number;
};

export function ChargesList({
  charges,
  apartments,
  serviceTypes,
  reservations,
}: {
  charges: Charge[];
  apartments: Apartment[];
  serviceTypes: ServiceType[];
  reservations: Reservation[];
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [filterApartment, setFilterApartment] = useState<string>("all");
  const [filterPaidBy, setFilterPaidBy] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [filterServiceType, setFilterServiceType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loadingChargeId, setLoadingChargeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  const handleMarkAsPaid = async (chargeId: string) => {
    setLoadingChargeId(chargeId);
    const { error } = await supabase.rpc("mark_charge_as_paid", {
      charge_id: chargeId,
    });
    if (error) {
      alert(`Erreur: ${error.message || "Impossible de marquer comme payé"}`);
    } else {
      router.refresh();
    }
    setLoadingChargeId(null);
  };

  const handleMarkAsInvoiced = async (chargeId: string) => {
    setLoadingChargeId(chargeId);
    const { error } = await supabase.rpc("mark_charge_as_invoiced", {
      charge_id: chargeId,
    });
    if (error) {
      alert(
        `Erreur: ${error.message || "Impossible de marquer comme facturé"}`,
      );
    } else {
      router.refresh();
    }
    setLoadingChargeId(null);
  };

  const filteredCharges = charges.filter((charge) => {
    if (filterApartment === "none" && charge.apartment_id !== null)
      return false;
    if (
      filterApartment !== "all" &&
      filterApartment !== "none" &&
      charge.apartment_id !== filterApartment
    )
      return false;
    if (filterPaidBy !== "all" && charge.paid_by_person !== filterPaidBy)
      return false;
    if (filterPaymentMethod !== "all") {
      const paymentMethod = charge.payment_method || "bank";
      if (filterPaymentMethod !== paymentMethod) return false;
    }
    if (
      filterServiceType !== "all" &&
      charge.service_type_id !== filterServiceType
    )
      return false;
    if (startDate && new Date(charge.date) < new Date(startDate)) return false;
    if (endDate && new Date(charge.date) > new Date(endDate)) return false;
    return true;
  });

  const totalAmount = filteredCharges.reduce(
    (sum, charge) => sum + Number(charge.amount),
    0,
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredCharges.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCharges = filteredCharges.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterApartment,
    filterPaidBy,
    filterPaymentMethod,
    filterServiceType,
    startDate,
    endDate,
  ]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (charges.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ReceiptIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">
            Aucune charge pour le moment
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour ajouter votre première charge
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPersonBadge = (person: string) => {
    if (person === "imad")
      return { label: "Imad", variant: "default" as const };
    if (person === "jassem")
      return { label: "Jassem", variant: "secondary" as const };
    return { label: "Société", variant: "outline" as const };
  };

  const getPayerBadge = (paidBy: string) => {
    if (paidBy === "company")
      return { label: "Société", variant: "outline" as const };
    return { label: "Propriétaire", variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Filtrez les charges par appartement, type de service, payeur, mode
            de paiement ou date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filterApartment}
                onValueChange={setFilterApartment}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les appartements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les appartements</SelectItem>
                  <SelectItem value="none">
                    Charges société (sans appartement)
                  </SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filterServiceType}
                onValueChange={setFilterServiceType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type de service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
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
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filterPaymentMethod}
                onValueChange={setFilterPaymentMethod}
              >
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
              <p className="text-lg font-bold text-primary">
                {totalAmount.toFixed(2)} DH
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="items-per-page"
                className="text-sm whitespace-nowrap"
              >
                Éléments par page:
              </Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
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
              Affichage {startIndex + 1}-
              {Math.min(endIndex, filteredCharges.length)} sur{" "}
              {filteredCharges.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {paginatedCharges.map((charge) => {
          const personBadge = getPersonBadge(charge.paid_by_person);
          const payerBadge = charge.service_type
            ? getPayerBadge(charge.service_type.paid_by)
            : null;

          return (
            <Card
              key={charge.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptIcon className="size-5 text-primary shrink-0" />
                      <span className="truncate">
                        {charge.service_type?.name || "Service inconnu"}
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <BuildingIcon className="size-4 shrink-0" />
                      <span className="truncate">
                        {charge.apartment
                          ? charge.apartment.name
                          : "Charge société (sans appartement)"}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">
                      {Number(charge.amount).toFixed(2)} DH
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="size-4" />
                  <span>
                    {format(new Date(charge.date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                {charge.reservation && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                    <UserIcon className="size-4" />
                    <span>
                      Liée à réservation: {charge.reservation.client_name} (
                      {format(
                        new Date(charge.reservation.check_in),
                        "d MMM yyyy",
                        { locale: fr },
                      )}
                      )
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={personBadge.variant}
                    className="flex items-center gap-1.5"
                  >
                    <UserIcon className="size-3.5" />
                    Payé par: {personBadge.label}
                  </Badge>
                  {payerBadge && (
                    <Badge
                      variant={payerBadge.variant}
                      className="flex items-center gap-1.5"
                    >
                      À charge de: {payerBadge.label}
                    </Badge>
                  )}
                  {charge.payment_method && (
                    <Badge
                      variant={
                        charge.payment_method === "cash"
                          ? "destructive"
                          : "default"
                      }
                      className="flex items-center gap-1.5"
                    >
                      {charge.payment_method === "cash" ? "Espèces" : "Banque"}
                    </Badge>
                  )}
                  {charge.billable_to_owner && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1.5"
                    >
                      Refacturable au propriétaire
                    </Badge>
                  )}
                  {charge.is_paid && (
                    <Badge
                      variant="default"
                      className="flex items-center gap-1.5 bg-green-600"
                    >
                      <CheckCircleIcon className="size-3.5" />
                      Payé
                    </Badge>
                  )}
                  {charge.is_invoiced && (
                    <Badge
                      variant="default"
                      className="flex items-center gap-1.5 bg-blue-600"
                    >
                      <FileTextIcon className="size-3.5" />
                      Facturé
                    </Badge>
                  )}
                </div>
                {charge.description && (
                  <p className="text-pretty text-sm text-muted-foreground border-t pt-3">
                    {charge.description}
                  </p>
                )}
                {charge.notes && (
                  <p className="text-pretty text-sm text-muted-foreground italic">
                    {charge.notes}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <EditChargeDialog
                    charge={charge}
                    apartments={apartments}
                    serviceTypes={serviceTypes}
                    reservations={reservations}
                  />
                  <DeleteChargeDialog chargeId={charge.id} />
                  {!charge.is_paid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      onClick={() => handleMarkAsPaid(charge.id)}
                      disabled={loadingChargeId === charge.id}
                    >
                      <CheckCircleIcon className="size-4 mr-1" />
                      {loadingChargeId === charge.id ? "..." : "Payer"}
                    </Button>
                  )}
                  {!charge.is_invoiced && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      onClick={() => handleMarkAsInvoiced(charge.id)}
                      disabled={loadingChargeId === charge.id}
                    >
                      <FileTextIcon className="size-4 mr-1" />
                      {loadingChargeId === charge.id ? "..." : "Facturer"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
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
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
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
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                },
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      setCurrentPage(currentPage + 1);
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
