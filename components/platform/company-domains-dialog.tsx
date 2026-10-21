"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2Icon, Loader2Icon, PlusIcon } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company, CompanyDomain } from "@/features/platform/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function CompanyDomainsDialog({
  company,
  domains,
}: {
  company: Company;
  domains: CompanyDomain[];
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [domainType, setDomainType] = useState<CompanyDomain["domain_type"]>("subdomain");

  const addDomain = async () => {
    const normalized = hostname.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!normalized || normalized.includes("/")) {
      setError("Saisissez uniquement un nom dâ€™hÃ´te, par exemple atlas.votredomaine.com.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from("company_domains").insert({
      company_id: company.id,
      hostname: normalized,
      domain_type: domainType,
      verification_status: "pending",
      is_primary: domains.length === 0,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setHostname("");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Globe2Icon className="size-4" /> Domaines ({domains.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Domaines de {company.name}</DialogTitle>
          <DialogDescription>
            Le domaine reste en attente jusquâ€™Ã  la configuration DNS et Ã  sa vÃ©rification technique.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="space-y-2">
          {domains.map((domain) => (
            <div key={domain.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{domain.hostname}</p>
                <p className="text-xs text-muted-foreground">{domain.domain_type === "custom" ? "Domaine personnalisÃ©" : "Sous-domaine"}</p>
              </div>
              <Badge variant={domain.verification_status === "verified" ? "default" : "outline"}>
                {domain.verification_status === "verified" ? "VÃ©rifiÃ©" : domain.verification_status === "failed" ? "Ã‰chec" : "En attente"}
              </Badge>
            </div>
          ))}
          {domains.length === 0 && <p className="text-sm text-muted-foreground">Aucun domaine enregistrÃ©.</p>}
        </div>
        <div className="grid gap-3 border-t pt-4 md:grid-cols-[1fr_180px]">
          <Field label="Nom dâ€™hÃ´te"><Input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="atlas.votredomaine.com" /></Field>
          <Field label="Type">
            <Select value={domainType} onValueChange={(value) => setDomainType(value as CompanyDomain["domain_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="subdomain">Sous-domaine</SelectItem>
                <SelectItem value="custom">PersonnalisÃ©</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
          <Button onClick={() => void addDomain()} disabled={saving}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
