"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";
import { PlusIcon } from "lucide-react";

type Apartment = { id: string; name: string };
type ServiceType = { id: string; name: string; paid_by: string };
type Reservation = {
  id: string;
  apartment_id: string;
  client_name: string;
  check_in: string;
  check_out: string;
  total_amount: number;
};

export function AddChargeDialog({
  apartments,
  serviceTypes,
  reservations,
}: {
  apartments: Apartment[];
  serviceTypes: ServiceType[];
  reservations: Reservation[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();

  const [formData, setFormData] = useState({
    apartment_id: "",
    service_type_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    paid_by_person: "company",
    payment_method: "bank",
    notes: "",
    reservation_id: "",
    billable_to_owner: false,
  });

  // Vérifier si le type de service sélectionné est "Ménage"
  const selectedServiceType = serviceTypes.find(
    (st) => st.id === formData.service_type_id,
  );
  const isCleaningService =
    selectedServiceType?.name?.toLowerCase().includes("ménage") ||
    selectedServiceType?.name?.toLowerCase().includes("menage");

  // Filtrer les réservations par appartement si un appartement est sélectionné
  const filteredReservations =
    formData.apartment_id && isCleaningService
      ? reservations.filter(
          (reservation) => reservation.apartment_id === formData.apartment_id,
        )
      : reservations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ajouter à la charge
    const { error: chargeError } = await supabase.from("charges").insert([
      {
        apartment_id: formData.apartment_id || null,
        service_type_id: formData.service_type_id,
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || null,
        paid_by_person: formData.paid_by_person,
        payment_method: formData.payment_method,
        notes: formData.notes || null,
        reservation_id:
          formData.reservation_id === "none" || formData.reservation_id === ""
            ? null
            : formData.reservation_id,
        billable_to_owner: formData.billable_to_owner,
      },
    ]);

    if (chargeError) {
      alert(
        chargeError.message.includes("billable_to_owner")
          ? "Exécutez la migration 38 dans Supabase avant d’ajouter cette charge."
          : "Erreur lors de l'ajout de la charge",
      );
      setLoading(false);
      return;
    }

    // Le solde du portefeuille est maintenant calculé dynamiquement à partir des charges
    // Plus besoin de mettre à jour manuellement le wallet

    setOpen(false);
    setFormData({
      apartment_id: "",
      service_type_id: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      paid_by_person: "company",
      payment_method: "bank",
      notes: "",
      reservation_id: "",
      billable_to_owner: false,
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Ajouter une charge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une charge</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle charge (appartement ou société)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="apartment_id">Appartement</Label>
              <Select
                value={formData.apartment_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    apartment_id: value === "none" ? "" : value,
                    reservation_id: "",
                    billable_to_owner:
                      value === "none" ? false : formData.billable_to_owner,
                  })
                }
              >
                <SelectTrigger id="apartment_id" className="w-full">
                  <SelectValue placeholder="Sélectionner un appartement (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Aucun appartement (Charge société)
                  </SelectItem>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type_id">Type de service *</Label>
              <Select
                value={formData.service_type_id}
                onValueChange={(value) => {
                  const service = serviceTypes.find(
                    (item) => item.id === value,
                  );
                  const name = service?.name.toLocaleLowerCase("fr") ?? "";
                  const cleaning = [
                    "ménage",
                    "menage",
                    "cleaning",
                    "nettoyage",
                  ].some((term) => name.includes(term));
                  setFormData({
                    ...formData,
                    service_type_id: value,
                    reservation_id: "",
                    billable_to_owner: Boolean(
                      formData.apartment_id &&
                      (service?.paid_by === "owner" || cleaning),
                    ),
                  });
                }}
              >
                <SelectTrigger id="service_type_id" className="w-full">
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} (
                      {service.paid_by === "company"
                        ? "Société"
                        : "Propriétaire"}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCleaningService && (
              <div className="space-y-2">
                <Label htmlFor="reservation_id">
                  Réservation associée (optionnel)
                </Label>
                <Select
                  value={formData.reservation_id || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      reservation_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger id="reservation_id" className="w-full">
                    <SelectValue placeholder="Sélectionner une réservation (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune réservation</SelectItem>
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((reservation) => (
                        <SelectItem key={reservation.id} value={reservation.id}>
                          {reservation.client_name} -{" "}
                          {new Date(reservation.check_in).toLocaleDateString(
                            "fr-FR",
                          )}{" "}
                          ({reservation.total_amount} DH)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {formData.apartment_id
                          ? "Aucune réservation pour cet appartement"
                          : "Aucune réservation disponible"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si sélectionné, ces frais de ménage seront déduits du calcul
                  de commission de cette réservation
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (DH) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_by_person">Qui a payé? *</Label>
              <Select
                value={formData.paid_by_person}
                onValueChange={(value) =>
                  setFormData({ ...formData, paid_by_person: value })
                }
              >
                <SelectTrigger id="paid_by_person" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imad">Imad</SelectItem>
                  <SelectItem value="jassem">Jassem</SelectItem>
                  <SelectItem value="company">Société</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Mode de paiement *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger id="payment_method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banque</SelectItem>
                  <SelectItem value="cash">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <Label htmlFor="billable_to_owner">
                  Refacturer au propriétaire
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cette charge figurera sur sa facture et sera déduite de son
                  versement.
                </p>
              </div>
              <Switch
                id="billable_to_owner"
                checked={formData.billable_to_owner}
                disabled={!formData.apartment_id}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, billable_to_owner: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Détails de la charge..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes supplémentaires..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
