import Link from "next/link";
import { EyeIcon, ReceiptTextIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ownerInvoiceStatusLabels,
  type OwnerInvoice,
  type OwnerInvoiceStatus,
} from "@/features/owner-invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
const month = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function OwnerInvoicesPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_invoices")
    .select("*, apartment:apartments(name, address)")
    .order("period_start", { ascending: false });
  const invoices = (data ?? []).map((item) => ({
    ...item,
    apartment: firstRelation(item.apartment),
  })) as OwnerInvoice[];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Comptes propriétaires"
        title="Factures propriétaires"
        description="Factures mensuelles de commission et de charges déduites avant chaque versement."
      />
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Exécutez la migration 38 dans Supabase pour activer les factures
          propriétaires.
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ReceiptTextIcon className="mb-4 size-10 text-muted-foreground" />
            <p className="font-semibold">Aucune facture propriétaire</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Générez-la depuis la page Paiements aux propriétaires.
            </p>
            <Button className="mt-5" asChild>
              <Link href="/proprietaires">Préparer un mois</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.apartment?.name} · {invoice.owner_name}
                    </p>
                  </div>
                  <Status status={invoice.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <Value
                    label="Période"
                    value={month.format(
                      new Date(`${invoice.period_start}T12:00:00`),
                    )}
                  />
                  <Value
                    label="Facture"
                    value={money.format(Number(invoice.total_amount))}
                  />
                  <Value
                    label="Net à verser"
                    value={money.format(Number(invoice.net_payout))}
                  />
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/proprietaires/factures/${invoice.id}`}>
                    <EyeIcon className="size-4" /> Consulter
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Status({ status }: { status: OwnerInvoiceStatus }) {
  return (
    <Badge
      variant={
        status === "cancelled"
          ? "destructive"
          : status === "settled"
            ? "default"
            : "secondary"
      }
    >
      {ownerInvoiceStatusLabels[status]}
    </Badge>
  );
}
function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}
