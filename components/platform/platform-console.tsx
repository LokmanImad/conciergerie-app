"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  PaletteIcon,
  RouteIcon,
  SmartphoneIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyAccessDialog } from "@/components/platform/company-access-dialog";
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
import { DEFAULT_BRANDING_COLORS, getBrandingThemeStyle } from "@/lib/branding-theme";

type ConfigurationPayload =
  | { type: "company"; values: { status?: CompanyStatus; web_enabled?: boolean; mobile_enabled?: boolean } }
  | { type: "license"; licenseId: string; status: LicenseStatus }
  | { type: "module"; moduleKey: string; enabled: boolean }
  | { type: "device_policy"; accessMode: DevicePolicy["access_mode"] };

async function saveCompanyConfiguration(companyId: string, payload: ConfigurationPayload) {
  const response = await fetch(`/api/platform/companies/${companyId}/configuration`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "Impossible d’enregistrer la configuration.");
  }
}

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
  trustedDevices: TrustedDevice[];
  invitations: CompanyInvitation[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enabledMap = useMemo(
    () => new Map(enabledModules.map((item) => [item.module_key, item.enabled])),
    [enabledModules],
  );

  const mutate = async (key: string, payload: ConfigurationPayload) => {
    setSaving(key);
    setMessage(null);
    try {
      await saveCompanyConfiguration(company.id, payload);
      setMessage("Configuration enregistrée.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la configuration.",
      );
    } finally {
      setSaving(null);
    }
  };

  const updateCompany = (
    values: Extract<ConfigurationPayload, { type: "company" }>["values"],
  ) =>
    mutate("company", { type: "company", values });

  const toggleModule = (moduleKey: string, enabled: boolean) =>
    mutate(`module-${moduleKey}`, { type: "module", moduleKey, enabled });

  const updateLicense = (status: LicenseStatus) => {
    if (!license) return Promise.resolve();
    return mutate("license", { type: "license", licenseId: license.id, status });
  };

  const updateDeviceMode = (accessMode: DevicePolicy["access_mode"]) => {
    if (!devicePolicy) return Promise.resolve();
    return mutate("devices", { type: "device_policy", accessMode });
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
            <CompanyMembersDialog company={company} members={members} invitations={invitations} devices={trustedDevices} />
            <CompanyAccessDialog company={company} />
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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [form, setForm] = useState({
    legal_name: branding?.legal_name ?? company.name,
    primary_color: branding?.primary_color ?? DEFAULT_BRANDING_COLORS.primary,
    accent_color: branding?.accent_color ?? DEFAULT_BRANDING_COLORS.accent,
    address: branding?.address ?? "",
    phone: branding?.phone ?? "",
    email: branding?.email ?? "",
    company_identifier: branding?.company_identifier ?? "",
  });

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const resetForm = () => {
    setForm({
      legal_name: branding?.legal_name ?? company.name,
      primary_color: branding?.primary_color ?? DEFAULT_BRANDING_COLORS.primary,
      accent_color: branding?.accent_color ?? DEFAULT_BRANDING_COLORS.accent,
      address: branding?.address ?? "",
      phone: branding?.phone ?? "",
      email: branding?.email ?? "",
      company_identifier: branding?.company_identifier ?? "",
    });
    setLogoFile(null);
    setRemoveLogo(false);
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) resetForm();
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const selectLogo = (file: File | null) => {
    setMessage(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setMessage("Utilisez un logo PNG, JPG ou WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Le logo ne doit pas dépasser 2 Mo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("legal_name", form.legal_name.trim() || company.name);
      body.set("primary_color", form.primary_color);
      body.set("accent_color", form.accent_color);
      body.set("address", form.address.trim());
      body.set("phone", form.phone.trim());
      body.set("email", form.email.trim());
      body.set("company_identifier", form.company_identifier.trim());
      body.set("remove_logo", String(removeLogo));
      if (logoFile) body.set("logo", logoFile);

      const response = await fetch(`/api/platform/companies/${company.id}/branding`, {
        method: "POST",
        body,
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Impossible d’enregistrer l’identité visuelle.");
      }

      setOpen(false);
      window.dispatchEvent(
        new CustomEvent("company-branding-updated", { detail: { slug: company.slug } }),
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’identité visuelle.",
      );
    } finally {
      setSaving(false);
    }
  };

  const displayedLogo = logoPreviewUrl ?? (!removeLogo ? branding?.logo_url ?? null : null);
  const previewTheme = getBrandingThemeStyle({
    primary_color: form.primary_color,
    accent_color: form.accent_color,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PaletteIcon className="size-4" /> Identité visuelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] overflow-x-hidden overflow-y-auto sm:max-w-[min(94vw,72rem)]">
        <DialogHeader>
          <DialogTitle>Identité de {company.name}</DialogTitle>
          <DialogDescription>
            Personnalisez le logo, les couleurs et les informations utilisées dans l’espace de la société.
          </DialogDescription>
        </DialogHeader>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <div className="space-y-5 py-2">
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label>Logo de la société</Label>
              <button
                type="button"
                className="group flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/35 p-4 transition hover:border-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayedLogo ? (
                  <img src={displayedLogo} alt="Aperçu du logo" className="size-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary">
                    <ImageIcon className="size-8" />
                    <span className="text-xs font-medium">Sélectionner un logo</span>
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => selectLogo(event.target.files?.[0] ?? null)}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <UploadIcon className="size-4" /> Importer
                </Button>
                {displayedLogo && (
                  <Button type="button" size="icon" variant="outline" onClick={clearLogo} aria-label="Supprimer le logo">
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">PNG, JPG ou WebP · 2 Mo maximum.</p>
            </div>

            <div className="min-w-0 space-y-4">
              <Control label="Nom légal">
                <Input value={form.legal_name} onChange={(event) => update("legal_name", event.target.value)} />
              </Control>
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <ColorField label="Couleur principale" value={form.primary_color} onChange={(value) => update("primary_color", value)} />
                <ColorField label="Couleur d’accent" value={form.accent_color} onChange={(value) => update("accent_color", value)} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setForm((current) => ({
                  ...current,
                  primary_color: DEFAULT_BRANDING_COLORS.primary,
                  accent_color: DEFAULT_BRANDING_COLORS.accent,
                }))}
              >
                <RotateCcwIcon className="size-4" /> Couleurs par défaut
              </Button>

              <div className="overflow-hidden rounded-2xl border" style={previewTheme}>
                <div className="flex items-center gap-3 bg-sidebar p-4 text-sidebar-foreground">
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                    {displayedLogo ? <img src={displayedLogo} alt="" className="size-full object-contain" /> : <PaletteIcon className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{form.legal_name || company.name}</p>
                    <p className="text-xs text-sidebar-foreground/60">Aperçu de la marque</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-card p-4">
                  <Button type="button" size="sm">Action principale</Button>
                  <Badge className="bg-accent text-accent-foreground hover:bg-accent">Accent</Badge>
                  <span className="text-xs text-muted-foreground">Thème global</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
            <Control label="Adresse"><Input value={form.address} onChange={(event) => update("address", event.target.value)} /></Control>
            <Control label="Téléphone"><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Control>
            <Control label="Email"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Control>
            <Control label="ICE / identifiant"><Input value={form.company_identifier} onChange={(event) => update("company_identifier", event.target.value)} /></Control>
          </div>
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <Control label={label}>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-background p-1.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          aria-label={label}
        />
        <Input
          value={draft}
          maxLength={7}
          className="h-9 min-w-0 border-0 font-mono uppercase shadow-none focus-visible:ring-0"
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();
            if (/^#[0-9A-F]{0,6}$/.test(nextValue)) {
              setDraft(nextValue);
              if (/^#[0-9A-F]{6}$/.test(nextValue)) onChange(nextValue);
            }
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </Control>
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
      setError("Le nom et l’identifiant d’URL sont obligatoires.");
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
          <Control label="Identifiant d’URL">
            <div className="flex items-center gap-2">
              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                placeholder="conciergerie-atlas"
              />
              <RouteIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">La société utilisera la route /{slug || "nom-societe"}.</p>
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
