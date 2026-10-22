"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { PublicCompanyBranding } from "@/features/platform/types";
import { getBrandingThemeStyle } from "@/lib/branding-theme";

type BrandingContextValue = {
  branding: PublicCompanyBranding | null;
  loading: boolean;
};

const BrandingContext = createContext<BrandingContextValue>({ branding: null, loading: false });

export function CompanyBrandingProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string | null;
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState<PublicCompanyBranding | null>(null);
  const [loading, setLoading] = useState(Boolean(tenantSlug));

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!tenantSlug) {
        setBranding(null);
        setLoading(false);
        return;
      }

      setBranding(null);
      setLoading(true);
      try {
        const response = await fetch(`/api/public/branding/${encodeURIComponent(tenantSlug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setBranding(null);
          return;
        }
        const payload = (await response.json()) as { branding: PublicCompanyBranding };
        setBranding(payload.branding);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setBranding(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail;
      if (!detail?.slug || detail.slug === tenantSlug) void load();
    };
    window.addEventListener("company-branding-updated", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("company-branding-updated", refresh);
    };
  }, [tenantSlug]);

  const themeStyle = useMemo(() => getBrandingThemeStyle(branding), [branding]);
  const value = useMemo(() => ({ branding, loading }), [branding, loading]);

  useEffect(() => {
    const root = document.documentElement;
    const properties = Object.entries(themeStyle ?? {});
    const previousValues = new Map(
      properties.map(([property]) => [property, root.style.getPropertyValue(property)]),
    );

    for (const [property, propertyValue] of properties) {
      root.style.setProperty(property, String(propertyValue));
    }

    return () => {
      for (const [property, previousValue] of previousValues) {
        if (previousValue) root.style.setProperty(property, previousValue);
        else root.style.removeProperty(property);
      }
    };
  }, [themeStyle]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useCompanyBranding() {
  return useContext(BrandingContext);
}
