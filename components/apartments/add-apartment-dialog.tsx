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
import { PlusIcon } from "lucide-react"

export function AddApartmentDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    owner_name: "",
    owner_contact: "",
    commission_rate: "25",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("apartments").insert([
      {
        name: formData.name,
        address: formData.address,
        owner_name: formData.owner_name,
        owner_contact: formData.owner_contact || null,
        commission_rate: Number.parseFloat(formData.commission_rate),
        notes: formData.notes || null,
      },
    ])

    if (error) {
      console.error("[v0] Error adding apartment:", error)
      alert("Erreur lors de l'ajout de l'appartement")
    } else {
      setOpen(false)
      setFormData({
        name: "",
        address: "",
        owner_name: "",
        owner_contact: "",
        commission_rate: "25",
        notes: "",
      })
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Ajouter un appartement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un appartement</DialogTitle>
            <DialogDescription>Entrez les informations du nouvel appartement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'appartement *</Label>
              <Input
                id="name"
                placeholder="Ex: Appartement Centre-ville"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                placeholder="Ex: 123 Rue de la République, Tunis"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Nom du propriétaire *</Label>
              <Input
                id="owner_name"
                placeholder="Ex: Mohamed Ben Ali"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_contact">Contact du propriétaire</Label>
              <Input
                id="owner_contact"
                placeholder="Ex: +216 12 345 678"
                value={formData.owner_contact}
                onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission_rate">Taux de commission (%) *</Label>
              <Input
                id="commission_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="25"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Informations supplémentaires..."
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
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
