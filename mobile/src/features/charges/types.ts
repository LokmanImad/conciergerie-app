export type PaidByPerson = "imad" | "jassem" | "company";
export type ChargePaymentMethod = "bank" | "cash";

export type ServiceTypeOption = {
  id: string;
  name: string;
  paid_by: "company" | "owner";
};

export type ChargeReservationOption = {
  id: string;
  apartment_id: string;
  reference: string;
  client_name: string;
  check_in: string;
};

export type Charge = {
  id: string;
  apartment_id: string | null;
  service_type_id: string;
  reservation_id: string | null;
  amount: number;
  date: string;
  supplier: string | null;
  description: string | null;
  notes: string | null;
  paid_by_person: PaidByPerson;
  payment_method: ChargePaymentMethod;
  is_paid: boolean;
  is_invoiced: boolean;
  billable_to_owner: boolean;
  receipt_path: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  apartment: { name: string } | null;
  service_type: { name: string; paid_by: "company" | "owner" } | null;
  reservation: {
    reference: string;
    client_name: string;
    check_in: string;
  } | null;
};

export type ChargeFormState = {
  apartment_id: string;
  service_type_id: string;
  reservation_id: string;
  amount: string;
  date: string;
  supplier: string;
  description: string;
  notes: string;
  paid_by_person: PaidByPerson;
  payment_method: ChargePaymentMethod;
  is_paid: boolean;
  billable_to_owner: boolean;
  receipt_path: string;
};

export type ChargeReceiptDraft = {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
};

export const paidByPersonLabels: Record<PaidByPerson, string> = {
  imad: "Imad",
  jassem: "Jassem",
  company: "Société",
};

export const chargePaymentMethodLabels: Record<ChargePaymentMethod, string> = {
  bank: "Banque",
  cash: "Espèces",
};

export const paidByPeople = Object.keys(paidByPersonLabels) as PaidByPerson[];
export const chargePaymentMethods = Object.keys(
  chargePaymentMethodLabels,
) as ChargePaymentMethod[];

export function createEmptyChargeForm(): ChargeFormState {
  return {
    apartment_id: "",
    service_type_id: "",
    reservation_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    supplier: "",
    description: "",
    notes: "",
    paid_by_person: "company",
    payment_method: "bank",
    is_paid: false,
    billable_to_owner: false,
    receipt_path: "",
  };
}

export function chargeToForm(charge: Charge): ChargeFormState {
  return {
    apartment_id: charge.apartment_id ?? "",
    service_type_id: charge.service_type_id,
    reservation_id: charge.reservation_id ?? "",
    amount: String(charge.amount),
    date: charge.date,
    supplier: charge.supplier ?? "",
    description: charge.description ?? "",
    notes: charge.notes ?? "",
    paid_by_person: charge.paid_by_person,
    payment_method: charge.payment_method,
    is_paid: charge.is_paid,
    billable_to_owner: charge.billable_to_owner,
    receipt_path: charge.receipt_path ?? "",
  };
}
