import { ShieldCheckIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PlatformConsole } from "@/components/platform/platform-console";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  Company,
  CompanyBranding,
  CompanyDomain,
  CompanyInvitation,
  CompanyLicense,
  CompanyMember,
  CompanyModule,
  DevicePolicy,
  ModuleCatalogItem,
  TrustedDevice,
} from "@/features/platform/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function PlatformPage() {
  const supabase = await getSupabaseServerClient();
  const { data: isPlatformAdmin, error: accessError } = await supabase.rpc(
    "is_platform_admin",
  );

  if (accessError) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Administration SaaS"
          title="Centre de contrôle"
          description="Configurez la fondation multi-sociétés avant d’ouvrir cette console."
        />
        <Alert>
          <ShieldCheckIcon className="size-4" />
          <AlertTitle>Migration requise</AlertTitle>
          <AlertDescription>
            Exécutez les migrations 40 à 46 dans Supabase. Aucune donnée
            existante ne sera supprimée.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Administration SaaS"
          title="Accès refusé"
          description="Cette zone est réservée aux Super Administrateurs de la plateforme."
        />
      </div>
    );
  }

  const [
    { data: companies },
    { data: modules },
    { data: companyModules },
    { data: licenses },
    { data: devicePolicies },
    { data: brandings },
    { data: members },
    { data: domains },
    { data: trustedDevices },
    { data: invitations },
  ] = await Promise.all([
    supabase.from("companies").select("*").order("created_at"),
    supabase.from("module_catalog").select("*").eq("active", true).order("position"),
    supabase.from("company_modules").select("company_id, module_key, enabled"),
    supabase.from("company_licenses").select("*").order("created_at", { ascending: false }),
    supabase.from("company_device_policies").select("*"),
    supabase.from("company_branding").select("*"),
    supabase.from("company_members").select("*"),
    supabase.from("company_domains").select("*").order("hostname"),
    supabase.from("trusted_devices").select("*").order("created_at", { ascending: false }),
    supabase.from("company_invitations").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Administration SaaS"
        title="Centre de contrôle"
        description="Sociétés, licences, plateformes, modules et politiques d’accès."
      />
      <PlatformConsole
        companies={(companies ?? []) as Company[]}
        modules={(modules ?? []) as ModuleCatalogItem[]}
        companyModules={(companyModules ?? []) as CompanyModule[]}
        licenses={(licenses ?? []) as CompanyLicense[]}
        devicePolicies={(devicePolicies ?? []) as DevicePolicy[]}
        brandings={(brandings ?? []) as CompanyBranding[]}
        members={(members ?? []) as CompanyMember[]}
        domains={(domains ?? []) as CompanyDomain[]}
        trustedDevices={(trustedDevices ?? []) as TrustedDevice[]}
        invitations={(invitations ?? []) as CompanyInvitation[]}
      />
    </div>
  );
}
