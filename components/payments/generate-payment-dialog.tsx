"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalculatorIcon } from "lucide-react";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function GeneratePaymentDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatedProfit, setCalculatedProfit] = useState<number | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();

  const calculateProfit = async (startDate: string, endDate: string) => {
    setCalculating(true);
    setAlreadyPaid(false);
    try {
      const { data: existingPayments } = await supabase
        .from("profit_payments")
        .select("*")
        .eq("period_start", startDate)
        .eq("period_end", endDate);

      if (existingPayments && existingPayments.length > 0) {
        setAlreadyPaid(true);
        setCalculatedProfit(0);
        setCalculating(false);
        return;
      }

      const { data: allPayments } = await supabase
        .from("profit_payments")
        .select("period_start, period_end");

      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select(
          "*, apartment:apartments(commission_rate, default_cleaning_fee)",
        )
        .or(`check_in.gte.${startDate},check_out.lte.${endDate}`);

      const { data: charges } = await supabase
        .from("charges")
        .select("*, service_type:service_types(paid_by, name)")
        .is("cancelled_at", null)
        .gte("date", startDate)
        .lte("date", endDate);

      let totalCommission = 0;
      if (reservations) {
        const unpaidReservations = reservations.filter((reservation: any) => {
          if (!allPayments) return true;

          return !allPayments.some((payment: any) => {
            const checkIn = new Date(reservation.check_in);
            const paymentStart = new Date(payment.period_start);
            const paymentEnd = new Date(payment.period_end);
            return checkIn >= paymentStart && checkIn <= paymentEnd;
          });
        });

        unpaidReservations.forEach((reservation: any) => {
          // Calculer les frais de ménage UNIQUEMENT depuis les charges liées à cette réservation
          let cleaningFees = 0;

          // Ajouter les frais de ménage depuis les charges liées à cette réservation
          if (charges) {
            const reservationCharges = charges.filter((charge: any) => {
              if (
                charge.reservation_id !== reservation.id ||
                charge.billable_to_owner === false
              )
                return false;
              // Identifier les frais de ménage par le nom du service_type
              const serviceName =
                charge.service_type?.name?.toLowerCase() || "";
              const cleaningFeeServiceNames = [
                "ménage",
                "menage",
                "cleaning",
                "nettoyage",
                "frais de ménage",
              ];
              return cleaningFeeServiceNames.some((name) =>
                serviceName.includes(name),
              );
            });

            reservationCharges.forEach((charge: any) => {
              cleaningFees += Number(charge.amount) || 0;
            });
          }

          // Calculer le montant après déduction des frais de ménage
          const amountAfterCleaning =
            Number(reservation.total_amount) - cleaningFees;

          // Calculer la commission sur le montant après déduction
          // Toujours utiliser le commission_rate de l'appartement (pas celui de la réservation)
          const commissionRate = reservation.apartment?.commission_rate || 25;
          const commission = (amountAfterCleaning * commissionRate) / 100;
          totalCommission += commission;
        });
      }

      let totalCharges = 0;
      if (charges) {
        const societyCharges = charges.filter(
          (charge: any) =>
            charge.service_type?.paid_by === "company" ||
            charge.service_type?.paid_by === "Société",
        );

        societyCharges.forEach((charge: any) => {
          totalCharges += Number(charge.amount);
        });
      }

      const profit = totalCommission - totalCharges;
      setCalculatedProfit(profit);
    } catch (error) {
      alert("Erreur lors du calcul");
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const totalProfit = calculatedProfit || 0;
    const imadShare = totalProfit / 2;
    const jassemShare = totalProfit / 2;

    try {
      await supabase.from("profit_payments").insert({
        period_start: formData.get("period_start"),
        period_end: formData.get("period_end"),
        total_profit: totalProfit,
        imad_share: imadShare,
        jassem_share: jassemShare,
        notes: formData.get("notes") || null,
      });

      setOpen(false);
      setCalculatedProfit(null);
      setAlreadyPaid(false);
      router.refresh();
    } catch (error) {
      alert("Erreur lors de l'ajout du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalculatorIcon className="mr-2 size-4" />
          Générer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Générer un paiement de bénéfices</DialogTitle>
          <DialogDescription>
            Le bénéfice sera calculé automatiquement à partir des réservations
            et charges de la période
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period_start">Date début</Label>
              <Input
                type="date"
                id="period_start"
                name="period_start"
                required
                className="mt-2"
                onChange={(e) => {
                  const endDate = (
                    document.getElementById("period_end") as HTMLInputElement
                  )?.value;
                  if (endDate) {
                    calculateProfit(e.target.value, endDate);
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="period_end">Date fin</Label>
              <Input
                type="date"
                id="period_end"
                name="period_end"
                required
                className="mt-2"
                onChange={(e) => {
                  const startDate = (
                    document.getElementById("period_start") as HTMLInputElement
                  )?.value;
                  if (startDate) {
                    calculateProfit(startDate, e.target.value);
                  }
                }}
              />
            </div>
          </div>

          {calculating && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">
                Calcul en cours...
              </p>
            </div>
          )}

          {alreadyPaid && (
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <p className="text-sm font-semibold text-orange-700 mb-1">
                ⚠️ Période déjà payée
              </p>
              <p className="text-xs text-orange-600">
                Un paiement existe déjà pour cette période. Les bénéfices de
                cette période ont déjà été distribués.
              </p>
            </div>
          )}

          {calculatedProfit !== null && !calculating && !alreadyPaid && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">
                Bénéfice calculé pour la période
              </p>
              <p className="text-2xl font-bold text-primary">
                {calculatedProfit.toFixed(2)} DH
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-primary/20">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Part Imad (50%)
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    {(calculatedProfit / 2).toFixed(2)} DH
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Part Jassem (50%)
                  </p>
                  <p className="text-lg font-semibold text-purple-600">
                    {(calculatedProfit / 2).toFixed(2)} DH
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Notes ou commentaires..."
              className="mt-2"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || calculatedProfit === null || alreadyPaid}
              className="flex-1"
            >
              {loading ? "Création..." : "Créer le paiement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
