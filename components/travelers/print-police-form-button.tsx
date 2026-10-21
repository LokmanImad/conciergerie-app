"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PrintPoliceFormButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <PrinterIcon className="mr-2 size-4" />
      Imprimer ou enregistrer en PDF
    </Button>
  )
}
