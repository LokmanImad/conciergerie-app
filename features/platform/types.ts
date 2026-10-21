export type CompanyStatus = "trial" | "active" | "suspended" | "expired" | "cancelled";
export type LicenseStatus = "trial" | "active" | "grace" | "suspended" | "expired" | "cancelled";

export type Company = {
  id: string;
  clerk_organization_id: string | null;
  slug: string;
  name: string;
  status: CompanyStatus;
  web_enabled: boolean;
  mobile_enabled: boolean;
  max_users: number | null;
  max_apartments: number | null;
  timezone: string;
  locale: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type ModuleCatalogItem = {
  key: string;
  name: string;
  description: string | null;
  web_available: boolean;
  mobile_available: boolean;
  position: number;
  active: boolean;
};

export type CompanyModule = {
  company_id: string;
  module_key: string;
  enabled: boolean;
};

export type CompanyBranding = {
  company_id: string;
  logo_url: string | null;
  icon_url: string | null;
  primary_color: string;
  accent_color: string;
  legal_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  company_identifier: string | null;
  bank_details: string | null;
  invoice_footer: string | null;
};

export type CompanyLicense = {
  id: string;
  company_id: string;
  status: LicenseStatus;
  starts_at: string;
  expires_at: string | null;
  grace_ends_at: string | null;
  billing_cycle: "manual" | "monthly" | "yearly" | "lifetime";
  price_amount: number | null;
  currency: string;
  notes: string | null;
};

export type DevicePolicy = {
  company_id: string;
  access_mode: "any" | "approved_only" | "certificate_required";
  approval_scope: "company_admin" | "platform_admin";
  max_devices_per_user: number | null;
  web_enforced: boolean;
  mobile_enforced: boolean;
};

export type CompanyMember = {
  company_id: string;
  clerk_user_id: string;
  role: "owner" | "admin" | "agent" | "accountant" | "viewer";
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  active: boolean;
  access_status: "pending_approval" | "active" | "suspended" | "revoked";
  last_synced_at: string | null;
};

export type CompanyInvitation = {
  id: string;
  company_id: string;
  clerk_invitation_id: string;
  clerk_user_id: string | null;
  email: string;
  display_name: string | null;
  role: CompanyMember["role"];
  status: "pending" | "accepted" | "revoked" | "expired" | "failed";
  invited_by: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyDomain = {
  id: string;
  company_id: string;
  hostname: string;
  domain_type: "subdomain" | "custom";
  verification_status: "pending" | "verified" | "failed";
  is_primary: boolean;
  verified_at: string | null;
};

export type TrustedDevice = {
  id: string;
  company_id: string;
  clerk_user_id: string;
  name: string;
  platform: "web" | "mobile";
  status: "pending" | "approved" | "suspended" | "revoked" | "expired";
  browser: string | null;
  operating_system: string | null;
  last_seen_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
};
