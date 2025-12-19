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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { PlusIcon } from "lucide-react"

type Apartment = { id: string; name: string; commission_rate: number }

export function AddReservationDialog({ apartments }: { apartments: Apartment[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    apartment_id: "",
    client_name: "",
    check_in: "",
    check_out: "",
    total_amount: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("reservations").insert([
      {
        apartment_id: formData.apartment_id,
        client_name: formData.client_name,
        check_in: formData.check_in,
        check_out: formData.check_out,
        total_amount: Number.parseFloat(formData.total_amount),
        notes: formData.notes || null,
      },
    ])

    if (error) {
      console.error("[v0] Error adding reservation:", error)
      alert("Erreur lors de l'ajout de la réservation")
    } else {
      setOpen(false)
      setFormData({
        apartment_id: "",
        client_name: "",
        check_in: "",
        check_out: "",
        total_amount: "",
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
          Ajouter une réservation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une réservation</DialogTitle>
            <DialogDescription>Enregistrez une nouvelle réservation pour un appartement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apartment_id">Appartement *</Label>
              <Select
                value={formData.apartment_id}
                onValueChange={(value) => setFormData({ ...formData, apartment_id: value })}
              >
                <SelectTrigger id="apartment_id" className="w-full">
                  <SelectValue placeholder="Sélectionner un appartement" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name} (Commission: {apt.commission_rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">Nom du client *</Label>
              <Input
                id="client_name"
                placeholder="Ex: Ahmed Trabelsi"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in">Date d'arrivée *</Label>
                <Input
                  id="check_in"
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out">Date de départ *</Label>
                <Input
                  id="check_out"
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">Montant total (TND) *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
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
