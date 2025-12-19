"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WalletIcon, MinusIcon } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type Wallet = {
  id: string
  person_name: string
  balance: number
  updated_at: string
}

export function WalletCards({ wallets }: { wallets: Wallet[] }) {
  const [open, setOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handlePayment = async () => {
    if (!selectedWallet || !amount) return
    setLoading(true)

    const { error } = await supabase.rpc("record_wallet_reimbursement", {
      person: selectedWallet,
      payment_amount: Number.parseFloat(amount),
      payment_notes: notes || null,
    })

    if (error) {
      console.error("[v0] Error recording reimbursement:", error)
      alert("Erreur lors du remboursement")
    } else {
      setOpen(false)
      setSelectedWallet("")
      setAmount("")
      setNotes("")
      router.refresh()
    }

    setLoading(false)
  }

  const imadWallet = wallets.find((w) => w.person_name === "imad")
  const jassemWallet = wallets.find((w) => w.person_name === "jassem")

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <WalletIcon className="size-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-blue-600">Portefeuille Imad</CardTitle>
                  <CardDescription>Dépenses personnelles à rembourser</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="text-3xl font-bold text-blue-600">{(imadWallet?.balance || 0).toFixed(2)} TND</p>
            </div>
            <Button
              variant="outline"
              className="w-full border-blue-500/50 text-blue-600 hover:bg-blue-500/10 bg-transparent"
              onClick={() => {
                setSelectedWallet("imad")
                setOpen(true)
              }}
              disabled={(imadWallet?.balance || 0) <= 0}
            >
              <MinusIcon className="size-4" />
              Effectuer un remboursement
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <WalletIcon className="size-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-purple-600">Portefeuille Jassem</CardTitle>
                  <CardDescription>Dépenses personnelles à rembourser</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="text-3xl font-bold text-purple-600">{(jassemWallet?.balance || 0).toFixed(2)} TND</p>
            </div>
            <Button
              variant="outline"
              className="w-full border-purple-500/50 text-purple-600 hover:bg-purple-500/10 bg-transparent"
              onClick={() => {
                setSelectedWallet("jassem")
                setOpen(true)
              }}
              disabled={(jassemWallet?.balance || 0) <= 0}
            >
              <MinusIcon className="size-4" />
              Effectuer un remboursement
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Effectuer un remboursement</DialogTitle>
            <DialogDescription>
              Rembourser les dépenses personnelles de {selectedWallet === "imad" ? "Imad" : "Jassem"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Montant à rembourser (TND) *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (optionnel)</Label>
              <Textarea
                id="payment-notes"
                placeholder="Ajouter une note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePayment} disabled={loading || !amount}>
              {loading ? "Traitement..." : "Confirmer le remboursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
