export const CONTRACT_STATUSES = ["draft", "generated", "signed", "expired", "archived"] as const

export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Brouillon",
  generated: "Prêt à signer",
  signed: "Signé",
  expired: "Expiré",
  archived: "Archivé",
}

export type ContractApartment = {
  id: string
  name: string
  owner_name: string
  owner_contact: string | null
  commission_rate: number
}

export type OwnerContract = {
  id: string
  apartment_id: string
  contract_number: string
  title: string
  status: ContractStatus
  owner_name: string
  owner_contact: string | null
  owner_address: string | null
  owner_identifier: string | null
  manager_name: string
  manager_address: string | null
  manager_identifier: string | null
  property_address: string | null
  commission_rate: number
  start_date: string
  end_date: string | null
  content: string
  notes: string | null
  generated_at: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
  apartment: { name: string } | null
}

export type ContractDocument = {
  id: string
  contract_id: string
  storage_path: string
  file_name: string
  mime_type: string
  position: number
  created_at: string
  signed_url?: string | null
}

export type ContractFormState = {
  apartment_id: string
  contract_number: string
  title: string
  status: ContractStatus
  owner_name: string
  owner_contact: string
  owner_address: string
  owner_identifier: string
  manager_name: string
  manager_address: string
  manager_identifier: string
  property_address: string
  commission_rate: string
  start_date: string
  end_date: string
  content: string
  notes: string
}

export const DEFAULT_CONTRACT_CONTENT = `CONTRAT DE GESTION LOCATIVE

ENTRE LES SOUSSIGNÉS

Le Propriétaire : {{owner_name}}, titulaire de la pièce d’identité n° {{owner_identifier}}, demeurant à {{owner_address}}, joignable au {{owner_contact}}, ci-après dénommé « le Propriétaire ».

ET

Le Gestionnaire : {{manager_name}}, identifié sous le numéro {{manager_identifier}}, établi à {{manager_address}}, ci-après dénommé « le Gestionnaire ».

IL A ÉTÉ CONVENU CE QUI SUIT :

ARTICLE 1 — OBJET DU CONTRAT
Le Propriétaire confie au Gestionnaire la gestion locative de l’hébergement « {{apartment_name}} », situé à {{property_address}}.

ARTICLE 2 — DURÉE
Le présent contrat prend effet le {{start_date}} et reste valable jusqu’au {{end_date}}. Toute prolongation ou modification doit être convenue par écrit entre les parties.

ARTICLE 3 — MISSIONS DU GESTIONNAIRE
Le Gestionnaire assure notamment la coordination des réservations, l’accueil des voyageurs, le suivi des séjours, la coordination du ménage et la transmission des informations financières disponibles dans l’application.

ARTICLE 4 — COMMISSION
En contrepartie de ses prestations, le Gestionnaire perçoit une commission de {{commission_rate}} % selon les modalités convenues entre les parties. Les charges imputables au Propriétaire restent identifiées séparément.

ARTICLE 5 — OBLIGATIONS DU PROPRIÉTAIRE
Le Propriétaire garantit disposer des droits nécessaires sur le logement et s’engage à fournir des informations exactes, à maintenir le logement conforme et à signaler toute modification pouvant affecter sa location.

ARTICLE 6 — ENTRETIEN ET DÉPENSES
Les interventions, réparations et dépenses sont enregistrées et affectées conformément aux instructions du Propriétaire. Les dépenses exceptionnelles nécessitent son accord préalable, sauf urgence destinée à protéger les personnes ou le bien.

ARTICLE 7 — REDDITION DES COMPTES
Le Gestionnaire met à disposition un suivi des réservations, revenus, commissions et charges enregistrés pour le logement.

ARTICLE 8 — RÉSILIATION
Chaque partie peut demander la résiliation selon le préavis et les conditions convenus par écrit. Les opérations déjà engagées restent dues jusqu’à leur clôture.

ARTICLE 9 — DONNÉES ET DOCUMENTS
Les informations et documents liés à la gestion sont conservés dans un espace privé accessible aux administrateurs autorisés.

ARTICLE 10 — DISPOSITIONS FINALES
Toute modification du présent contrat doit faire l’objet d’un écrit accepté par les deux parties. Le présent projet doit être relu et adapté aux obligations légales applicables avant signature.

Fait en deux exemplaires.

LE PROPRIÉTAIRE                              LE GESTIONNAIRE
Nom : {{owner_name}}                         Nom : {{manager_name}}
Signature et cachet :                        Signature et cachet :`

export const CONTRACT_PLACEHOLDERS = [
  "{{owner_name}}",
  "{{owner_contact}}",
  "{{owner_address}}",
  "{{owner_identifier}}",
  "{{manager_name}}",
  "{{manager_address}}",
  "{{manager_identifier}}",
  "{{apartment_name}}",
  "{{property_address}}",
  "{{commission_rate}}",
  "{{start_date}}",
  "{{end_date}}",
] as const

export function createContractNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `CTR-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function createEmptyContractForm(apartment?: ContractApartment): ContractFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    apartment_id: apartment?.id ?? "",
    contract_number: createContractNumber(),
    title: "Contrat de gestion locative",
    status: "draft",
    owner_name: apartment?.owner_name ?? "",
    owner_contact: apartment?.owner_contact ?? "",
    owner_address: "",
    owner_identifier: "",
    manager_name: "Conciergerie Privée",
    manager_address: "",
    manager_identifier: "",
    property_address: apartment?.name ?? "",
    commission_rate: String(apartment?.commission_rate ?? 25),
    start_date: today,
    end_date: "",
    content: DEFAULT_CONTRACT_CONTENT,
    notes: "",
  }
}

export function contractToForm(contract: OwnerContract): ContractFormState {
  return {
    apartment_id: contract.apartment_id,
    contract_number: contract.contract_number,
    title: contract.title,
    status: contract.status,
    owner_name: contract.owner_name,
    owner_contact: contract.owner_contact ?? "",
    owner_address: contract.owner_address ?? "",
    owner_identifier: contract.owner_identifier ?? "",
    manager_name: contract.manager_name,
    manager_address: contract.manager_address ?? "",
    manager_identifier: contract.manager_identifier ?? "",
    property_address: contract.property_address ?? "",
    commission_rate: String(contract.commission_rate),
    start_date: contract.start_date,
    end_date: contract.end_date ?? "",
    content: contract.content,
    notes: contract.notes ?? "",
  }
}

export function renderContractContent(contract: Pick<OwnerContract, keyof ContractFormState | "apartment">) {
  const values: Record<string, string> = {
    owner_name: contract.owner_name,
    owner_contact: contract.owner_contact ?? "—",
    owner_address: contract.owner_address ?? "—",
    owner_identifier: contract.owner_identifier ?? "—",
    manager_name: contract.manager_name,
    manager_address: contract.manager_address ?? "—",
    manager_identifier: contract.manager_identifier ?? "—",
    apartment_name: contract.apartment?.name ?? "—",
    property_address: contract.property_address ?? "—",
    commission_rate: String(contract.commission_rate),
    start_date: contract.start_date,
    end_date: contract.end_date ?? "durée indéterminée",
  }

  return contract.content.replace(/{{([a-z_]+)}}/g, (token, key: string) => values[key] ?? token)
}
