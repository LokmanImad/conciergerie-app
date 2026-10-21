export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export type Invoice = {
  id: string;
  invoice_number: string;
  reservation_id: string | null;
  apartment_id: string | null;
  status: InvoiceStatus;
  client_name: string;
  client_contact: string | null;
  billing_address: string | null;
  issue_date: string;
  due_date: string;
  currency: "MAD";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_method: "bank" | "cash" | null;
  paid_at: string | null;
  sent_at: string | null;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  apartment: { name: string } | null;
  reservation: {
    reference: string;
    check_in: string;
    check_out: string;
  } | null;
  invoice_items?: InvoiceItem[];
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  position: number;
};

export type BillingSettings = {
  id: number;
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_identifier: string | null;
  bank_details: string | null;
  default_tax_rate: number;
  invoice_prefix: string;
  payment_terms_days: number;
  footer_text: string | null;
};

export function effectiveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (
    (invoice.status === "draft" || invoice.status === "sent") &&
    invoice.due_date < new Date().toISOString().slice(0, 10)
  )
    return "overdue";
  return invoice.status;
}
