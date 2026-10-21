import type { ChargeFormState } from "@/features/charges/types";

export function validateCharge(form: ChargeFormState) {
  if (!form.service_type_id) return "Sélectionnez une catégorie de charge.";
  const amount = Number(form.amount.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0)
    return "Le montant doit être supérieur à zéro.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date))
    return "Renseignez une date valide.";
  if (form.supplier.trim().length > 120)
    return "Le nom du fournisseur est trop long.";
  if (form.description.trim().length > 500)
    return "La description est trop longue.";
  if (form.notes.trim().length > 1000) return "Les notes sont trop longues.";
  return null;
}

export function chargePayload(form: ChargeFormState) {
  return {
    apartment_id: form.apartment_id || null,
    service_type_id: form.service_type_id,
    reservation_id: form.reservation_id || null,
    amount: Number(form.amount.replace(",", ".")),
    date: form.date,
    supplier: form.supplier.trim() || null,
    description: form.description.trim() || null,
    notes: form.notes.trim() || null,
    paid_by_person: form.paid_by_person,
    payment_method: form.payment_method,
    is_paid: form.is_paid,
    billable_to_owner: form.billable_to_owner,
  };
}

export function getChargeDatabaseError(error: {
  message?: string;
  code?: string;
}) {
  if (error.code === "42501" || error.message?.includes("ADMIN_REQUIRED")) {
    return "Votre compte n’est pas autorisé à modifier les charges.";
  }
  if (error.message?.includes("charges_amount_positive"))
    return "Le montant doit être supérieur à zéro.";
  if (error.message?.includes("billable_to_owner"))
    return "Exécutez la migration 38 dans Supabase avant d’enregistrer cette charge.";
  if (error.message?.includes("charge-receipts"))
    return "Le justificatif n’a pas pu être enregistré.";
  return "Impossible d’enregistrer la charge. Vérifiez les informations puis réessayez.";
}
