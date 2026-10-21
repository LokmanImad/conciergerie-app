import { BillingSettingsForm } from "@/components/invoices/billing-settings-form";
import { PageHeader } from "@/components/page-header";
import type { BillingSettings } from "@/features/invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function InvoiceSettingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("billing_settings")
    .select("*")
    .single();
  if (!data)
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Configuration"
          title="Paramètres de facturation"
          description="Installez la migration 37 pour continuer."
        />
      </div>
    );
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres de facturation"
        description="Identité de l’entreprise, échéances, taxe et informations bancaires."
      />
      <BillingSettingsForm settings={data as BillingSettings} />
    </div>
  );
}
