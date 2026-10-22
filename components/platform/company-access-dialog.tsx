"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Link2Icon, RouteIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Company } from "@/features/platform/types";

export function CompanyAccessDialog({ company }: { company: Company }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  const baseUrl = useMemo(() => `${origin}/${company.slug}`, [company.slug, origin]);

  const copy = async () => {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Link2Icon className="size-4" /> Accès</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lien d’accès de {company.name}</DialogTitle>
          <DialogDescription>
            Chaque société utilise une route dédiée sur le domaine principal. Aucune configuration DNS supplémentaire n’est nécessaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border bg-muted/20 p-5">
            <div className="flex items-center gap-2">
              <RouteIcon className="size-5 text-primary" />
              <p className="font-semibold">Adresse principale</p>
              <Badge variant="outline">/{company.slug}</Badge>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input value={baseUrl || `https://votre-domaine.ma/${company.slug}`} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={() => void copy()} disabled={!origin}>
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button asChild disabled={!origin}>
                <a href={baseUrl || undefined} target="_blank" rel="noreferrer"><ExternalLinkIcon className="size-4" /> Ouvrir</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <RouteExample label="Connexion" path={`/${company.slug}/sign-in`} />
            <RouteExample label="Tableau de bord" path={`/${company.slug}`} />
            <RouteExample label="Réservations" path={`/${company.slug}/reservations`} />
            <RouteExample label="Voyageurs" path={`/${company.slug}/voyageurs`} />
          </div>

          <p className="rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">
            L’application vérifie que l’utilisateur appartient bien à cette société. Un membre d’une autre société ne peut pas ouvrir cette route.
          </p>
        </div>

        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteExample({ label, path }: { label: string; path: string }) {
  return <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-all font-mono text-sm font-medium">{path}</p></div>;
}
