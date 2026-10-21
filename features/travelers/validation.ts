import { z } from "zod"

const requiredText = (label: string) => z.string().trim().min(1, `${label} est obligatoire`).max(200)

export const travelerSubmissionSchema = z.object({
  travelers: z
    .array(
      z.object({
        position: z.number().int().min(1).max(20),
        is_primary: z.boolean(),
        first_name: requiredText("Le prénom"),
        last_name: requiredText("Le nom"),
        gender: z.enum(["female", "male"], { message: "Le sexe est obligatoire" }),
        birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La date de naissance est obligatoire"),
        birth_place: requiredText("Le lieu de naissance"),
        nationality: requiredText("La nationalité"),
        country_of_residence: requiredText("Le pays de résidence"),
        address: requiredText("L'adresse"),
        profession: z.string().trim().max(200),
        document_type: z.enum(["cin", "passport", "residence_permit", "other"], {
          message: "Le type de document est obligatoire",
        }),
        document_number: requiredText("Le numéro du document"),
        document_expiry_date: z
          .string()
          .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date d'expiration invalide"),
        document_front_path: requiredText("La photo du document"),
        document_back_path: z.string().trim().max(300),
        arrival_from: requiredText("La provenance"),
        next_destination: requiredText("La prochaine destination"),
      }).superRefine((traveler, context) => {
        if (traveler.document_type === "cin" && !traveler.document_back_path) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["document_back_path"],
            message: "La photo du verso de la CIN est obligatoire",
          })
        }
      }),
    )
    .min(1)
    .max(20),
  signed_by: requiredText("Le nom du signataire"),
  consent: z.literal(true, { message: "Vous devez accepter la déclaration" }),
  signature_data_url: z
    .string()
    .startsWith("data:image/png;base64,", "La signature est obligatoire")
    .max(400_000, "La signature est trop volumineuse"),
})

export type TravelerSubmission = z.infer<typeof travelerSubmissionSchema>
