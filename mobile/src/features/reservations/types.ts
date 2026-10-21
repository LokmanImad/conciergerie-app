export type BookingStatus =
  | "option"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";
export type ReservationSource = "direct" | "phone" | "whatsapp" | "airbnb" | "booking" | "other";
export type PaymentMethod = "bank" | "cash";

export type ApartmentOption = {
  id: string;
  name: string;
};

export type Reservation = {
  id: string;
  reference: string;
  apartment_id: string;
  client_name: string;
  client_number: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  source: ReservationSource;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  check_in_time: string;
  check_out_time: string;
  notes: string | null;
  apartment: { name: string } | null;
};

export type ReservationFormState = {
  apartment_id: string;
  client_name: string;
  client_number: string;
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  adults: string;
  children: string;
  total_amount: string;
  amount_paid: string;
  source: ReservationSource;
  booking_status: BookingStatus;
  payment_method: PaymentMethod;
  notes: string;
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  option: "Option",
  confirmed: "Confirmée",
  checked_in: "Arrivée",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const reservationSourceLabels: Record<ReservationSource, string> = {
  direct: "Directe",
  phone: "Téléphone",
  whatsapp: "WhatsApp",
  airbnb: "Airbnb",
  booking: "Booking.com",
  other: "Autre",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank: "Banque",
  cash: "Espèces",
};

export const bookingStatuses = Object.keys(bookingStatusLabels) as BookingStatus[];
export const reservationSources = Object.keys(reservationSourceLabels) as ReservationSource[];
export const paymentMethods = Object.keys(paymentMethodLabels) as PaymentMethod[];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createEmptyReservationForm(): ReservationFormState {
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 1);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 1);

  return {
    apartment_id: "",
    client_name: "",
    client_number: "",
    check_in: toIsoDate(arrival),
    check_out: toIsoDate(departure),
    check_in_time: "15:00",
    check_out_time: "11:00",
    adults: "1",
    children: "0",
    total_amount: "",
    amount_paid: "0",
    source: "direct",
    booking_status: "confirmed",
    payment_method: "bank",
    notes: "",
  };
}

export function reservationToForm(reservation: Reservation): ReservationFormState {
  return {
    apartment_id: reservation.apartment_id,
    client_name: reservation.client_name,
    client_number: reservation.client_number ?? "",
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    check_in_time: reservation.check_in_time?.slice(0, 5) || "15:00",
    check_out_time: reservation.check_out_time?.slice(0, 5) || "11:00",
    adults: String(reservation.adults ?? 1),
    children: String(reservation.children ?? 0),
    total_amount: String(reservation.total_amount ?? 0),
    amount_paid: String(reservation.amount_paid ?? 0),
    source: reservation.source ?? "direct",
    booking_status: reservation.booking_status ?? "confirmed",
    payment_method: reservation.payment_method ?? "bank",
    notes: reservation.notes ?? "",
  };
}
