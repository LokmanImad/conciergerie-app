export type RegistrationStatus =
  | "sent"
  | "opened"
  | "submitted"
  | "verified"
  | "rejected";

export type DocumentType = "cin" | "passport" | "residence_permit" | "other";
export type Gender = "female" | "male";

export type TravelerRecord = {
  id: string;
  registration_id: string;
  reservation_id: string;
  position: number;
  is_primary: boolean;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string;
  birth_place: string;
  nationality: string;
  country_of_residence: string;
  address: string;
  profession: string;
  document_type: DocumentType;
  document_number: string;
  document_expiry_date: string | null;
  document_front_path: string;
  document_back_path: string | null;
  arrival_from: string;
  next_destination: string;
  status: "submitted" | "verified" | "rejected";
};

export type TravelerRegistration = {
  id: string;
  reservation_id: string;
  status: RegistrationStatus;
  expected_adults: number;
  registered_adults: number;
  expires_at: string;
  submitted_at: string | null;
  reservation: {
    reference: string;
    client_name: string;
    check_in: string;
    check_out: string;
    children: number;
    apartment: { name: string } | null;
  } | null;
};

export type TravelerRegistrationDetail = Omit<TravelerRegistration, "registered_adults"> & {
  verified_at: string | null;
  signed_by: string | null;
  signed_at: string | null;
  signature_data_url: string | null;
  declaration_version: string | null;
  travelers: TravelerRecord[];
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  sent: "À compléter",
  opened: "En cours",
  submitted: "À vérifier",
  verified: "Vérifié",
  rejected: "À corriger",
};

export const documentTypeLabels: Record<DocumentType, string> = {
  cin: "Carte d’identité (CIN)",
  passport: "Passeport",
  residence_permit: "Titre de séjour",
  other: "Autre document",
};

export const genderLabels: Record<Gender, string> = {
  female: "Femme",
  male: "Homme",
};
