"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon } from "lucide-react"
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
import {
  reservationToForm,
  type ApartmentOption,
  type ReservationRecord,
} from "@/features/reservations/types"
import { getReservationDatabaseError, validateReservationForm } from "@/features/reservations/validation"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"

export function EditReservationDialog({
  reservation,
  apartments,
}: {
  reservation: ReservationRecord
  apartments: ApartmentOption[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(() => reservationToForm(reservation))
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
    const { error: updateError } = await supabase
      .from("reservations")
      .update(result.data)
      .eq("id", reservation.id)

    if (updateError) {
      setError(getReservationDatabaseError(updateError))
      setLoading(false)
      return
    }

    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        setError(null)
        if (nextOpen) setForm(reservationToForm(reservation))
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 bg-transparent">
          <PencilIcon className="size-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[780px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier {reservation.reference}</DialogTitle>
            <DialogDescription>Mettez à jour le séjour, le client ou le paiement.</DialogDescription>
          </DialogHeader>
          <ReservationFormFields
            apartments={apartments}
            form={form}
            idPrefix={`edit-${reservation.id}`}
            error={error}
            onChange={setForm}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
