"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BuildingIcon, CoinsIcon, PrinterIcon, WalletIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { GenerateOwnerInvoiceButton } from "@/components/owners/generate-owner-invoice-button";

type Apartment = {
  id: string;
  name: string;
  owner_name: string;
  commission_rate: number;
  default_cleaning_fee?: number | null;
};

type Reservation = {
  id: string;
  apartment_id: string;
  total_amount: number;
  cleaning_fee?: number | null;
  payment_method: string | null;
  check_in: string;
  check_out: string;
  apartment: {
    commission_rate: number;
    default_cleaning_fee?: number | null;
  } | null;
};

type Charge = {
  id: string;
  apartment_id: string | null;
  reservation_id: string | null;
  amount: number;
  payment_method: string | null;
  date: string;
  billable_to_owner: boolean;
  service_type: { id: string; name: string; paid_by: string } | null;
};

type ServiceType = {
  id: string;
  name: string;
  paid_by: string;
};

export function OwnerPaymentsList({
  apartments,
  reservations,
  charges,
  serviceTypes,
}: {
  apartments: Apartment[];
  reservations: Reservation[];
  charges: Charge[];
  serviceTypes: ServiceType[];
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthStart = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return startOfMonth(new Date(year, month - 1));
  }, [selectedMonth]);

  const monthEnd = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return endOfMonth(new Date(year, month - 1));
  }, [selectedMonth]);

  // Calculer les paiements par propriétaire
  const ownerPayments = useMemo(() => {
    const payments: Record<
      string,
      {
        apartment: Apartment;
        bank: {
          reservations: number;
          cleaningFees: number;
          charges: number;
          profit: number;
          total: number;
        };
        cash: {
          reservations: number;
          cleaningFees: number;
          charges: number;
          profit: number;
          total: number;
        };
      }
    > = {};

    apartments.forEach((apartment) => {
      // Filtrer les réservations du mois pour cet appartement (mois de la date d'arrivée uniquement)
      const monthReservations = reservations.filter((res) => {
        if (res.apartment_id !== apartment.id) return false;
        try {
          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const checkIn = new Date(res.check_in);
          if (isNaN(checkIn.getTime())) {
            return false;
          }
          checkIn.setHours(0, 0, 0, 0);

          const start = new Date(monthStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(monthEnd);
          end.setHours(23, 59, 59, 999);

          // Une réservation est incluse uniquement dans le mois de la date d'arrivée (check_in)
          return checkIn >= start && checkIn <= end;
        } catch (e) {
          return false;
        }
      });

      // Filtrer les charges du mois pour cet appartement (payées par le propriétaire)
      const monthCharges = charges.filter((charge) => {
        if (charge.apartment_id !== apartment.id) return false;
        if (!charge.billable_to_owner) return false;
        try {
          // Normaliser les dates pour la comparaison (ignorer l'heure)
          const chargeDate = new Date(charge.date);
          chargeDate.setHours(0, 0, 0, 0);
          const start = new Date(monthStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(monthEnd);
          end.setHours(23, 59, 59, 999);
          if (chargeDate < start || chargeDate > end) return false;
          // Inclure les charges payées par le propriétaire
          if (charge.service_type?.paid_by === "owner") return true;
          // Inclure les frais de ménage liés à une réservation
          if (
            charge.service_type?.name === "Frais de menage" &&
            charge.reservation_id
          )
            return true;
          return false;
        } catch (e) {
          return false;
        }
      });

      const commissionRate = apartment.commission_rate / 100;
      const defaultCleaningFee = apartment.default_cleaning_fee ?? 0;

      const bank = {
        reservations: 0,
        cleaningFees: 0,
        charges: 0,
        profit: 0,
        total: 0,
      };

      const cash = {
        reservations: 0,
        cleaningFees: 0,
        charges: 0,
        profit: 0,
        total: 0,
      };

      // Identifier les frais de ménage par le nom du service_type (chercher "ménage", "menage", "cleaning", etc.)
      const cleaningFeeServiceNames = [
        "ménage",
        "menage",
        "cleaning",
        "nettoyage",
        "frais de ménage",
      ];
      const isCleaningFee = (charge: Charge) => {
        const serviceName = charge.service_type?.name?.toLowerCase() || "";
        return cleaningFeeServiceNames.some((name) =>
          serviceName.includes(name),
        );
      };

      // D'abord, accumuler tous les revenus et frais de ménage par mode de paiement
      monthReservations.forEach((reservation) => {
        const paymentMethod = (
          reservation.payment_method || "bank"
        ).toLowerCase();

        // Ajouter les revenus selon le mode de paiement de la réservation
        if (paymentMethod === "cash") {
          cash.reservations += reservation.total_amount;
        } else {
          bank.reservations += reservation.total_amount;
        }

        // Trouver les charges liées à cette réservation (frais de ménage)
        const reservationCharges = charges.filter((charge) => {
          return (
            charge.reservation_id === reservation.id && charge.billable_to_owner
          );
        });

        // Ajouter les frais de ménage selon leur PROPRE mode de paiement (celui de la charge)
        reservationCharges.forEach((charge) => {
          if (isCleaningFee(charge)) {
            const chargePaymentMethod = (
              charge.payment_method || "bank"
            ).toLowerCase();

            // Les frais de ménage sont comptabilisés selon leur mode de paiement (charge.payment_method)
            if (chargePaymentMethod === "cash") {
              cash.cleaningFees += charge.amount;
            } else {
              bank.cleaningFees += charge.amount;
            }
          }
        });
      });

      // Calculer le bénéfice GLOBALEMENT par mode de paiement
      // Bénéfice = (Total revenus - Total frais de ménage) × pourcentage
      const bankAmountAfterCleaning = bank.reservations - bank.cleaningFees;
      bank.profit = bankAmountAfterCleaning * commissionRate;

      const cashAmountAfterCleaning = cash.reservations - cash.cleaningFees;
      cash.profit = cashAmountAfterCleaning * commissionRate;

      // Traiter les autres charges (non liées aux réservations, payées par le propriétaire)
      monthCharges.forEach((charge) => {
        // Ignorer les charges déjà traitées (liées aux réservations)
        if (charge.reservation_id) return;

        const paymentMethod = (charge.payment_method || "bank").toLowerCase();
        // C'est une charge propriétaire (non liée à une réservation)
        if (paymentMethod === "cash") {
          cash.charges += charge.amount;
        } else {
          bank.charges += charge.amount;
        }
      });

      // Calculer les totaux: Revenus - Frais ménage - Bénéfices - Charges
      bank.total =
        bank.reservations - bank.cleaningFees - bank.profit - bank.charges;
      cash.total =
        cash.reservations - cash.cleaningFees - cash.profit - cash.charges;

      payments[apartment.id] = {
        apartment,
        bank,
        cash,
      };
    });

    return payments;
  }, [apartments, reservations, charges, monthStart, monthEnd]);

  const totalBank = useMemo(() => {
    return Object.values(ownerPayments).reduce(
      (sum, p) => sum + p.bank.total,
      0,
    );
  }, [ownerPayments]);

  const totalCash = useMemo(() => {
    return Object.values(ownerPayments).reduce(
      (sum, p) => sum + p.cash.total,
      0,
    );
  }, [ownerPayments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez le mois à calculer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="month">Mois</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const value = `${year}-${month}`;
                  const label = format(
                    new Date(year, Number.parseInt(month) - 1),
                    "MMMM yyyy",
                    { locale: fr },
                  );
                  return (
                    <SelectItem key={value} value={value}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé global</CardTitle>
          <CardDescription>
            Total à donner aux propriétaires pour{" "}
            {format(monthStart, "MMMM yyyy", { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <WalletIcon className="size-5 text-green-600" />
                <span className="text-sm font-medium">En banque</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {totalBank.toFixed(2)} DH
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CoinsIcon className="size-5 text-orange-600" />
                <span className="text-sm font-medium">Espèces</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {totalCash.toFixed(2)} DH
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <BuildingIcon className="size-5" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold">
                {(totalBank + totalCash).toFixed(2)} DH
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.values(ownerPayments).map((payment) => (
          <Card key={payment.apartment.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{payment.apartment.name}</CardTitle>
                  <CardDescription>
                    Propriétaire: {payment.apartment.owner_name}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/proprietaires/releve/${payment.apartment.id}?month=${selectedMonth}`}
                    >
                      <PrinterIcon className="size-4" /> Relevé PDF
                    </Link>
                  </Button>
                  <GenerateOwnerInvoiceButton
                    apartmentId={payment.apartment.id}
                    month={selectedMonth}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-600">En banque</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Revenus bruts réservations:</span>
                      <span className="font-medium">
                        {payment.bank.reservations.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frais de ménage:</span>
                      <span className="font-medium">
                        -{payment.bank.cleaningFees.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Bénéfices (commission):</span>
                      <span className="font-medium">
                        -{payment.bank.profit.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Charges propriétaire:</span>
                      <span className="font-medium">
                        -{payment.bank.charges.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>Total à donner:</span>
                      <span className="text-green-600">
                        {payment.bank.total.toFixed(2)} DH
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-orange-600">Espèces</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Revenus bruts réservations:</span>
                      <span className="font-medium">
                        {payment.cash.reservations.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Frais de ménage:</span>
                      <span className="font-medium">
                        -{payment.cash.cleaningFees.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Bénéfices (commission):</span>
                      <span className="font-medium">
                        -{payment.cash.profit.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Charges propriétaire:</span>
                      <span className="font-medium">
                        -{payment.cash.charges.toFixed(2)} DH
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>Total à donner:</span>
                      <span className="text-orange-600">
                        {payment.cash.total.toFixed(2)} DH
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total général:</span>
                  <span className="text-2xl font-bold">
                    {(payment.bank.total + payment.cash.total).toFixed(2)} DH
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
