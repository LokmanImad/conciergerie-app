"use client";

import { useClerk } from "@clerk/nextjs";
import { LaptopIcon, Loader2Icon, LogOutIcon, RefreshCwIcon, ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DeviceAccessStatus } from "@/hooks/use-device-access";

const messages: Record<DeviceAccessStatus, { title: string; description: string }> = {
  checking: {
    title: "Vérification de l’appareil",
    description: "Nous vérifions si cet appareil est autorisé.",
  },
  pending: {
    title: "Appareil en attente d’approbation",
    description: "La demande a été envoyée. Un administrateur doit approuver cet appareil dans le centre de contrôle.",
  },
  suspended: {
    title: "Appareil suspendu",
    description: "L’accès de cet appareil a été suspendu par un administrateur.",
  },
  revoked: {
    title: "Autorisation révoquée",
    description: "Cet appareil n’est plus autorisé. Une nouvelle autorisation est nécessaire.",
  },
  expired: {
    title: "Autorisation expirée",
    description: "La période d’autorisation de cet appareil est terminée.",
  },
  certificate_required: {
    title: "Certificat d’appareil obligatoire",
    description: "Cette société exige une connexion protégée par un certificat d’entreprise.",
  },
  limit_reached: {
    title: "Nombre maximal d’appareils atteint",
    description: "Un administrateur doit révoquer un ancien appareil avant d’autoriser celui-ci.",
  },
  user_mismatch: {
    title: "Appareil associé à un autre compte",
    description: "Ce profil d’appareil est déjà associé à un autre utilisateur de la société.",
  },
  error: {
    title: "Vérification impossible",
    description: "La vérification de sécurité n’a pas pu être terminée. Réessayez dans un instant.",
  },
  approved: { title: "Appareil approuvé", description: "Accès autorisé." },
  not_required: { title: "Appareil autorisé", description: "Aucune approbation n’est requise." },
};

export function DeviceAccessBlocked({
  status,
  deviceId,
  checking,
  onRetry,
}: {
  status: DeviceAccessStatus;
  deviceId: string | null;
  checking: boolean;
  onRetry: () => void;
}) {
  const { signOut } = useClerk();
  const message = messages[status] ?? messages.error;
  const Icon = status === "pending" ? LaptopIcon : ShieldAlertIcon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{message.title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{message.description}</p>
          </div>
          {deviceId && (
            <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              Référence : {deviceId.slice(0, 8)}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onRetry} disabled={checking}>
              {checking ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              Vérifier à nouveau
            </Button>
            <Button variant="outline" onClick={() => void signOut({ redirectUrl: "/sign-in" })}>
              <LogOutIcon className="size-4" /> Se déconnecter
            </Button>
          </div>
          {status === "pending" && (
            <p className="text-xs text-muted-foreground">
              La vérification est relancée automatiquement toutes les 30 secondes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
