"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, CheckCircleIcon, ClockIcon, CoinsIcon, UserIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type ProfitPayment = {
  id: string
  period_start: string
  period_end: string
  total_profit: number
  imad_share: number
  jassem_share: number
  imad_paid: boolean
  jassem_paid: boolean
  imad_payment_date: string | null
  jassem_payment_date: string | null
  notes: string | null
  created_at: string
}

export function ProfitPaymentsList({ payments }: { payments: ProfitPayment[] }) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [processing, setProcessing] = useState<string | null>(null)

  const handleMarkAsPaid = async (paymentId: string, person: "imad" | "jassem") => {
    setProcessing(`${paymentId}-${person}`)
    try {
      const updates = {
        [`${person}_paid`]: true,
        [`${person}_payment_date`]: new Date().toISOString(),
      }
      await supabase.from("profit_payments").update(updates).eq("id", paymentId)
      router.refresh()
    } catch (error) {
      console.error("Error marking as paid:", error)
    } finally {
      setProcessing(null)
    }
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CoinsIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucun paiement enregistré</p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour créer un nouveau paiement
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {payments.map((payment) => {
        const bothPaid = payment.imad_paid && payment.jassem_paid

        return (
          <Card key={payment.id} className={bothPaid ? "border-green-500/30 bg-green-500/5" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="size-5 text-primary" />
                    Période: {format(new Date(payment.period_start), "d MMM yyyy", { locale: fr })} -{" "}
                    {format(new Date(payment.period_end), "d MMM yyyy", { locale: fr })}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Créé le {format(new Date(payment.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Bénéfice total</p>
                  <p className="text-2xl font-bold text-primary">{Number(payment.total_profit).toFixed(2)} TND</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Imad */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4 text-blue-600" />
                      <span className="font-semibold text-blue-600">Imad</span>
                    </div>
                    {payment.imad_paid ? (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                        <CheckCircleIcon className="size-3.5 mr-1" />
                        Payé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-500/30 text-orange-600">
                        <ClockIcon className="size-3.5 mr-1" />
                        En attente
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{Number(payment.imad_share).toFixed(2)} TND</p>
                  {payment.imad_paid && payment.imad_payment_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Payé le {format(new Date(payment.imad_payment_date), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  )}
                  {!payment.imad_paid && (
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleMarkAsPaid(payment.id, "imad")}
                      disabled={processing === `${payment.id}-imad`}
                    >
                      {processing === `${payment.id}-imad` ? "Traitement..." : "Marquer comme payé"}
                    </Button>
                  )}
                </div>

                {/* Jassem */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserIcon className="size-4 text-purple-600" />
                      <span className="font-semibold text-purple-600">Jassem</span>
                    </div>
                    {payment.jassem_paid ? (
                      <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                        <CheckCircleIcon className="size-3.5 mr-1" />
                        Payé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-500/30 text-orange-600">
                        <ClockIcon className="size-3.5 mr-1" />
                        En attente
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{Number(payment.jassem_share).toFixed(2)} TND</p>
                  {payment.jassem_paid && payment.jassem_payment_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Payé le {format(new Date(payment.jassem_payment_date), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  )}
                  {!payment.jassem_paid && (
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleMarkAsPaid(payment.id, "jassem")}
                      disabled={processing === `${payment.id}-jassem`}
                    >
                      {processing === `${payment.id}-jassem` ? "Traitement..." : "Marquer comme payé"}
                    </Button>
                  )}
                </div>
              </div>

              {payment.notes && (
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-sm text-muted-foreground">{payment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
