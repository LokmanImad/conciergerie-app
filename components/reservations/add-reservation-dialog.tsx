"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"
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
import { ReservationFormFields } from "@/components/reservations/reservation-form-fields"
import { createEmptyReservationForm, type ApartmentOption } from "@/features/reservations/types"
import { getReservationDatabaseError, validateReservationForm } from "@/features/reservations/validation"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"

export function AddReservationDialog({ apartments }: { apartments: ApartmentOption[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(createEmptyReservationForm)
  const router = useRouter()
  const supabase = useSupabaseBrowserClient()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const result = validateReservationForm(form)
    if (!result.success) {
      setError(result.error)
      return
    }

    setLoading(true)
    const { error: insertError } = await supabase.from("reservations").insert(result.data)

    if (insertError) {
      setError(getReservationDatabaseError(insertError))
      setLoading(false)
      return
    }

    setOpen(false)
    setForm(createEmptyReservationForm())
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          Ajouter une réservation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[780px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouvelle réservation</DialogTitle>
            <DialogDescription>Enregistrez le séjour, le client et le paiement initial.</DialogDescription>
          </DialogHeader>
          <ReservationFormFields
            apartments={apartments}
            form={form}
            idPrefix="new-reservation"
            error={error}
            onChange={setForm}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Créer la réservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
