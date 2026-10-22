"use client";

import { usePathname } from "next/navigation";
import { Building2Icon, ShieldCheckIcon } from "lucide-react";

import { useCompanyBranding } from "@/components/company-branding-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { stripTenantSlug, tenantSlugFromPathname } from "@/lib/tenant-routing";

const pageNames: Record<string, string> = {
  "/": "Vue d'ensemble",
  "/appartements": "Appartements",
  "/reservations": "Réservations",
  "/voyageurs": "Voyageurs",
  "/charges": "Charges",
  "/taches": "Tâches",
  "/portefeuilles": "Portefeuilles",
  "/paiements": "Paiements",
  "/proprietaires": "Propriétaires",
  "/contrats": "Contrats",
  "/comptabilite": "Comptabilité",
  "/factures": "Factures",
  "/services": "Services",
};

export function MobileAppHeader() {
  const pathname = usePathname();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const internalPathname = stripTenantSlug(pathname, tenantSlug);
  const title = pageNames[internalPathname] ?? "Conciergerie";
  const { branding } = useCompanyBranding();

  return (
    <header
      data-app-header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl md:hidden"
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="size-10 rounded-xl border bg-card shadow-sm" />
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={`Logo ${branding.name}`} className="size-full object-contain" />
          ) : (
            <Building2Icon className="size-4" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {branding?.name ?? "Concierge"}
          </p>
          <p className="text-sm font-semibold leading-tight">{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
        <ShieldCheckIcon className="size-3 text-emerald-600" /> Privé
      </div>
    </header>
  );
}
