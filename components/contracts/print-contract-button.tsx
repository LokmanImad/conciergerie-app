"use client"

import { useState } from "react"
import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"

export function PrintContractButton({ contractId, status }: { contractId: string; status: string }) {
  const supabase = useSupabaseBrowserClient()
  const [busy, setBusy] = useState(false)

  const print = async () => {
    setBusy(true)
    if (status === "draft") {
      await supabase.from("owner_contracts").update({ status: "generated", generated_at: new Date().toISOString() }).eq("id", contractId)
    }
    setBusy(false)
    window.print()
  }

  return <Button disabled={busy} onClick={() => void print()}><PrinterIcon className="size-4" /> {busy ? "Préparation…" : "Imprimer ou enregistrer en PDF"}</Button>
}
