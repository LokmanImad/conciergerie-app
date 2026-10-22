"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2Icon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { CompanyBrandingProvider } from "@/components/company-branding-provider";
import { MobileAppHeader } from "@/components/mobile-app-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WebAccessGate } from "@/components/web-access-gate";
import { stripTenantSlug, tenantSlugFromPathname, withTenantSlug } from "@/lib/tenant-routing";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/check-in"];

export function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const internalPathname = stripTenantSlug(pathname, tenantSlug);
  const isPublic = PUBLIC_PATHS.some(
    (path) => internalPathname === path || internalPathname.startsWith(`${path}/`),
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isPublic) {
      router.replace(withTenantSlug("/sign-in", tenantSlug));
    }
  }, [isLoaded, isPublic, isSignedIn, router, tenantSlug]);

  if (isPublic) {
    return <CompanyBrandingProvider tenantSlug={tenantSlug}>{children}</CompanyBrandingProvider>;
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2Icon className="size-7 animate-spin text-primary" />
        <span className="sr-only">Vérification de la session</span>
      </div>
    );
  }

  return (
    <CompanyBrandingProvider tenantSlug={tenantSlug}>
      <WebAccessGate>
        <SidebarProvider>
          <AppSidebar tenantSlug={tenantSlug} />
          <main className="app-main min-w-0 w-full">
            <MobileAppHeader />
            {children}
          </main>
        </SidebarProvider>
      </WebAccessGate>
    </CompanyBrandingProvider>
  );
}
