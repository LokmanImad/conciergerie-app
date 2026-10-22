"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  CopyIcon,
  LaptopIcon,
  LinkIcon,
  Loader2Icon,
  MailIcon,
  MailPlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
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
import type { Company, CompanyInvitation, CompanyMember, TrustedDevice } from "@/features/platform/types";

const PAGE_SIZE = 5;

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

function formatDate(value: string | null | undefined, fallback = "Jamais") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function apiRequest<T = Record<string, unknown>>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(payload.error ?? "L’opération a échoué.");
  return payload;
}

export function CompanyMembersDialog({ company, members, invitations, devices }: {
  company: Company;
  members: CompanyMember[];
  invitations: CompanyInvitation[];
  devices: TrustedDevice[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyMember["role"]>("agent");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CompanyMember["access_status"]>("all");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);

  const pendingInvitations = invitations.filter(
    (item) => item.status === "pending" && (!item.expires_at || new Date(item.expires_at) > new Date()),
  );
  const pendingMembers = members.filter((item) => item.access_status === "pending_approval");
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesStatus = status === "all" || member.access_status === status;
      const matchesQuery = !normalizedQuery || [member.display_name, member.email, member.clerk_user_id, roleLabels[member.role]]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [members, query, status]);
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const visibleMembers = filteredMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query, status]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const refresh = () => router.refresh();
  const resetFeedback = () => { setError(null); setNotice(null); };

  const createOrganization = async () => {
    setSaving("organization"); resetFeedback();
    try {
      await apiRequest(`/api/platform/companies/${company.id}/clerk-organization`, { method: "POST" });
      setNotice("L’organisation Clerk a été créée et associée."); refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Création impossible.");
    } finally { setSaving(null); }
  };

  const synchronize = async () => {
    setSaving("sync"); resetFeedback();
    try {
      const result = await apiRequest<{ members: number; invitations: number }>(`/api/platform/companies/${company.id}/sync`, { method: "POST" });
      setNotice(`${result.members} utilisateur(s) et ${result.invitations} invitation(s) synchronisés avec Clerk.`);
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Synchronisation impossible.");
    } finally { setSaving(null); }
  };

  const inviteMember = async () => {
    if (!email.trim()) { setError("L’adresse e-mail est obligatoire."); return; }
    setSaving("invite"); resetFeedback();
    try {
      await apiRequest(`/api/platform/companies/${company.id}/invitations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, displayName: name, role }),
      });
      setName(""); setEmail(""); setRole("agent"); setNotice("L’invitation a été envoyée."); refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Invitation impossible.");
    } finally { setSaving(null); }
  };

  const updateMember = async (member: CompanyMember, values: { active?: boolean; role: CompanyMember["role"] }) => {
    setSaving(member.clerk_user_id); resetFeedback();
    try {
      await apiRequest(`/api/platform/companies/${company.id}/members/${encodeURIComponent(member.clerk_user_id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      });
      setNotice("Les autorisations de l’utilisateur ont été mises à jour."); refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Modification impossible.");
    } finally { setSaving(null); }
  };

  const revokeInvitation = async (invitation: CompanyInvitation) => {
    setSaving(invitation.id); resetFeedback();
    try {
      const result = await apiRequest<{ message?: string }>(`/api/platform/companies/${company.id}/invitations/${invitation.id}`, { method: "DELETE" });
      setNotice(result.message ?? "L’invitation a été actualisée."); refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Révocation impossible.");
    } finally { setSaving(null); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={pendingInvitations.length || pendingMembers.length ? "default" : "outline"} size="sm">
          <UsersRoundIcon className="size-4" /> Utilisateurs ({members.filter((item) => item.active).length})
          {pendingInvitations.length + pendingMembers.length > 0 && <Badge variant="secondary">{pendingInvitations.length + pendingMembers.length}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[calc(100vw-3rem)] xl:max-w-[88rem]">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>Utilisateurs de {company.name}</DialogTitle>
              <DialogDescription className="mt-1">Invitations, autorisations, sécurité et activité des comptes.</DialogDescription>
            </div>
            {company.clerk_organization_id && (
              <Button variant="outline" size="sm" onClick={() => void synchronize()} disabled={saving !== null}>
                {saving === "sync" ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />} Synchroniser Clerk
              </Button>
            )}
          </div>
        </DialogHeader>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-800">{notice}</p>}

        {!company.clerk_organization_id ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <LinkIcon className="mx-auto size-9 text-primary" />
            <p className="mt-3 font-semibold">Organisation Clerk non liée</p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">Cette société existait avant l’automatisation. Créez son organisation une seule fois.</p>
            <Button className="mt-4" onClick={() => void createOrganization()} disabled={saving !== null}>
              {saving === "organization" ? <Loader2Icon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />} Créer et associer automatiquement
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom, e-mail ou rôle" className="pl-9" />
              </div>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-2xl border">
              <div className="hidden grid-cols-[minmax(250px,1.4fr)_150px_170px_190px_110px] gap-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
                <span>Utilisateur</span><span>Accès</span><span>Rôle</span><span>Dernière activité</span><span className="text-right">Actions</span>
              </div>
              <div className="divide-y">
                {visibleMembers.map((member) => {
                  const memberDevices = devices.filter((device) => device.clerk_user_id === member.clerk_user_id);
                  const lastActivity = member.last_seen_at ?? member.last_active_at ?? member.last_sign_in_at;
                  return (
                    <div key={member.clerk_user_id}>
                      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(250px,1.4fr)_150px_170px_190px_110px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                              {member.avatar_url ? <img src={member.avatar_url} alt="" className="size-full object-cover" /> : <UserRoundCheckIcon className="size-5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{member.display_name || "Utilisateur"}</p>
                              <button type="button" className="mt-0.5 flex max-w-full items-start gap-1 text-left text-xs text-muted-foreground hover:text-foreground" onClick={() => member.email && void navigator.clipboard.writeText(member.email)} title="Copier l’adresse e-mail">
                                <MailIcon className="mt-0.5 size-3.5 shrink-0" /><span className="break-all">{member.email || member.clerk_user_id}</span>{member.email && <CopyIcon className="mt-0.5 size-3 shrink-0" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Badge variant={member.access_status === "active" ? "default" : "outline"}>{statusLabels[member.access_status]}</Badge>
                          {(member.locked || member.banned) && <Badge variant="destructive" className="ml-1">Clerk bloqué</Badge>}
                        </div>
                        <Select value={member.role} onValueChange={(nextRole) => void updateMember(member, { role: nextRole as CompanyMember["role"] })} disabled={saving !== null}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="text-sm"><p className="font-medium">{formatDate(lastActivity)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><LaptopIcon className="size-3.5" /> {memberDevices.length} appareil(s)</p></div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedMember(selectedMember?.clerk_user_id === member.clerk_user_id ? null : member)}>Détails</Button>
                          {saving === member.clerk_user_id && <Loader2Icon className="size-4 animate-spin" />}
                        </div>
                      </div>

                      {selectedMember?.clerk_user_id === member.clerk_user_id && (
                        <div className="border-t bg-muted/20 p-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Detail icon={CalendarClockIcon} label="Compte créé" value={formatDate(member.clerk_created_at ?? member.created_at)} />
                            <Detail icon={ShieldCheckIcon} label="Dernière connexion" value={formatDate(member.last_sign_in_at)} />
                            <Detail icon={Clock3Icon} label="Vu dans l’application" value={formatDate(member.last_seen_at)} />
                            <Detail icon={RefreshCwIcon} label="Synchronisé" value={formatDate(member.last_synced_at, "Non synchronisé")} />
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Mot de passe : {member.password_enabled ? "configuré" : "non renseigné"}</Badge>
                            <Badge variant="outline">Double authentification : {member.two_factor_enabled ? "activée" : "non activée"}</Badge>
                            {member.access_status === "pending_approval" && <><Button size="sm" onClick={() => void updateMember(member, { active: true, role: member.role })} disabled={saving !== null}><CheckIcon className="size-4" /> Autoriser</Button><Button size="sm" variant="outline" onClick={() => void updateMember(member, { active: false, role: member.role })} disabled={saving !== null}>Refuser</Button></>}
                            {member.access_status === "active" && <Button size="sm" variant="outline" onClick={() => void updateMember(member, { active: false, role: member.role })} disabled={saving !== null}>Suspendre</Button>}
                            {member.access_status === "suspended" && <Button size="sm" onClick={() => void updateMember(member, { active: true, role: member.role })} disabled={saving !== null}>Réactiver</Button>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleMembers.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur ne correspond à ces critères.</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{filteredMembers.length} utilisateur(s) · Page {page} sur {pageCount}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Page précédente"><ChevronLeftIcon className="size-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} aria-label="Page suivante"><ChevronRightIcon className="size-4" /></Button>
              </div>
            </div>

            {pendingInvitations.length > 0 && (
              <div className="space-y-2 rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Invitations en attente</p>
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="text-sm font-semibold">{invitation.display_name || "Invitation"}</p><p className="break-all text-xs text-muted-foreground">{invitation.email} · {roleLabels[invitation.role]} · expire {formatDate(invitation.expires_at)}</p></div>
                    <Button size="sm" variant="ghost" onClick={() => void revokeInvitation(invitation)} disabled={saving !== null}>{saving === invitation.id ? <Loader2Icon className="size-4 animate-spin" /> : <XIcon className="size-4" />} Révoquer</Button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border p-4">
              <div className="mb-4"><p className="font-semibold">Inviter un utilisateur</p><p className="text-sm text-muted-foreground">Clerk lui enverra un lien sécurisé vers l’espace de {company.name}.</p></div>
              <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(230px,1.25fr)_210px_auto] lg:items-end">
                <Field label="Nom et prénom"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ahmed Benali" /></Field>
                <Field label="Adresse e-mail"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ahmed@atlas.ma" /></Field>
                <Field label="Rôle"><Select value={role} onValueChange={(value) => setRole(value as CompanyMember["role"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
                <Button onClick={() => void inviteMember()} disabled={saving !== null}>{saving === "invite" ? <Loader2Icon className="size-4 animate-spin" /> : <MailPlusIcon className="size-4" />} Envoyer</Button>
              </div>
            </div>
          </>
        )}

        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock3Icon; label: string; value: string }) {
  return <div className="rounded-xl border bg-background p-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}
