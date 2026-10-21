"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BanIcon, CheckCircle2Icon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OwnerInvoiceStatus } from "@/features/owner-invoices/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function OwnerInvoiceActions({
  id,
  status,
}: {
  id: string;
  status: OwnerInvoiceStatus;
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [working, setWorking] = useState<OwnerInvoiceStatus | null>(null);

  const update = async (nextStatus: "sent" | "settled" | "cancelled") => {
    if (
      nextStatus === "cancelled" &&
      !confirm("Annuler cette facture propriétaire ?")
    )
      return;
    setWorking(nextStatus);
    const { error } = await supabase.rpc("set_owner_invoice_status", {
      p_owner_invoice_id: id,
      p_status: nextStatus,
    });
    setWorking(null);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  };

  if (status === "cancelled") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && (
        <Button
          variant="outline"
          onClick={() => void update("sent")}
          disabled={Boolean(working)}
        >
          <SendIcon className="size-4" /> Marquer envoyée
        </Button>
      )}
      {status !== "settled" && (
        <Button
          onClick={() => void update("settled")}
          disabled={Boolean(working)}
        >
          <CheckCircle2Icon className="size-4" /> Versement effectué
        </Button>
      )}
      {status !== "settled" && (
        <Button
          variant="destructive"
          onClick={() => void update("cancelled")}
          disabled={Boolean(working)}
        >
          <BanIcon className="size-4" /> Annuler
        </Button>
      )}
    </div>
  );
}
