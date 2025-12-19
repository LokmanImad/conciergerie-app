"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusIcon } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function AddProfitPaymentDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const totalProfit = Number(formData.get("total_profit"))
    const imadShare = totalProfit / 2
    const jassemShare = totalProfit / 2

    try {
      await supabase.from("profit_payments").insert({
        period_start: formData.get("period_start"),
        period_end: formData.get("period_end"),
        total_profit: totalProfit,
        imad_share: imadShare,
        jassem_share: jassemShare,
        notes: formData.get("notes") || null,
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error adding profit payment:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 size-4" />
          Nouveau paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un paiement de bénéfices</DialogTitle>
          <DialogDescription>
            Enregistrez un nouveau paiement de bénéfices pour Imad et Jassem (50/50)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period_start">Date début</Label>
              <Input type="date" id="period_start" name="period_start" required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="period_end">Date fin</Label>
              <Input type="date" id="period_end" name="period_end" required className="mt-2" />
            </div>
          </div>
          <div>
            <Label htmlFor="total_profit">Bénéfice total (TND)</Label>
            <Input
              type="number"
              step="0.01"
              id="total_profit"
              name="total_profit"
              placeholder="1000.00"
              required
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Sera divisé en 50% pour Imad et 50% pour Jassem</p>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea id="notes" name="notes" placeholder="Notes ou commentaires..." className="mt-2" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
