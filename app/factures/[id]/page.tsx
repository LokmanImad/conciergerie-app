import Link from "next/link";
import { notFound } from "next/navigation";
import { PrinterIcon } from "lucide-react";

import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoiceStatusBadge } from "@/components/invoices/invoices-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  effectiveInvoiceStatus,
  type Invoice,
} from "@/features/invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "*, apartment:apartments(name), reservation:reservations(reference, check_in, check_out), invoice_items(*)",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const invoice = {
    ...data,
    apartment: firstRelation(data.apartment),
    reservation: firstRelation(data.reservation),
    invoice_items: (data.invoice_items ?? []).sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position,
    ),
  } as Invoice;
  const balance = Math.max(
    Number(invoice.total_amount) - Number(invoice.amount_paid),
    0,
  );
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={invoice.invoice_number}
        title={`Facture de ${invoice.client_name}`}
        description={`${invoice.reservation?.reference ?? "Facture directe"} · ${invoice.apartment?.name ?? "Sans appartement"}`}
        actions={
          <Button asChild>
            <Link href={`/factures/${id}/impression`}>
              <PrinterIcon className="size-4" /> PDF / Imprimer
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Détail</CardTitle>
              <InvoiceStatusBadge status={effectiveInvoiceStatus(invoice)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Amount
                label="Total"
                value={money.format(Number(invoice.total_amount))}
              />
              <Amount
                label="Déjà payé"
                value={money.format(Number(invoice.amount_paid))}
              />
              <Amount
                label="Reste à payer"
                value={money.format(balance)}
                emphasis
              />
            </div>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Quantité</th>
                    <th className="p-3 text-right">Prix</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items?.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-right">
                        {Number(item.quantity).toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        {money.format(Number(item.unit_price))}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {money.format(
                          Number(item.quantity) * Number(item.unit_price),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invoice.notes && (
              <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
                {invoice.notes}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              <Info
                label="Date d’émission"
                value={formatDate(invoice.issue_date)}
              />
              <Info label="Échéance" value={formatDate(invoice.due_date)} />
              <Info
                label="Taxe"
                value={`${Number(invoice.tax_rate).toFixed(2)} %`}
              />
              <Info
                label="Paiement"
                value={
                  invoice.payment_method === "cash"
                    ? "Espèces"
                    : invoice.payment_method === "bank"
                      ? "Banque"
                      : "Non renseigné"
                }
              />
            </CardContent>
          </Card>
          <InvoiceActions invoice={invoice} />
        </div>
      </div>
    </div>
  );
}

function Amount({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${emphasis ? "bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${emphasis ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
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
