export const REGISTRATION_STATUSES = ["sent", "opened", "submitted", "verified", "rejected"] as const
export const DOCUMENT_TYPES = ["cin", "passport", "residence_permit", "other"] as const
export const GENDERS = ["female", "male"] as const

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]
export type DocumentType = (typeof DOCUMENT_TYPES)[number]
export type Gender = (typeof GENDERS)[number]

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  sent: "Lien créé",
  opened: "Formulaire ouvert",
  submitted: "À vérifier",
  verified: "Vérifié",
  rejected: "Correction demandée",
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cin: "Carte d'identité (CIN)",
  passport: "Passeport",
  residence_permit: "Titre de séjour",
  other: "Autre document",
}

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Femme",
  male: "Homme",
}

export type TravelerFormValue = {
  position: number
  is_primary: boolean
  first_name: string
  last_name: string
  gender: Gender | ""
  birth_date: string
  birth_place: string
  nationality: string
  country_of_residence: string
  address: string
  profession: string
  document_type: DocumentType | ""
  document_number: string
  document_expiry_date: string
  document_front_path: string
  document_back_path: string
  arrival_from: string
  next_destination: string
}

export type TravelerRecord = TravelerFormValue & {
  id: string
  registration_id: string
  reservation_id: string
  status: "submitted" | "verified" | "rejected"
}

export type TravelerRegistrationRecord = {
  id: string
  reservation_id: string
  status: RegistrationStatus
  expected_adults: number
  expires_at: string
  last_opened_at: string | null
  submitted_at: string | null
  verified_at: string | null
  revoked_at: string | null
  signed_by: string | null
  signed_at: string | null
  signature_data_url: string | null
  declaration_version: string | null
  travelers: TravelerRecord[]
}

export type TravelerReservationSummary = {
  id: string
  reference: string
  client_name: string
  client_number: string | null
  check_in: string
  check_out: string
  adults: number
  children: number
  apartment: { name: string } | null
}

export type PublicRegistration = {
  reservation_reference: string
  principal_guest_name: string
  apartment_name: string
  check_in: string
  check_out: string
  expected_adults: number
  children: number
  status: RegistrationStatus
  expires_at: string
  travelers: TravelerFormValue[]
}

export function createEmptyTraveler(position: number): TravelerFormValue {
  return {
    position,
    is_primary: position === 1,
    first_name: "",
    last_name: "",
    gender: "",
    birth_date: "",
    birth_place: "",
    nationality: "",
    country_of_residence: "",
    address: "",
    profession: "",
    document_type: "",
    document_number: "",
    document_expiry_date: "",
    document_front_path: "",
    document_back_path: "",
    arrival_from: "",
    next_destination: "",
  }
}
