"use client"

import type React from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { PencilIcon } from "lucide-react"

type Apartment = {
  id: string
  name: string
  address: string
  owner_name: string
  owner_contact: string | null
  commission_rate: number
  notes: string | null
}

export function EditApartmentDialog({ apartment }: { apartment: Apartment }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    name: apartment.name,
    address: apartment.address,
    owner_name: apartment.owner_name,
    owner_contact: apartment.owner_contact || "",
    commission_rate: apartment.commission_rate.toString(),
    notes: apartment.notes || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from("apartments")
      .update({
        name: formData.name,
        address: formData.address,
        owner_name: formData.owner_name,
        owner_contact: formData.owner_contact || null,
        commission_rate: Number.parseFloat(formData.commission_rate),
        notes: formData.notes || null,
      })
      .eq("id", apartment.id)

    if (error) {
      console.error("[v0] Error updating apartment:", error)
      alert("Erreur lors de la modification de l'appartement")
    } else {
      setOpen(false)
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
          <PencilIcon className="size-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier l'appartement</DialogTitle>
            <DialogDescription>Modifiez les informations de l'appartement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom de l'appartement *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Adresse *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-owner_name">Nom du propriétaire *</Label>
              <Input
                id="edit-owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-owner_contact">Contact du propriétaire</Label>
              <Input
                id="edit-owner_contact"
                value={formData.owner_contact}
                onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission_rate">Taux de commission (%) *</Label>
              <Input
                id="edit-commission_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Modification..." : "Modifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
