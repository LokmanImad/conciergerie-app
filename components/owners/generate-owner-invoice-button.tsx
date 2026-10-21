"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function GenerateOwnerInvoiceButton({
  apartmentId,
  month,
}: {
  apartmentId: string;
  month: string;
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("generate_owner_invoice", {
      p_apartment_id: apartmentId,
      p_period_start: `${month}-01`,
    });
    setLoading(false);
    if (error || !data) {
      alert(
        error?.message.includes("generate_owner_invoice")
          ? "Exécutez la migration 38 dans Supabase."
          : (error?.message ??
              "Impossible de générer la facture propriétaire."),
      );
      return;
    }
    router.push(`/proprietaires/factures/${data}`);
    router.refresh();
  };

  return (
    <Button size="sm" disabled={loading} onClick={() => void generate()}>
      <FilePlus2Icon className="size-4" />
      {loading ? "Génération…" : "Facture du mois"}
    </Button>
  );
}
