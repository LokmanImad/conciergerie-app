"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  LinkIcon,
  Loader2Icon,
  MailPlusIcon,
  RotateCcwIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";

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
import type { Company, CompanyInvitation, CompanyMember } from "@/features/platform/types";

const roleLabels: Record<CompanyMember["role"], string> = {
  owner: "Propriétaire du compte",
  admin: "Administrateur",
  agent: "Agent",
  accountant: "Comptable",
  viewer: "Lecture seule",
};

const statusLabels: Record<CompanyMember["access_status"], string> = {
  pending_approval: "À autoriser",
  active: "Actif",
  suspended: "Suspendu",
  revoked: "Révoqué",
};

async function apiRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "L’opération a échoué.");
}

export function CompanyMembersDialog({
  company,
  members,
  invitations,
}: {
  company: Company;
  members: CompanyMember[];
  invitations: CompanyInvitation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyMember["role"]>("agent");
  const pendingInvitations = invitations.filter(
    (item) => item.status === "pending" && (!item.expires_at || new Date(item.expires_at) > new Date()),
  );
  const pendingMembers = members.filter((item) => item.access_status === "pending_approval");

  const refresh = () => router.refresh();

  const createOrganization = async () => {
    setSaving("organization");
    setError(null);
    try {
      await apiRequest(`/api/platform/companies/${company.id}/clerk-organization`, { method: "POST" });
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Création impossible.");
    } finally {
      setSaving(null);
    }
  };

  const inviteMember = async () => {
    if (!email.trim()) {
      setError("L’adresse e-mail est obligatoire.");
      return;
    }
    setSaving("invite");
    setError(null);
    try {
      await apiRequest(`/api/platform/companies/${company.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: name, role }),
      });
      setName("");
      setEmail("");
      setRole("agent");
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invitation impossible.");
    } finally {
      setSaving(null);
    }
  };

  const updateMember = async (
    member: CompanyMember,
    values: { active?: boolean; role: CompanyMember["role"] },
  ) => {
    setSaving(member.clerk_user_id);
    setError(null);
    try {
      await apiRequest(
        `/api/platform/companies/${company.id}/members/${encodeURIComponent(member.clerk_user_id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Modification impossible.");
    } finally {
      setSaving(null);
    }
  };

  const revokeInvitation = async (invitation: CompanyInvitation) => {
    setSaving(invitation.id);
    setError(null);
    try {
      await apiRequest(
        `/api/platform/companies/${company.id}/invitations/${invitation.id}`,
        { method: "DELETE" },
      );
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Révocation impossible.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={pendingInvitations.length || pendingMembers.length ? "default" : "outline"} size="sm">
          <UsersRoundIcon className="size-4" /> Utilisateurs ({members.filter((item) => item.active).length})
          {pendingInvitations.length + pendingMembers.length > 0 && (
            <Badge variant="secondary">{pendingInvitations.length + pendingMembers.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Utilisateurs de {company.name}</DialogTitle>
          <DialogDescription>
            Saisissez simplement l’e-mail : l’organisation, l’invitation Clerk et la synchronisation sont automatiques.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {!company.clerk_organization_id ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <LinkIcon className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-semibold">Organisation Clerk non liée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cette société existait avant l’automatisation. Créez son organisation une seule fois.
            </p>
            <Button className="mt-4" onClick={() => void createOrganization()} disabled={saving !== null}>
              {saving === "organization" ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
              Créer et associer automatiquement
            </Button>
          </div>
        ) : (
          <>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {members.map((member) => (
                <div key={member.clerk_user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <UserRoundCheckIcon className="size-4 shrink-0 text-primary" />
                      <p className="truncate text-sm font-semibold">
                        {member.display_name || member.email || member.clerk_user_id}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {member.email || member.clerk_user_id}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={member.access_status === "active" ? "default" : "outline"}
                    >
                      {statusLabels[member.access_status]}
                    </Badge>
                  </div>
                  <Select
                    value={member.role}
                    onValueChange={(nextRole) => void updateMember(member, {
                      role: nextRole as CompanyMember["role"],
                    })}
                    disabled={saving !== null}
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap items-center gap-2">
                    {member.access_status === "pending_approval" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void updateMember(member, { active: true, role: member.role })}
                          disabled={saving !== null}
                        >
                          <CheckIcon className="size-4" /> Autoriser
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateMember(member, { active: false, role: member.role })}
                          disabled={saving !== null}
                        >
                          Refuser
                        </Button>
                      </>
                    )}
                    {member.access_status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateMember(member, { active: false, role: member.role })}
                        disabled={saving !== null}
                      >
                        Suspendre
                      </Button>
                    )}
                    {member.access_status === "suspended" && (
                      <Button
                        size="sm"
                        onClick={() => void updateMember(member, { active: true, role: member.role })}
                        disabled={saving !== null}
                      >
                        Réactiver
                      </Button>
                    )}
                    {saving === member.clerk_user_id && <Loader2Icon className="size-4 animate-spin" />}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="py-5 text-center text-sm text-muted-foreground">Aucun utilisateur actif ou synchronisé.</p>
              )}
            </div>

            {pendingInvitations.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Invitations en attente</p>
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{invitation.display_name || invitation.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {invitation.email} · {roleLabels[invitation.role]}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void revokeInvitation(invitation)}
                      disabled={saving !== null}
                    >
                      {saving === invitation.id ? <Loader2Icon className="size-4 animate-spin" /> : <XIcon className="size-4" />}
                      Révoquer
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 border-t pt-4 md:grid-cols-2">
              <Field label="Nom et prénom">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ahmed Benali" />
              </Field>
              <Field label="Adresse e-mail">
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ahmed@atlas.ma" />
              </Field>
              <Field label="Rôle">
                <Select value={role} onValueChange={(value) => setRole(value as CompanyMember["role"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
          {company.clerk_organization_id && (
            <Button onClick={() => void inviteMember()} disabled={saving !== null}>
              {saving === "invite" ? <Loader2Icon className="size-4 animate-spin" /> : <MailPlusIcon className="size-4" />}
              Envoyer l’invitation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
