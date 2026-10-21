"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  Globe2Icon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  PaletteIcon,
  SmartphoneIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDomainsDialog } from "@/components/platform/company-domains-dialog";
import { CompanyMembersDialog } from "@/components/platform/company-members-dialog";
import { CompanyDevicesDialog } from "@/components/platform/company-devices-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  Company,
  CompanyBranding,
  CompanyDomain,
  CompanyInvitation,
  CompanyLicense,
  CompanyMember,
  CompanyModule,
  CompanyStatus,
  DevicePolicy,
  LicenseStatus,
  ModuleCatalogItem,
  TrustedDevice,
} from "@/features/platform/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

const companyStatusLabels: Record<CompanyStatus, string> = {
  trial: "Essai",
  active: "Active",
  suspended: "Suspendue",
  expired: "Expirée",
  cancelled: "Résiliée",
};

const licenseStatusLabels: Record<LicenseStatus, string> = {
  trial: "Essai",
  active: "Active",
  grace: "Délai de grâce",
  suspended: "Suspendue",
  expired: "Expirée",
  cancelled: "Résiliée",
};

export function PlatformConsole({
  companies,
  modules,
  companyModules,
  licenses,
  devicePolicies,
  brandings,
  members,
  domains,
  trustedDevices,
  invitations,
}: {
  companies: Company[];
  modules: ModuleCatalogItem[];
  companyModules: CompanyModule[];
  licenses: CompanyLicense[];
  devicePolicies: DevicePolicy[];
  brandings: CompanyBranding[];
  members: CompanyMember[];
  domains: CompanyDomain[];
  trustedDevices: TrustedDevice[];
  invitations: CompanyInvitation[];
}) {
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const mobileCompanies = companies.filter((company) => company.mobile_enabled).length;
  const expiringLicenses = licenses.filter((license) => {
    if (!license.expires_at) return false;
    const remaining = new Date(license.expires_at).getTime() - Date.now();
    return remaining > 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Building2Icon} label="Sociétés" value={companies.length} />
        <Metric icon={CheckCircle2Icon} label="Actives" value={activeCompanies} />
        <Metric icon={SmartphoneIcon} label="Avec mobile" value={mobileCompanies} />
        <Metric icon={CalendarClockIcon} label="Licences à renouveler" value={expiringLicenses} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Sociétés clientes</h2>
          <p className="text-sm text-muted-foreground">
            Les changements de modules et de plateforme prennent effet immédiatement.
          </p>
        </div>
        <CreateCompanyDialog />
      </div>

      <div className="space-y-5">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            modules={modules}
            enabledModules={companyModules.filter((item) => item.company_id === company.id)}
            license={licenses.find((item) => item.company_id === company.id) ?? null}
            devicePolicy={devicePolicies.find((item) => item.company_id === company.id) ?? null}
            branding={brandings.find((item) => item.company_id === company.id) ?? null}
            members={members.filter((item) => item.company_id === company.id)}
            domains={domains.filter((item) => item.company_id === company.id)}
            trustedDevices={trustedDevices.filter((item) => item.company_id === company.id)}
            invitations={invitations.filter((item) => item.company_id === company.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2Icon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyCard({
  company,
  modules,
  enabledModules,
  license,
  devicePolicy,
  branding,
  members,
  domains,
  trustedDevices,
  invitations,
}: {
  company: Company;
  modules: ModuleCatalogItem[];
  enabledModules: CompanyModule[];
  license: CompanyLicense | null;
  devicePolicy: DevicePolicy | null;
  branding: CompanyBranding | null;
  members: CompanyMember[];
  domains: CompanyDomain[];
  trustedDevices: TrustedDevice[];
  invitations: CompanyInvitation[];
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enabledMap = useMemo(
    () => new Map(enabledModules.map((item) => [item.module_key, item.enabled])),
    [enabledModules],
  );

  const mutate = async (key: string, action: () => Promise<{ error: { message: string } | null }>) => {
    setSaving(key);
    setMessage(null);
    const { error } = await action();
    setSaving(null);
    setMessage(error ? error.message : "Configuration enregistrée.");
    if (!error) router.refresh();
  };

  const updateCompany = (values: Partial<Company>) =>
    mutate("company", async () =>
      supabase.from("companies").update(values).eq("id", company.id),
    );

  const toggleModule = (moduleKey: string, enabled: boolean) =>
    mutate(`module-${moduleKey}`, async () =>
      supabase.from("company_modules").upsert({
        company_id: company.id,
        module_key: moduleKey,
        enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }),
    );

  const updateLicense = (status: LicenseStatus) => {
    if (!license) return Promise.resolve();
    return mutate("license", async () =>
      supabase.from("company_licenses").update({ status }).eq("id", license.id),
    );
  };

  const updateDeviceMode = (accessMode: DevicePolicy["access_mode"]) => {
    if (!devicePolicy) return Promise.resolve();
    return mutate("devices", async () =>
      supabase
        .from("company_device_policies")
        .update({
          access_mode: accessMode,
          web_enforced: accessMode !== "any",
          mobile_enforced: accessMode !== "any",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", company.id),
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{company.name}</CardTitle>
              <Badge variant={company.status === "active" ? "default" : "secondary"}>
                {companyStatusLabels[company.status]}
              </Badge>
              <Badge variant="outline">{company.slug}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Organisation Clerk : {company.clerk_organization_id ?? "À associer"}
            </p>
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <CompanyDevicesDialog company={company} devices={trustedDevices} members={members} />
            <CompanyMembersDialog company={company} members={members} invitations={invitations} />
            <CompanyDomainsDialog company={company} domains={domains} />
            <BrandingDialog company={company} branding={branding} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Control label="Statut de la société">
            <Select
              value={company.status}
              onValueChange={(value) => updateCompany({ status: value as CompanyStatus })}
              disabled={saving !== null}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(companyStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Control>
          <Control label="Licence">
            <Select
              value={license?.status ?? "expired"}
              onValueChange={(value) => updateLicense(value as LicenseStatus)}
              disabled={!license || saving !== null}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(licenseStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Control>
          <Control label="Accès Web">
            <div className="flex h-9 items-center justify-between rounded-md border px-3">
              <span className="text-sm">{company.web_enabled ? "Autorisé" : "Bloqué"}</span>
              <Switch
                checked={company.web_enabled}
                onCheckedChange={(checked) => updateCompany({ web_enabled: checked })}
                disabled={saving !== null}
              />
            </div>
          </Control>
          <Control label="Application mobile">
            <div className="flex h-9 items-center justify-between rounded-md border px-3">
              <span className="text-sm">{company.mobile_enabled ? "Autorisée" : "Bloquée"}</span>
              <Switch
                checked={company.mobile_enabled}
                onCheckedChange={(checked) => updateCompany({ mobile_enabled: checked })}
                disabled={saving !== null}
              />
            </div>
          </Control>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div>
            <h3 className="mb-3 text-sm font-bold">Modules activés</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <div key={module.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{module.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {module.mobile_available ? "Web et mobile" : "Web"}
                    </p>
                  </div>
                  <Switch
                    checked={enabledMap.get(module.key) ?? false}
                    onCheckedChange={(checked) => toggleModule(module.key, checked)}
                    disabled={saving !== null}
                  />
                </div>
              ))}
            </div>
          </div>
          <Control label="Sécurité des appareils">
            <Select
              value={devicePolicy?.access_mode ?? "any"}
              onValueChange={(value) => updateDeviceMode(value as DevicePolicy["access_mode"])}
              disabled={!devicePolicy || saving !== null}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Tous les appareils</SelectItem>
                <SelectItem value="approved_only">Appareils approuvés</SelectItem>
                <SelectItem value="certificate_required">Certificat obligatoire</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              {devicePolicy?.access_mode === "approved_only"
                ? "Tout nouvel appareil sera bloqué jusqu’à son approbation."
                : devicePolicy?.access_mode === "certificate_required"
                  ? "Ce mode nécessite une passerelle d’entreprise avec certificats clients."
                  : "Les utilisateurs peuvent se connecter depuis tous leurs appareils."}
            </p>
          </Control>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingDialog({
  company,
  branding,
}: {
  company: Company;
  branding: CompanyBranding | null;
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    legal_name: branding?.legal_name ?? company.name,
    logo_url: branding?.logo_url ?? "",
    primary_color: branding?.primary_color ?? "#123F3A",
    accent_color: branding?.accent_color ?? "#C79A4A",
    address: branding?.address ?? "",
    phone: branding?.phone ?? "",
    email: branding?.email ?? "",
    company_identifier: branding?.company_identifier ?? "",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("company_branding").upsert({
      company_id: company.id,
      legal_name: form.legal_name.trim() || company.name,
      logo_url: form.logo_url.trim() || null,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      company_identifier: form.company_identifier.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setMessage(error ? error.message : null);
    if (!error) {
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PaletteIcon className="size-4" /> Identité visuelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Identité de {company.name}</DialogTitle>
          <DialogDescription>
            Ces informations alimentent l’application et les futurs documents personnalisés.
          </DialogDescription>
        </DialogHeader>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Control label="Nom légal"><Input value={form.legal_name} onChange={(event) => update("legal_name", event.target.value)} /></Control>
          <Control label="URL du logo"><Input value={form.logo_url} onChange={(event) => update("logo_url", event.target.value)} placeholder="https://..." /></Control>
          <Control label="Couleur principale"><Input type="color" value={form.primary_color} onChange={(event) => update("primary_color", event.target.value)} className="h-10" /></Control>
          <Control label="Couleur d’accent"><Input type="color" value={form.accent_color} onChange={(event) => update("accent_color", event.target.value)} className="h-10" /></Control>
          <Control label="Adresse"><Input value={form.address} onChange={(event) => update("address", event.target.value)} /></Control>
          <Control label="Téléphone"><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Control>
          <Control label="Email"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Control>
          <Control label="ICE / identifiant"><Input value={form.company_identifier} onChange={(event) => update("company_identifier", event.target.value)} /></Control>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const create = async () => {
    if (!name.trim() || !slug.trim()) {
      setError("Le nom et le sous-domaine sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/platform/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase() }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(payload.error ?? "Impossible de créer la société.");
      return;
    }
    setOpen(false);
    setName("");
    setSlug("");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusIcon className="size-4" /> Nouvelle société</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une société</DialogTitle>
          <DialogDescription>
            L’organisation Clerk et la licence d’essai de 14 jours seront créées automatiquement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Control label="Nom de la société">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Conciergerie Atlas" />
          </Control>
          <Control label="Sous-domaine">
            <div className="flex items-center gap-2">
              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                placeholder="conciergerie-atlas"
              />
              <Globe2Icon className="size-5 text-muted-foreground" />
            </div>
          </Control>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
