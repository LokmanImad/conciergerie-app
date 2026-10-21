import {
  effectiveInvoiceStatus,
  INVOICE_STATUS_LABELS,
  type BillingSettings,
  type Invoice,
} from "@/features/invoices/types";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});

export function InvoiceSheet({
  invoice,
  settings,
}: {
  invoice: Invoice;
  settings: BillingSettings;
}) {
  return (
    <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[16mm] text-slate-950 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Facture
          </p>
          <h1 className="mt-2 text-3xl font-bold">{invoice.invoice_number}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Émise le {formatDate(invoice.issue_date)} · Échéance{" "}
            {formatDate(invoice.due_date)}
          </p>
        </div>
        <div className="max-w-64 text-right">
          <h2 className="text-lg font-bold">{settings.company_name}</h2>
          {settings.company_address && (
            <p className="mt-1 text-xs text-slate-600">
              {settings.company_address}
            </p>
          )}
          {settings.company_phone && (
            <p className="text-xs text-slate-600">{settings.company_phone}</p>
          )}
          {settings.company_email && (
            <p className="text-xs text-slate-600">{settings.company_email}</p>
          )}
          {settings.company_identifier && (
            <p className="mt-1 text-xs text-slate-600">
              Identifiant : {settings.company_identifier}
            </p>
          )}
        </div>
      </header>
      <section className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Facturé à
          </p>
          <p className="mt-2 font-semibold">{invoice.client_name}</p>
          {invoice.client_contact && (
            <p className="text-sm text-slate-600">{invoice.client_contact}</p>
          )}
          {invoice.billing_address && (
            <p className="text-sm text-slate-600">{invoice.billing_address}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Référence
          </p>
          <p className="mt-2 text-sm">
            {invoice.reservation?.reference ?? "Facture directe"}
          </p>
          <p className="text-sm text-slate-600">{invoice.apartment?.name}</p>
        </div>
      </section>
      <section className="mt-6 grid grid-cols-2 gap-4 rounded-lg border bg-slate-50 p-4 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Mode de règlement
          </p>
          <p className="mt-1 font-semibold">
            {invoice.payment_method === "cash"
              ? "Espèces"
              : invoice.payment_method === "bank"
                ? "Banque"
                : "Non renseigné"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Statut
          </p>
          <p className="mt-1 font-semibold">
            {INVOICE_STATUS_LABELS[effectiveInvoiceStatus(invoice)]}
          </p>
        </div>
      </section>
      <table className="mt-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left text-[10px] uppercase tracking-wider">
            <th className="py-3">Description</th>
            <th className="w-20 py-3 text-right">Qté</th>
            <th className="w-32 py-3 text-right">Prix unitaire</th>
            <th className="w-32 py-3 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items?.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-4">{item.description}</td>
              <td className="py-4 text-right">
                {Number(item.quantity).toFixed(2)}
              </td>
              <td className="py-4 text-right">
                {money.format(Number(item.unit_price))}
              </td>
              <td className="py-4 text-right font-medium">
                {money.format(Number(item.quantity) * Number(item.unit_price))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="ml-auto mt-8 w-full max-w-sm space-y-2 text-sm">
        <Total
          label="Sous-total"
          value={money.format(Number(invoice.subtotal))}
        />
        <Total
          label={`Taxe (${Number(invoice.tax_rate).toFixed(2)} %)`}
          value={money.format(Number(invoice.tax_amount))}
        />
        <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-bold">
          <span>Total</span>
          <span>{money.format(Number(invoice.total_amount))}</span>
        </div>
        <Total
          label="Déjà payé"
          value={money.format(Number(invoice.amount_paid))}
        />
        <div className="flex justify-between rounded bg-slate-100 p-3 font-bold">
          <span>Reste à payer</span>
          <span>
            {money.format(
              Math.max(
                Number(invoice.total_amount) - Number(invoice.amount_paid),
                0,
              ),
            )}
          </span>
        </div>
      </section>
      {invoice.notes && (
        <section className="mt-10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {invoice.notes}
          </p>
        </section>
      )}
      {settings.bank_details && (
        <section className="mt-8 rounded border p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Coordonnées bancaires
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {settings.bank_details}
          </p>
        </section>
      )}
      <footer className="mt-12 border-t pt-4 text-center text-[10px] text-slate-500">
        {settings.footer_text ||
          `${settings.company_name} · Merci pour votre confiance.`}
      </footer>
    </article>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(`${value}T12:00:00`),
  );
}
