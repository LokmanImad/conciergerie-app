export const BOOKING_STATUSES = ["option", "confirmed", "checked_in", "completed", "cancelled"] as const
export const RESERVATION_SOURCES = ["direct", "phone", "whatsapp", "airbnb", "booking", "other"] as const
export const PAYMENT_METHODS = ["bank", "cash"] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type ReservationSource = (typeof RESERVATION_SOURCES)[number]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type PaymentStatus = "unpaid" | "partial" | "paid"

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  option: "Option",
  confirmed: "Confirmée",
  checked_in: "Arrivée",
  completed: "Terminée",
  cancelled: "Annulée",
}

export const RESERVATION_SOURCE_LABELS: Record<ReservationSource, string> = {
  direct: "Directe",
  phone: "Téléphone",
  whatsapp: "WhatsApp",
  airbnb: "Airbnb",
  booking: "Booking.com",
  other: "Autre",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Non payée",
  partial: "Partiellement payée",
  paid: "Payée",
}

export type ApartmentOption = {
  id: string
  name: string
  commission_rate: number
}

export type ReservationFormState = {
  apartment_id: string
  client_name: string
  client_number: string
  check_in: string
  check_out: string
  check_in_time: string
  check_out_time: string
  adults: string
  children: string
  total_amount: string
  amount_paid: string
  source: ReservationSource
  booking_status: BookingStatus
  payment_method: PaymentMethod
  notes: string
}

export type ReservationRecord = {
  id: string
  reference: string
  apartment_id: string
  client_name: string
  client_number: string | null
  check_in: string
  check_out: string
  check_in_time: string
  check_out_time: string
  adults: number
  children: number
  total_amount: number
  amount_paid: number
  balance_due: number
  currency: string
  source: ReservationSource
  booking_status: BookingStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  notes: string | null
  status?: string
  apartment: { name: string; commission_rate: number } | null
}

export function createEmptyReservationForm(): ReservationFormState {
  return {
    apartment_id: "",
    client_name: "",
    client_number: "",
    check_in: "",
    check_out: "",
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
  }
}

export function reservationToForm(reservation: ReservationRecord): ReservationFormState {
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
    total_amount: String(reservation.total_amount),
    amount_paid: String(reservation.amount_paid ?? 0),
    source: reservation.source ?? "direct",
    booking_status: reservation.booking_status ?? "confirmed",
    payment_method: reservation.payment_method ?? "bank",
    notes: reservation.notes ?? "",
  }
}
