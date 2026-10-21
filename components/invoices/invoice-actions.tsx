"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, BanknoteIcon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invoice } from "@/features/invoices/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [method, setMethod] = useState<"bank" | "cash">(
    invoice.payment_method ?? "bank",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (
    name: "mark_invoice_as_sent" | "mark_invoice_as_paid" | "cancel_invoice",
    args: Record<string, unknown>,
  ) => {
    setBusy(name);
    setError(null);
    const { error: rpcError } = await supabase.rpc(name, args);
    setBusy(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  };

  if (invoice.status === "cancelled") return null;
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Actions</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {invoice.status !== "paid" && (
        <div className="flex gap-2">
          <Select
            value={method}
            onValueChange={(value) => setMethod(value as "bank" | "cash")}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Banque</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={Boolean(busy)}
            onClick={() =>
              void call("mark_invoice_as_paid", {
                p_invoice_id: invoice.id,
                p_payment_method: method,
              })
            }
          >
            <BanknoteIcon className="size-4" /> Marquer payée
          </Button>
        </div>
      )}
      {invoice.status === "draft" || invoice.status === "overdue" ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={Boolean(busy)}
          onClick={() =>
            void call("mark_invoice_as_sent", { p_invoice_id: invoice.id })
          }
        >
          <SendIcon className="size-4" /> Marquer envoyée
        </Button>
      ) : null}
      {invoice.status !== "paid" && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          disabled={Boolean(busy)}
          onClick={() => {
            if (
              window.confirm(
                "Annuler cette facture ? Elle restera dans l’historique.",
              )
            )
              void call("cancel_invoice", { p_invoice_id: invoice.id });
          }}
        >
          <AlertTriangleIcon className="size-4" /> Annuler la facture
        </Button>
      )}
    </div>
  );
}
