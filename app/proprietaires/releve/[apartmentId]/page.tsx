import { notFound } from "next/navigation";

import { PrintInvoiceButton } from "@/components/invoices/print-invoice-button";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function OwnerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ apartmentId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { apartmentId } = await params;
  const selected =
    (await searchParams).month ?? new Date().toISOString().slice(0, 7);
  const [year, month] = selected.split("-").map(Number);
  const start = `${selected}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const supabase = await getSupabaseServerClient();
  const [
    { data: apartment },
    { data: reservationData },
    { data: chargeData },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("apartments")
      .select("id, name, address, owner_name, owner_contact, commission_rate")
      .eq("id", apartmentId)
      .single(),
    supabase
      .from("reservations")
      .select(
        "id, total_amount, amount_paid, payment_method, check_in, check_out, reference",
      )
      .eq("apartment_id", apartmentId)
      .gte("check_in", start)
      .lte("check_in", end)
      .neq("booking_status", "cancelled")
      .order("check_in"),
    supabase
      .from("charges")
      .select(
        "id, reservation_id, amount, payment_method, date, billable_to_owner, service_type:service_types(name, paid_by)",
      )
      .eq("apartment_id", apartmentId)
      .is("cancelled_at", null),
    supabase
      .from("billing_settings")
      .select("company_name, company_address, company_phone, company_email")
      .single(),
  ]);
  if (!apartment) notFound();
  const reservations = reservationData ?? [];
  const reservationIds = new Set(
    reservations.map((reservation) => reservation.id),
  );
  const charges = (chargeData ?? []).map((charge) => ({
    ...charge,
    service_type: firstRelation(charge.service_type),
  }));
  const periodCharges = charges.filter(
    (charge) => charge.date >= start && charge.date <= end,
  );
  const calculate = (method: "bank" | "cash") => {
    const methodReservations = reservations.filter(
      (reservation) => (reservation.payment_method ?? "bank") === method,
    );
    const revenue = methodReservations.reduce(
      (sum, reservation) => sum + Number(reservation.total_amount),
      0,
    );
    const cleaning = charges
      .filter(
        (charge) =>
          (charge.payment_method ?? "bank") === method &&
          charge.billable_to_owner &&
          Boolean(
            charge.reservation_id && reservationIds.has(charge.reservation_id),
          ) &&
          isCleaning(charge.service_type?.name),
      )
      .reduce((sum, charge) => sum + Number(charge.amount), 0);
    const commission =
      (Math.max(revenue - cleaning, 0) *
        Number(apartment.commission_rate ?? 25)) /
      100;
    const otherCharges = periodCharges
      .filter(
        (charge) =>
          (charge.payment_method ?? "bank") === method &&
          charge.billable_to_owner &&
          !charge.reservation_id &&
          charge.service_type?.paid_by === "owner",
      )
      .reduce((sum, charge) => sum + Number(charge.amount), 0);
    return {
      revenue,
      cleaning,
      commission,
      otherCharges,
      payable: revenue - cleaning - commission - otherCharges,
    };
  };
  const bank = calculate("bank");
  const cash = calculate("cash");
  const total = bank.payable + cash.payable;
  return (
    <div
      data-print-document
      className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0"
    >
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-xl bg-white p-4 shadow-sm print:hidden">
        <div>
          <h1 className="font-semibold">Relevé propriétaire</h1>
          <p className="text-sm text-muted-foreground">
            {apartment.name} · {monthLabel(selected)}
          </p>
        </div>
        <PrintInvoiceButton />
      </div>
      <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[16mm] text-slate-950 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex justify-between gap-8 border-b-2 border-slate-900 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Relevé de gestion
            </p>
            <h1 className="mt-2 text-2xl font-bold">{monthLabel(selected)}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {apartment.name} · {apartment.address}
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-bold">
              {settings?.company_name ?? "Conciergerie Privée"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {settings?.company_address}
            </p>
            <p className="text-xs text-slate-600">{settings?.company_phone}</p>
          </div>
        </header>
        <section className="mt-7 grid grid-cols-2 gap-6 rounded-lg border p-4 text-sm">
          <Info label="Propriétaire" value={apartment.owner_name} />
          <Info label="Contact" value={apartment.owner_contact ?? "—"} />
          <Info label="Appartement" value={apartment.name} />
          <Info
            label="Commission"
            value={`${Number(apartment.commission_rate).toFixed(2)} %`}
          />
        </section>
        <h2 className="mt-8 text-lg font-bold">Séjours du mois</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b-2 text-left text-xs">
              <th className="py-2">Référence</th>
              <th>Dates</th>
              <th>Mode</th>
              <th className="text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-b">
                <td className="py-3">{reservation.reference}</td>
                <td>
                  {formatDate(reservation.check_in)} →{" "}
                  {formatDate(reservation.check_out)}
                </td>
                <td>
                  {reservation.payment_method === "cash" ? "Espèces" : "Banque"}
                </td>
                <td className="text-right font-medium">
                  {money.format(Number(reservation.total_amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reservations.length === 0 && (
          <p className="py-5 text-center text-sm text-slate-500">
            Aucun séjour enregistré.
          </p>
        )}
        <section className="mt-9 grid grid-cols-2 gap-6">
          <Breakdown title="Banque" values={bank} />
          <Breakdown title="Espèces" values={cash} />
        </section>
        <div className="mt-8 flex items-center justify-between border-y-2 border-slate-900 py-5 text-xl font-bold">
          <span>Total à reverser au propriétaire</span>
          <span>{money.format(total)}</span>
        </div>
        <footer className="mt-12 grid grid-cols-2 gap-16 text-sm">
          <div className="border-t pt-2">Signature du propriétaire</div>
          <div className="border-t pt-2">Signature du gestionnaire</div>
        </footer>
      </article>
    </div>
  );
}

function Breakdown({
  title,
  values,
}: {
  title: string;
  values: {
    revenue: number;
    cleaning: number;
    commission: number;
    otherCharges: number;
    payable: number;
  };
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-4 space-y-2 text-sm">
        <Line label="Revenus" value={values.revenue} />
        <Line label="Frais de ménage" value={-values.cleaning} />
        <Line label="Commission" value={-values.commission} />
        <Line label="Autres charges" value={-values.otherCharges} />
        <div className="flex justify-between border-t pt-3 font-bold">
          <span>À reverser</span>
          <span>{money.format(values.payable)}</span>
        </div>
      </div>
    </div>
  );
}
function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span>{money.format(value)}</span>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function isCleaning(name?: string) {
  const value = name?.toLocaleLowerCase("fr") ?? "";
  return ["ménage", "menage", "cleaning", "nettoyage"].some((term) =>
    value.includes(term),
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}
function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
