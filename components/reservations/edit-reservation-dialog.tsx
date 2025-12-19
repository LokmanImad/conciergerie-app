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

type Reservation = {
  id: string
  apartment_id: string
  client_name: string
  check_in: string
  check_out: string
  total_amount: number
  notes: string | null
}

type Apartment = { id: string; name: string; commission_rate: number }

export function EditReservationDialog({
  reservation,
  apartments,
}: {
  reservation: Reservation
  apartments: Apartment[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [formData, setFormData] = useState({
    apartment_id: reservation.apartment_id,
    client_name: reservation.client_name,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    total_amount: reservation.total_amount.toString(),
    notes: reservation.notes || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from("reservations")
      .update({
        apartment_id: formData.apartment_id,
        client_name: formData.client_name,
        check_in: formData.check_in,
        check_out: formData.check_out,
        total_amount: Number.parseFloat(formData.total_amount),
        notes: formData.notes || null,
      })
      .eq("id", reservation.id)

    if (error) {
      console.error("[v0] Error updating reservation:", error)
      alert("Erreur lors de la modification de la réservation")
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
            <DialogTitle>Modifier la réservation</DialogTitle>
            <DialogDescription>Modifiez les informations de la réservation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="edit-client_name">Nom du client *</Label>
              <Input
                id="edit-client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-check_in">Date d'arrivée *</Label>
                <Input
                  id="edit-check_in"
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-check_out">Date de départ *</Label>
                <Input
                  id="edit-check_out"
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-total_amount">Montant total (TND) *</Label>
              <Input
                id="edit-total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
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
