"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Trash2Icon } from "lucide-react"

export function DeleteServiceTypeDialog({
  serviceTypeId,
  serviceTypeName,
}: {
  serviceTypeId: string
  serviceTypeName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleDelete = async () => {
    setLoading(true)

    const { error } = await supabase.from("service_types").delete().eq("id", serviceTypeId)

    if (error) {
      console.error("[v0] Error deleting service type:", error)
      alert("Erreur lors de la suppression du type de service")
    } else {
      setOpen(false)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10 bg-transparent">
          <Trash2Icon className="size-4" />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogDescription className="text-pretty">
            Êtes-vous sûr de vouloir supprimer le type de service{" "}
            <span className="font-semibold">{serviceTypeName}</span> ? Les charges existantes avec ce type de service ne
            seront pas supprimées.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
