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

type Apartment = { id: string; name: string }
type ServiceType = { id: string; name: string; paid_by: string }

export function AddChargeDialog({
  apartments,
  serviceTypes,
}: {
  apartments: Apartment[]
  serviceTypes: ServiceType[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    apartment_id: "",
    service_type_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    paid_by_person: "company",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Ajouter à la charge
    const { error: chargeError } = await supabase.from("charges").insert([
      {
        apartment_id: formData.apartment_id,
        service_type_id: formData.service_type_id,
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || null,
        paid_by_person: formData.paid_by_person,
        notes: formData.notes || null,
      },
    ])

    if (chargeError) {
      console.error("[v0] Error adding charge:", chargeError)
      alert("Erreur lors de l'ajout de la charge")
      setLoading(false)
      return
    }

    // Mettre à jour le portefeuille si c'est Imad ou Jassem
    if (formData.paid_by_person === "imad" || formData.paid_by_person === "jassem") {
      const amount = Number.parseFloat(formData.amount)
      const { error: walletError } = await supabase.rpc("increment_wallet", {
        person: formData.paid_by_person,
        amount: amount,
      })

      if (walletError) {
        console.error("[v0] Error updating wallet:", walletError)
      }
    }

    setOpen(false)
    setFormData({
      apartment_id: "",
      service_type_id: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      paid_by_person: "company",
      notes: "",
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Ajouter une charge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter une charge</DialogTitle>
            <DialogDescription>Enregistrez une nouvelle charge pour un appartement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
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
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_type_id">Type de service *</Label>
              <Select
                value={formData.service_type_id}
                onValueChange={(value) => setFormData({ ...formData, service_type_id: value })}
              >
                <SelectTrigger id="service_type_id" className="w-full">
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.paid_by === "company" ? "Société" : "Propriétaire"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (TND) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_by_person">Qui a payé? *</Label>
              <Select
                value={formData.paid_by_person}
                onValueChange={(value) => setFormData({ ...formData, paid_by_person: value })}
              >
                <SelectTrigger id="paid_by_person" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imad">Imad</SelectItem>
                  <SelectItem value="jassem">Jassem</SelectItem>
                  <SelectItem value="company">Société</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Détails de la charge..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes supplémentaires..."
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
