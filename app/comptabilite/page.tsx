import {
  BanknoteIcon,
  Building2Icon,
  CircleDollarSignIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const selected =
    (await searchParams).month ?? new Date().toISOString().slice(0, 7);
  const [year, month] = selected.split("-").map(Number);
  const start = `${selected}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const supabase = await getSupabaseServerClient();
  const [
    { data: reservationData },
    { data: chargeData },
    { data: invoiceData },
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, apartment_id, total_amount, amount_paid, payment_method, apartment:apartments(name, commission_rate)",
      )
      .gte("check_in", start)
      .lte("check_in", end)
      .neq("booking_status", "cancelled"),
    supabase
      .from("charges")
      .select(
        "id, apartment_id, reservation_id, amount, date, payment_method, billable_to_owner, service_type:service_types(name, paid_by)",
      )
      .is("cancelled_at", null),
    supabase
      .from("invoices")
      .select("id, status, total_amount, amount_paid, issue_date")
      .gte("issue_date", start)
      .lte("issue_date", end)
      .neq("status", "cancelled"),
  ]);
  const reservations = (reservationData ?? []).map((item) => ({
    ...item,
    apartment: firstRelation(item.apartment),
  }));
  const charges = (chargeData ?? []).map((item) => ({
    ...item,
    service_type: firstRelation(item.service_type),
  }));
  const periodCharges = charges.filter(
    (charge) => charge.date >= start && charge.date <= end,
  );
  const revenue = reservations.reduce(
    (sum, item) => sum + Number(item.total_amount),
    0,
  );
  const collected = reservations.reduce(
    (sum, item) => sum + Number(item.amount_paid),
    0,
  );
  const outstanding = Math.max(revenue - collected, 0);
  const bankCollected = reservations
    .filter((item) => (item.payment_method ?? "bank") === "bank")
    .reduce((sum, item) => sum + Number(item.amount_paid), 0);
  const cashCollected = collected - bankCollected;
  const companyCharges = periodCharges
    .filter(
      (item) =>
        item.service_type?.paid_by === "company" ||
        !item.apartment_id ||
        !item.billable_to_owner,
    )
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const ownerCharges = periodCharges
    .filter(
      (item) =>
        item.service_type?.paid_by === "owner" && item.billable_to_owner,
    )
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const commission = reservations.reduce((sum, reservation) => {
    const cleaning = charges
      .filter(
        (charge) =>
          charge.reservation_id === reservation.id &&
          charge.billable_to_owner &&
          isCleaning(charge.service_type?.name),
      )
      .reduce((total, charge) => total + Number(charge.amount), 0);
    return (
      sum +
      (Math.max(Number(reservation.total_amount) - cleaning, 0) *
        Number(reservation.apartment?.commission_rate ?? 25)) /
        100
    );
  }, 0);
  const netProfit = commission - companyCharges;
  const invoices = invoiceData ?? [];
  const invoiced = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount),
    0,
  );
  const invoiceBalance = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(Number(invoice.total_amount) - Number(invoice.amount_paid), 0),
    0,
  );
  const byApartment = new Map<
    string,
    {
      name: string;
      revenue: number;
      collected: number;
      charges: number;
      commission: number;
    }
  >();
  reservations.forEach((reservation) => {
    const key = reservation.apartment_id;
    const current = byApartment.get(key) ?? {
      name: reservation.apartment?.name ?? "Appartement",
      revenue: 0,
      collected: 0,
      charges: 0,
      commission: 0,
    };
    const cleaning = charges
      .filter(
        (charge) =>
          charge.reservation_id === reservation.id &&
          charge.billable_to_owner &&
          isCleaning(charge.service_type?.name),
      )
      .reduce((total, charge) => total + Number(charge.amount), 0);
    current.revenue += Number(reservation.total_amount);
    current.collected += Number(reservation.amount_paid);
    current.commission +=
      (Math.max(Number(reservation.total_amount) - cleaning, 0) *
        Number(reservation.apartment?.commission_rate ?? 25)) /
      100;
    byApartment.set(key, current);
  });
  periodCharges.forEach((charge) => {
    if (!charge.apartment_id || !charge.billable_to_owner) return;
    const current = byApartment.get(charge.apartment_id);
    if (current) current.charges += Number(charge.amount);
  });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Pilotage financier"
        title="Comptabilité"
        description="Revenus, encaissements, dépenses, commissions et facturation regroupés par mois."
        actions={
          <form className="flex items-center gap-2">
            <Input
              name="month"
              type="month"
              defaultValue={selected}
              className="w-44"
            />
            <Button type="submit">Afficher</Button>
          </form>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={TrendingUpIcon}
          label="Chiffre d’affaires"
          value={revenue}
        />
        <Metric icon={BanknoteIcon} label="Encaissé" value={collected} />
        <Metric
          icon={WalletCardsIcon}
          label="À encaisser"
          value={outstanding}
          tone="warning"
        />
        <Metric
          icon={CircleDollarSignIcon}
          label="Bénéfice net estimé"
          value={netProfit}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={LandmarkIcon} label="Commission" value={commission} />
        <Metric
          icon={TrendingDownIcon}
          label="Charges société"
          value={companyCharges}
          tone="danger"
        />
        <Metric
          icon={Building2Icon}
          label="Charges propriétaires"
          value={ownerCharges}
        />
        <Metric icon={ReceiptTextIcon} label="Facturé" value={invoiced} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Encaissements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Split label="Banque" value={bankCollected} />
            <Split label="Espèces" value={cashCollected} />
            <Split
              label="Factures restant à payer"
              value={invoiceBalance}
              danger
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Résultat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Split label="Commission brute" value={commission} />
            <Split
              label="Moins charges société"
              value={-companyCharges}
              danger
            />
            <Split label="Résultat net" value={netProfit} strong />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Performance par appartement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-3">Appartement</th>
                  <th className="py-3 text-right">Revenus</th>
                  <th className="py-3 text-right">Encaissé</th>
                  <th className="py-3 text-right">Charges</th>
                  <th className="py-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byApartment.entries()).map(([id, row]) => (
                  <tr key={id} className="border-b last:border-0">
                    <td className="py-4 font-medium">{row.name}</td>
                    <td className="py-4 text-right">
                      {money.format(row.revenue)}
                    </td>
                    <td className="py-4 text-right">
                      {money.format(row.collected)}
                    </td>
                    <td className="py-4 text-right">
                      {money.format(row.charges)}
                    </td>
                    <td className="py-4 text-right font-semibold text-primary">
                      {money.format(row.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {byApartment.size === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune opération pour cette période.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function isCleaning(name?: string) {
  const value = name?.toLocaleLowerCase("fr") ?? "";
  return ["ménage", "menage", "cleaning", "nettoyage"].some((term) =>
    value.includes(term),
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUpIcon;
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-rose-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "success"
          ? "text-emerald-700"
          : "text-primary";
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-2 text-xl font-bold ${color}`}>
            {money.format(value)}
          </p>
        </div>
        <div
          className={`flex size-11 items-center justify-center rounded-xl bg-muted ${color}`}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
function Split({
  label,
  value,
  danger,
  strong,
}: {
  label: string;
  value: number;
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b pb-3 last:border-0 ${strong ? "text-lg font-bold" : "text-sm"}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={danger ? "font-semibold text-rose-700" : "font-semibold"}
      >
        {money.format(value)}
      </span>
    </div>
  );
}
