"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, FilePlus2Icon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

type ReservationOption = {
  id: string;
  reference: string;
  client_name: string;
  total_amount: number;
  check_in: string;
  check_out: string;
  apartment: { name: string } | null;
};

export function NewInvoiceForm({
  reservations,
  defaultTaxRate,
  paymentTermsDays,
}: {
  reservations: ReservationOption[];
  defaultTaxRate: number;
  paymentTermsDays: number;
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const today = new Date().toISOString().slice(0, 10);
  const [reservationId, setReservationId] = useState(reservations[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, paymentTermsDays));
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(
    () => reservations.find((item) => item.id === reservationId),
    [reservationId, reservations],
  );

  const create = async () => {
    if (!reservationId) {
      setError("Sélectionnez une réservation.");
      return;
    }
    if (dueDate < issueDate) {
      setError("L’échéance doit être postérieure à la date d’émission.");
      return;
    }
    const rate = Number(taxRate.replace(",", "."));
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError("Le taux de taxe doit être compris entre 0 et 100.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc(
      "create_invoice_from_reservation",
      {
        p_reservation_id: reservationId,
        p_issue_date: issueDate,
        p_due_date: dueDate,
        p_tax_rate: rate,
        p_notes: notes || null,
      },
    );
    setSaving(false);
    if (rpcError || !data) {
      setError(
        rpcError?.message.includes("invoices")
          ? "Installez la migration 37 dans Supabase."
          : (rpcError?.message ?? "Impossible de créer la facture."),
      );
      return;
    }
    router.push(`/factures/${data}`);
    router.refresh();
  };

  if (reservations.length === 0)
    return (
      <Alert>
        <AlertCircleIcon className="size-4" />
        <AlertDescription>
          Toutes les réservations actives possèdent déjà une facture, ou aucune
          réservation n’est disponible.
        </AlertDescription>
      </Alert>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Informations de facturation</CardTitle>
          <CardDescription>
            La facture reprendra automatiquement le client, le séjour et le
            montant de la réservation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field label="Réservation *">
            <Select value={reservationId} onValueChange={setReservationId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((reservation) => (
                  <SelectItem key={reservation.id} value={reservation.id}>
                    {reservation.reference} · {reservation.client_name} ·{" "}
                    {reservation.apartment?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date d’émission">
              <Input
                type="date"
                value={issueDate}
                onChange={(event) => {
                  setIssueDate(event.target.value);
                  setDueDate(addDays(event.target.value, paymentTermsDays));
                }}
              />
            </Field>
            <Field label="Échéance">
              <Input
                type="date"
                min={issueDate}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
            <Field label="Taxe (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(event) => setTaxRate(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes visibles sur la facture">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <Button size="lg" disabled={saving} onClick={() => void create()}>
            <FilePlus2Icon className="size-4" />{" "}
            {saving ? "Création…" : "Créer la facture"}
          </Button>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Aperçu de la réservation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Preview label="Client" value={selected?.client_name ?? "—"} />
          <Preview
            label="Appartement"
            value={selected?.apartment?.name ?? "—"}
          />
          <Preview
            label="Séjour"
            value={
              selected
                ? `${formatDate(selected.check_in)} → ${formatDate(selected.check_out)}`
                : "—"
            }
          />
          <Preview
            label="Montant hors taxe"
            value={
              selected ? `${Number(selected.total_amount).toFixed(2)} DH` : "—"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-3 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}
function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
