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
import { PencilIcon } from "lucide-react"

type Charge = {
  id: string
  apartment_id: string
  service_type_id: string
  amount: number
  date: string
  description: string | null
  paid_by_person: string
  notes: string | null
}

type Apartment = { id: string; name: string }
type ServiceType = { id: string; name: string; paid_by: string }

export function EditChargeDialog({
  charge,
  apartments,
  serviceTypes,
}: {
  charge: Charge
  apartments: Apartment[]
  serviceTypes: ServiceType[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    apartment_id: charge.apartment_id,
    service_type_id: charge.service_type_id,
    amount: charge.amount.toString(),
    date: charge.date,
    description: charge.description || "",
    paid_by_person: charge.paid_by_person,
    notes: charge.notes || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from("charges")
      .update({
        apartment_id: formData.apartment_id,
        service_type_id: formData.service_type_id,
        amount: Number.parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || null,
        paid_by_person: formData.paid_by_person,
        notes: formData.notes || null,
      })
      .eq("id", charge.id)

    if (error) {
      console.error("[v0] Error updating charge:", error)
      alert("Erreur lors de la modification de la charge")
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
            <DialogTitle>Modifier la charge</DialogTitle>
            <DialogDescription>Modifiez les informations de la charge</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-apartment_id">Appartement *</Label>
              <Select
                value={formData.apartment_id}
                onValueChange={(value) => setFormData({ ...formData, apartment_id: value })}
              >
                <SelectTrigger id="edit-apartment_id" className="w-full">
                  <SelectValue />
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
              <Label htmlFor="edit-service_type_id">Type de service *</Label>
              <Select
                value={formData.service_type_id}
                onValueChange={(value) => setFormData({ ...formData, service_type_id: value })}
              >
                <SelectTrigger id="edit-service_type_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Montant (TND) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paid_by_person">Qui a payé? *</Label>
              <Select
                value={formData.paid_by_person}
                onValueChange={(value) => setFormData({ ...formData, paid_by_person: value })}
              >
                <SelectTrigger id="edit-paid_by_person" className="w-full">
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
