import { z } from "zod"
import type { ReservationFormState } from "./types"

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^\d{2}:\d{2}$/

const reservationSchema = z
  .object({
    apartment_id: z.string().uuid("Sélectionnez un appartement."),
    client_name: z.string().trim().min(2, "Le nom du client est obligatoire."),
    client_number: z.string().trim().max(40, "Le numéro du client est trop long.").optional(),
    check_in: z.string().regex(datePattern, "La date d’arrivée est obligatoire."),
    check_out: z.string().regex(datePattern, "La date de départ est obligatoire."),
    check_in_time: z.string().regex(timePattern, "L’heure d’arrivée est invalide."),
    check_out_time: z.string().regex(timePattern, "L’heure de départ est invalide."),
    adults: z.coerce.number().int().min(1, "Il faut au moins un adulte."),
    children: z.coerce.number().int().min(0, "Le nombre d’enfants est invalide."),
    total_amount: z.coerce.number().min(0, "Le montant total doit être positif."),
    amount_paid: z.coerce.number().min(0, "Le montant payé doit être positif."),
    source: z.enum(["direct", "phone", "whatsapp", "airbnb", "booking", "other"]),
    booking_status: z.enum(["option", "confirmed", "checked_in", "completed", "cancelled"]),
    payment_method: z.enum(["bank", "cash"]),
    notes: z.string().trim().max(2000, "Les notes sont trop longues.").optional(),
  })
  .superRefine((data, context) => {
    if (data.check_out <= data.check_in) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["check_out"],
        message: "La date de départ doit être postérieure à la date d’arrivée.",
      })
    }

    if (data.amount_paid > data.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount_paid"],
        message: "Le montant payé ne peut pas dépasser le montant total.",
      })
    }
  })

export type ReservationPayload = z.infer<typeof reservationSchema>

export function validateReservationForm(form: ReservationFormState) {
  const result = reservationSchema.safeParse(form)

  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues[0]?.message ?? "Vérifiez les informations de la réservation.",
    }
  }

  return {
    success: true as const,
    data: {
      ...result.data,
      client_number: result.data.client_number || null,
      notes: result.data.notes || null,
      currency: "MAD",
    },
  }
}

export function getReservationDatabaseError(error: { message?: string; code?: string }) {
  if (error.message?.includes("RESERVATION_DATE_CONFLICT")) {
    return "Cet appartement possède déjà une réservation active sur ces dates."
  }

  if (error.code === "23514") {
    return "Une valeur saisie ne respecte pas les règles de la réservation."
  }

  return error.message || "Une erreur est survenue lors de l’enregistrement."
}
