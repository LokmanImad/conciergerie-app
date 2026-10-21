"use client";

import { usePathname } from "next/navigation";
import { Loader2Icon, ShieldXIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AccountAccessScreen } from "@/components/account-access-screen";
import { DeviceAccessBlocked } from "@/components/device-access-blocked";
import { useAccountAccess } from "@/hooks/use-account-access";
import { useDeviceAccess } from "@/hooks/use-device-access";
import { useEntitlements } from "@/hooks/use-entitlements";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/check-in"];

export function WebAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const accountAccess = useAccountAccess(true);
  const entitlements = useEntitlements(accountAccess.allowed);
  const deviceAccess = useDeviceAccess(
    accountAccess.allowed && entitlements.configured && entitlements.webAllowed,
  );
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

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

  return children;
}
