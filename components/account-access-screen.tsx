"use client";

import { useClerk } from "@clerk/nextjs";
import {
  Clock3Icon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  UserRoundCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountAccessDecision, AccountAccessStatus } from "@/hooks/use-account-access";

const messages: Record<
  AccountAccessStatus,
  { title: string; description: string }
> = {
  checking: {
    title: "Vérification de votre compte",
    description: "Nous vérifions votre rattachement à la société.",
  },
  pending_approval: {
    title: "Compte en attente d’autorisation",
    description:
      "Votre inscription est terminée. Un administrateur de la société doit maintenant autoriser votre accès.",
  },
  suspended: {
    title: "Compte suspendu",
    description:
      "Votre accès à cette société a été suspendu. Contactez un administrateur pour le réactiver.",
  },
  revoked: {
    title: "Accès révoqué",
    description:
      "Ce compte n’est plus autorisé à accéder à cette société.",
  },
  not_assigned: {
    title: "Aucune société associée",
    description:
      "Votre compte existe, mais il n’est pas encore associé à une société. Contactez l’administrateur qui vous a invité.",
  },
  error: {
    title: "Vérification impossible",
    description:
      "Nous n’avons pas pu vérifier votre autorisation. Vérifiez votre connexion puis réessayez.",
  },
  active: { title: "Compte autorisé", description: "Votre accès est actif." },
  not_configured: { title: "Accès autorisé", description: "La validation des comptes n’est pas configurée." },
};

export function AccountAccessScreen({
  access,
  checking,
  onRetry,
}: {
  access: AccountAccessDecision;
  checking: boolean;
  onRetry: () => void;
}) {
  const { signOut } = useClerk();
  const message = messages[access.status] ?? messages.error;
  const Icon = access.status === "pending_approval" ? Clock3Icon : ShieldAlertIcon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="h-1.5 bg-primary" />
        <CardContent className="space-y-5 p-8 text-center">
          {access.company_logo_url ? (
            // The company controls this URL from the platform branding settings.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={access.company_logo_url}
              alt={access.company_name ?? "Logo de la société"}
              className="mx-auto size-16 rounded-2xl border object-contain p-2"
            />
          ) : (
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-8" />
            </div>
          )}

          <div className="space-y-2">
            {access.company_name && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {access.company_name}
              </p>
            )}
            <h1 className="text-2xl font-bold">{message.title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{message.description}</p>
          </div>

          {(access.display_name || access.email) && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
              <UserRoundCheckIcon className="size-4 text-primary" />
              <span>{access.display_name || access.email}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onRetry} disabled={checking}>
              {checking ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Vérifier à nouveau
            </Button>
            <Button variant="outline" onClick={() => void signOut({ redirectUrl: "/sign-in" })}>
              <LogOutIcon className="size-4" /> Se déconnecter
            </Button>
          </div>

          {access.status === "pending_approval" && (
            <p className="text-xs text-muted-foreground">
              L’autorisation est vérifiée automatiquement toutes les 30 secondes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
