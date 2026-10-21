import type { ReservationFormState } from "@/features/reservations/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export type ReservationPayload = {
  apartment_id: string;
  client_name: string;
  client_number: string | null;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  adults: number;
  children: number;
  total_amount: number;
  amount_paid: number;
  currency: "MAD";
  source: ReservationFormState["source"];
  booking_status: ReservationFormState["booking_status"];
  payment_method: ReservationFormState["payment_method"];
  notes: string | null;
};

export function validateReservationForm(form: ReservationFormState):
  | { success: true; data: ReservationPayload }
  | { success: false; error: string } {
  const clientName = form.client_name.trim();
  const clientNumber = form.client_number.trim();
  const notes = form.notes.trim();
  const adults = Number(form.adults);
  const children = Number(form.children);
  const totalAmount = Number(form.total_amount);
  const amountPaid = Number(form.amount_paid);

  if (!form.apartment_id) return { success: false, error: "Sélectionnez un appartement." };
  if (clientName.length < 2) return { success: false, error: "Le nom du client est obligatoire." };
  if (clientNumber.length > 40) return { success: false, error: "Le numéro du client est trop long." };
  if (!datePattern.test(form.check_in)) return { success: false, error: "La date d’arrivée est obligatoire." };
  if (!datePattern.test(form.check_out)) return { success: false, error: "La date de départ est obligatoire." };
  if (form.check_out <= form.check_in) {
    return { success: false, error: "La date de départ doit être postérieure à la date d’arrivée." };
  }
  if (!timePattern.test(form.check_in_time) || !timePattern.test(form.check_out_time)) {
    return { success: false, error: "Vérifiez les heures d’arrivée et de départ." };
  }
  if (!Number.isInteger(adults) || adults < 1) return { success: false, error: "Il faut au moins un adulte." };
  if (!Number.isInteger(children) || children < 0) {
    return { success: false, error: "Le nombre d’enfants est invalide." };
  }
  if (!Number.isFinite(totalAmount) || totalAmount < 0 || form.total_amount.trim() === "") {
    return { success: false, error: "Le montant total est obligatoire." };
  }
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    return { success: false, error: "Le montant payé est invalide." };
  }
  if (amountPaid > totalAmount) {
    return { success: false, error: "Le montant payé ne peut pas dépasser le montant total." };
  }
  if (notes.length > 2000) return { success: false, error: "Les notes sont trop longues." };

  return {
    success: true,
    data: {
      apartment_id: form.apartment_id,
      client_name: clientName,
      client_number: clientNumber || null,
      check_in: form.check_in,
      check_out: form.check_out,
      check_in_time: form.check_in_time,
      check_out_time: form.check_out_time,
      adults,
      children,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      currency: "MAD",
      source: form.source,
      booking_status: form.booking_status,
      payment_method: form.payment_method,
      notes: notes || null,
    },
  };
}

export function getReservationDatabaseError(error: { message?: string; code?: string }) {
  if (error.message?.includes("RESERVATION_DATE_CONFLICT")) {
    return "Cet appartement possède déjà une réservation active sur ces dates.";
  }
  if (error.code === "23514") {
    return "Une valeur saisie ne respecte pas les règles de la réservation.";
  }
  if (error.code === "42501") {
    return "Votre compte n’est pas autorisé à modifier les réservations.";
  }
  return error.message || "Une erreur est survenue pendant l’enregistrement.";
}
