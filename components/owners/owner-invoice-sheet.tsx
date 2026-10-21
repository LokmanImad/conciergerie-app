import type { BillingSettings } from "@/features/invoices/types";
import type { OwnerInvoice } from "@/features/owner-invoices/types";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});
const date = new Intl.DateTimeFormat("fr-FR");
const month = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

export function OwnerInvoiceSheet({
  invoice,
  settings,
}: {
  invoice: OwnerInvoice;
  settings: BillingSettings | null;
}) {
  return (
    <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[16mm] text-slate-950 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex justify-between gap-8 border-b-2 border-slate-900 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Facture propriétaire
          </p>
          <h1 className="mt-2 text-3xl font-bold">{invoice.invoice_number}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Période :{" "}
            {month.format(new Date(`${invoice.period_start}T12:00:00`))}
          </p>
        </div>
        <div className="max-w-[260px] text-right text-sm">
          <h2 className="font-bold">
            {settings?.company_name ?? "Conciergerie Privée"}
          </h2>
          <p>{settings?.company_address}</p>
          <p>{settings?.company_phone}</p>
          <p>{settings?.company_email}</p>
          <p>{settings?.company_identifier}</p>
        </div>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-6 text-sm">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase text-slate-500">Facturé à</p>
          <p className="mt-2 font-bold">{invoice.owner_name}</p>
          <p>{invoice.owner_contact}</p>
          <p>{invoice.apartment?.name}</p>
          <p className="text-slate-600">{invoice.apartment?.address}</p>
        </div>
        <div className="rounded-lg border p-4">
          <Info
            label="Date d’émission"
            value={date.format(new Date(`${invoice.issue_date}T12:00:00`))}
          />
          <Info
            label="Échéance"
            value={date.format(new Date(`${invoice.due_date}T12:00:00`))}
          />
        </div>
      </section>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b-2 text-left text-xs uppercase">
            <th className="py-3">Description</th>
            <th className="py-3 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items ?? []).map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-4">{item.description}</td>
              <td className="py-4 text-right">
                {money.format(Number(item.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="ml-auto mt-8 w-full max-w-sm space-y-3 text-sm">
        <Line label="Commission" value={invoice.commission_amount} />
        <Line
          label="Ménages et charges refacturables"
          value={invoice.rebillable_charges}
        />
        <div className="flex justify-between border-t-2 border-slate-900 pt-4 text-lg font-bold">
          <span>Total de la facture</span>
          <span>{money.format(Number(invoice.total_amount))}</span>
        </div>
      </section>

      <section className="mt-10 rounded-lg bg-slate-100 p-5 text-sm">
        <Line
          label="Revenus bruts des réservations"
          value={invoice.gross_revenue}
        />
        <Line
          label="Total retenu sur le versement"
          value={-Number(invoice.total_amount)}
        />
        <div className="mt-3 flex justify-between border-t border-slate-400 pt-3 text-lg font-bold">
          <span>Net à verser au propriétaire</span>
          <span>{money.format(Number(invoice.net_payout))}</span>
        </div>
      </section>

      {settings?.bank_details && (
        <p className="mt-8 whitespace-pre-line text-xs text-slate-600">
          <strong>Coordonnées bancaires :</strong> {settings.bank_details}
        </p>
      )}
      {settings?.footer_text && (
        <footer className="mt-12 border-t pt-4 text-center text-xs text-slate-500">
          {settings.footer_text}
        </footer>
      )}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between gap-4 last:mb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span>{money.format(Number(value))}</span>
    </div>
  );
}
