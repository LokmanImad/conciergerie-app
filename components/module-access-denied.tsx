import Link from "next/link";
import { ArrowLeftIcon, BlocksIcon, ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MODULE_LABELS } from "@/lib/module-access";

export function ModuleAccessDenied({
  moduleKey,
  dashboardHref,
  verificationFailed = false,
}: {
  moduleKey?: string | null;
  dashboardHref: string;
  verificationFailed?: boolean;
}) {
  const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] ?? moduleKey : null;

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl border-border/70 shadow-xl shadow-black/5">
        <CardContent className="space-y-6 p-8 text-center sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            {verificationFailed ? <ShieldAlertIcon className="size-8" /> : <BlocksIcon className="size-8" />}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Accès contrôlé
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {verificationFailed ? "Accès impossible à vérifier" : "Module non activé"}
            </h1>
            <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
              {verificationFailed
                ? "La vérification de vos autorisations a échoué. Réessayez dans quelques instants ou contactez l’administrateur."
                : `Le module « ${moduleLabel ?? "demandé"} » n’est pas inclus dans les accès de cette société.`}
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href={dashboardHref}>
              <ArrowLeftIcon className="size-4" />
              Retour à mon espace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

