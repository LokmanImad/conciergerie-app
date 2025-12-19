"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsIcon } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Settings = {
  id: string
  payment_frequency_months: number
}

export function PaymentSettings({ settings }: { settings: Settings | null }) {
  const [months, setMonths] = useState(settings?.payment_frequency_months || 3)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleSave = async () => {
    setSaving(true)
    try {
      if (settings) {
        await supabase.from("payment_settings").update({ payment_frequency_months: months }).eq("id", settings.id)
      } else {
        await supabase.from("payment_settings").insert({ payment_frequency_months: months })
      }
      router.refresh()
    } catch (error) {
      console.error("Error saving settings:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="size-5" />
          Configuration des paiements
        </CardTitle>
        <CardDescription>Définissez la fréquence des paiements de bénéfices</CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="frequency">Fréquence de paiement (mois)</Label>
          <Input
            id="frequency"
            type="number"
            min="1"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-2"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </CardContent>
    </Card>
  )
}
