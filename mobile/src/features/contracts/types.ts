export type ContractStatus = "draft" | "generated" | "signed" | "expired" | "archived";

export const contractStatusLabels: Record<ContractStatus, string> = {
  draft: "Brouillon",
  generated: "Prêt à signer",
  signed: "Signé",
  expired: "Expiré",
  archived: "Archivé",
};

export type OwnerContract = {
  id: string;
  apartment_id: string;
  contract_number: string;
  title: string;
  status: ContractStatus;
  owner_name: string;
  owner_contact: string | null;
  owner_address: string | null;
  owner_identifier: string | null;
  manager_name: string;
  manager_address: string | null;
  manager_identifier: string | null;
  property_address: string | null;
  commission_rate: number;
  start_date: string;
  end_date: string | null;
  content: string;
  notes: string | null;
  generated_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  apartment: { name: string } | null;
};

export type ContractDocument = {
  id: string;
  contract_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  position: number;
  created_at: string;
  signed_url: string | null;
};
