import Link from "next/link";
import { notFound } from "next/navigation";
import { PrinterIcon } from "lucide-react";

import { OwnerInvoiceActions } from "@/components/owners/owner-invoice-actions";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ownerInvoiceStatusLabels,
  type OwnerInvoice,
} from "@/features/owner-invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function OwnerInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("owner_invoices")
    .select(
      "*, apartment:apartments(name, address), items:owner_invoice_items(*)",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const invoice = {
    ...data,
    apartment: firstRelation(data.apartment),
    items: (data.items ?? []).sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position,
    ),
  } as OwnerInvoice;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Facture propriétaire"
        title={invoice.invoice_number}
        description={`${invoice.apartment?.name} · ${invoice.owner_name}`}
        actions={
          <>
            <Badge
              variant={
                invoice.status === "cancelled" ? "destructive" : "secondary"
              }
            >
              {ownerInvoiceStatusLabels[invoice.status]}
            </Badge>
            <Button variant="outline" asChild>
              <Link href={`/proprietaires/factures/${id}/impression`}>
                <PrinterIcon className="size-4" /> Imprimer / PDF
              </Link>
            </Button>
          </>
        }
      />
      <OwnerInvoiceActions id={invoice.id} status={invoice.status} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenus bruts" value={invoice.gross_revenue} />
        <Metric label="Commission" value={invoice.commission_amount} />
        <Metric
          label="Charges refacturées"
          value={invoice.rebillable_charges}
        />
        <Metric label="Net à verser" value={invoice.net_payout} strong />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Détail facturé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoice.items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-5 border-b pb-3 last:border-0"
            >
              <span className="text-sm">{item.description}</span>
              <strong>{money.format(Number(item.amount))}</strong>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-2 text-xl font-bold ${strong ? "text-primary" : ""}`}>
          {money.format(Number(value))}
        </p>
      </CardContent>
    </Card>
  );
}
