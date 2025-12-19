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

export function DeleteApartmentDialog({ apartmentId, apartmentName }: { apartmentId: string; apartmentName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleDelete = async () => {
    setLoading(true)

    const { error } = await supabase.from("apartments").delete().eq("id", apartmentId)

    if (error) {
      console.error("[v0] Error deleting apartment:", error)
      alert("Erreur lors de la suppression de l'appartement")
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
            Êtes-vous sûr de vouloir supprimer l'appartement <span className="font-semibold">{apartmentName}</span> ?
            Cette action est irréversible et supprimera également toutes les charges et réservations associées.
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
