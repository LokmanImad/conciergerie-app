"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, LaptopIcon, Loader2Icon, ShieldBanIcon, SmartphoneIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Company, CompanyMember, TrustedDevice } from "@/features/platform/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

const statusLabels: Record<TrustedDevice["status"], string> = {
  pending: "En attente",
  approved: "Approuvé",
  suspended: "Suspendu",
  revoked: "Révoqué",
  expired: "Expiré",
};

export function CompanyDevicesDialog({
  company,
  devices,
  members,
}: {
  company: Company;
  devices: TrustedDevice[];
  members: CompanyMember[];
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingCount = devices.filter((device) => device.status === "pending").length;

  const changeStatus = async (
    device: TrustedDevice,
    status: "approved" | "suspended" | "revoked",
  ) => {
    setSavingId(device.id);
    setError(null);
    const { error: updateError } = await supabase.rpc("set_trusted_device_status", {
      p_device_id: device.id,
      p_status: status,
    });
    setSavingId(null);
    setError(updateError?.message ?? null);
    if (!updateError) router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={pendingCount > 0 ? "default" : "outline"} size="sm">
          <LaptopIcon className="size-4" /> Appareils ({devices.length})
          {pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Appareils de {company.name}</DialogTitle>
          <DialogDescription>
            Approuvez uniquement les appareils reconnus. Une révocation prend effet sur les données dès la requête suivante.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {devices.map((device) => {
            const DeviceIcon = device.platform === "mobile" ? SmartphoneIcon : LaptopIcon;
            const busy = savingId === device.id;
            const member = members.find((item) => item.clerk_user_id === device.clerk_user_id);
            return (
              <div key={device.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <DeviceIcon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {member?.display_name || member?.email || "Utilisateur"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[member?.email, device.name].filter(Boolean).join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant={device.status === "approved" ? "default" : "outline"}>{statusLabels[device.status]}</Badge>
                        <Badge variant="secondary">{device.platform === "mobile" ? "Mobile" : "Web"}</Badge>
                        {(device.browser || device.operating_system) && (
                          <span className="text-xs text-muted-foreground">
                            {[device.browser, device.operating_system].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Demandé le {new Date(device.created_at).toLocaleString("fr-FR")}
                        {device.last_seen_at ? ` · Vu ${new Date(device.last_seen_at).toLocaleString("fr-FR")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {busy ? (
                      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        {device.status !== "approved" && device.status !== "revoked" && (
                          <Button size="sm" onClick={() => void changeStatus(device, "approved")}>
                            <CheckIcon className="size-4" /> Approuver
                          </Button>
                        )}
                        {device.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => void changeStatus(device, "suspended")}>
                            <ShieldBanIcon className="size-4" /> Suspendre
                          </Button>
                        )}
                        {device.status !== "revoked" && (
                          <Button size="sm" variant="destructive" onClick={() => void changeStatus(device, "revoked")}>
                            <XIcon className="size-4" /> Révoquer
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {devices.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun appareil n’a encore demandé d’autorisation.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
