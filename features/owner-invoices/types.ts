export type OwnerInvoiceStatus = "draft" | "sent" | "settled" | "cancelled";

export const ownerInvoiceStatusLabels: Record<OwnerInvoiceStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  settled: "Versement effectué",
  cancelled: "Annulée",
};

export type OwnerInvoiceItem = {
  id: string;
  item_type: "commission" | "cleaning" | "charge";
  description: string;
  amount: number;
  position: number;
};

export type OwnerInvoice = {
  id: string;
  invoice_number: string;
  apartment_id: string;
  owner_name: string;
  owner_contact: string | null;
  period_start: string;
  period_end: string;
  issue_date: string;
  due_date: string;
  status: OwnerInvoiceStatus;
  gross_revenue: number;
  commission_amount: number;
  rebillable_charges: number;
  total_amount: number;
  net_payout: number;
  sent_at: string | null;
  settled_at: string | null;
  notes: string | null;
  apartment: { name: string; address: string } | null;
  items?: OwnerInvoiceItem[];
};
