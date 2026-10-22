"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2Icon, Loader2Icon, ShieldXIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AccountAccessScreen } from "@/components/account-access-screen";
import { DeviceAccessBlocked } from "@/components/device-access-blocked";
import { useAccountAccess } from "@/hooks/use-account-access";
import { useDeviceAccess } from "@/hooks/use-device-access";
import { useEntitlements } from "@/hooks/use-entitlements";
import { tenantSlugFromPathname, withTenantSlug } from "@/lib/tenant-routing";
import { UserActivityTracker } from "@/components/user-activity-tracker";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/check-in"];

export function WebAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = tenantSlugFromPathname(pathname);
  const accountAccess = useAccountAccess(true);
  const entitlements = useEntitlements(accountAccess.allowed);
  const deviceAccess = useDeviceAccess(
    accountAccess.allowed && entitlements.configured && entitlements.webAllowed,
  );
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const needsCanonicalRoute = Boolean(
    !accountAccess.loading
      && accountAccess.allowed
      && !accountAccess.platform_admin
      && accountAccess.company_slug
      && !tenantSlug,
  );

  useEffect(() => {
    if (needsCanonicalRoute && accountAccess.company_slug) {
      router.replace(withTenantSlug(pathname, accountAccess.company_slug));
    }
  }, [accountAccess.company_slug, needsCanonicalRoute, pathname, router]);

  if (isPublic) return children;

  if (accountAccess.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (accountAccess.configured && !accountAccess.allowed) {
    return (
      <AccountAccessScreen
        access={accountAccess}
        checking={accountAccess.checking}
        onRetry={() => void accountAccess.retry()}
      />
    );
  }

  if (needsCanonicalRoute) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (
    tenantSlug
    && !accountAccess.platform_admin
    && accountAccess.company_slug
    && tenantSlug !== accountAccess.company_slug
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Building2Icon className="size-7" />
            </div>
            <h1 className="text-xl font-bold">Espace société incorrect</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Votre compte appartient à un autre espace. Vous allez être redirigé vers la bonne adresse.
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-primary hover:underline"
              onClick={() => router.replace(`/${accountAccess.company_slug}`)}
            >
              Ouvrir /{accountAccess.company_slug}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (entitlements.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!entitlements.configured) return children;

  if (!entitlements.webAllowed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardContent className="space-y-3 p-8 text-center">
            <ShieldXIcon className="mx-auto size-10 text-destructive" />
            <h1 className="text-xl font-bold">Accès Web indisponible</h1>
            <p className="text-sm text-muted-foreground">
              La licence, l’accès Web ou le rattachement de votre compte à la
              société doit être activé par l’administrateur de la plateforme.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (deviceAccess.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2Icon className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (deviceAccess.configured && !deviceAccess.allowed) {
    return (
      <DeviceAccessBlocked
        status={deviceAccess.status}
        deviceId={deviceAccess.device_id}
        checking={deviceAccess.loading}
        onRetry={() => void deviceAccess.retry()}
      />
    );
  }

  return <><UserActivityTracker />{children}</>;
}
