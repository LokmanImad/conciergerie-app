"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CalendarIcon, CheckCircleIcon, ClockIcon, CoinsIcon, UserIcon, SendIcon, RefreshCwIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"

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
  status?: string
}

export function AutoProfitPaymentsList({ payments }: { payments: ProfitPayment[] }) {
  const router = useRouter()
  const supabase = useSupabaseBrowserClient()
  const [processing, setProcessing] = useState<string | null>(null)
  const [sendingPaymentId, setSendingPaymentId] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState<string | null>(null)

  // Identifier le paiement du mois actuel
  const { currentMonthPayment, pastPayments } = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    // Trouver le paiement dont la période correspond au mois actuel
    const current = payments.find((payment) => {
      const start = new Date(payment.period_start)
      const startMonth = start.getMonth()
      const startYear = start.getFullYear()
      // Vérifier si le paiement correspond au mois/année actuel
      return startMonth === currentMonth && startYear === currentYear
    })

    // Séparer les paiements : mois actuel en haut, autres en bas (historique)
    // Les paiements passent automatiquement dans l'historique s'ils ne sont pas du mois actuel
    const past = payments.filter((p) => {
      const pStart = new Date(p.period_start)
      const pMonth = pStart.getMonth()
      const pYear = pStart.getFullYear()
      // Exclure le paiement du mois actuel
      return !(pMonth === currentMonth && pYear === currentYear)
    })

    return {
      currentMonthPayment: current || null,
      pastPayments: past.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()),
    }
  }, [payments])

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
      alert(`Erreur: ${error instanceof Error ? error.message : "Impossible de marquer comme payé"}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleRecalculate = async (paymentId: string) => {
    setRecalculating(paymentId)
    try {
      const { error } = await supabase.rpc("recalculate_payment", { p_payment_id: paymentId })
      if (error) {
        alert(`Erreur: ${error.message}`)
        setRecalculating(null)
      } else {
        window.location.reload()
      }
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : "Impossible de recalculer"}`)
      setRecalculating(null)
    }
  }

  const handleMarkAsSent = async (paymentId: string) => {
    setSendingPaymentId(paymentId)
    try {
      const { error } = await supabase.rpc("mark_payment_as_sent", { payment_id: paymentId })
      if (error) {
        alert(`Erreur: ${error.message || "Impossible de marquer comme envoyé"}`)
      } else {
        router.refresh()
      }
    } catch (error) {
      alert(`Erreur: ${error instanceof Error ? error.message : "Impossible de marquer comme envoyé"}`)
    } finally {
      setSendingPaymentId(null)
    }
  }

  const renderPersonCard = (payment: ProfitPayment, person: "imad" | "jassem") => {
    const isPaid = person === "imad" ? payment.imad_paid : payment.jassem_paid
    const amount = person === "imad" ? payment.imad_share : payment.jassem_share
    const paymentDate = person === "imad" ? payment.imad_payment_date : payment.jassem_payment_date
    const personName = person === "imad" ? "Imad" : "Jassem"
    const isImad = person === "imad"

    return (
      <Card key={`${payment.id}-${person}`} className="border-primary/50 bg-primary/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className={`size-5 ${isImad ? "text-blue-600" : "text-purple-600"}`} />
              {personName}
            </CardTitle>
            {isPaid ? (
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Montant du mois actuel</p>
            <p className={`text-3xl font-bold ${isImad ? "text-blue-600" : "text-purple-600"}`}>
              {Number(amount).toFixed(2)} DH
            </p>
          </div>
          {isPaid && paymentDate && (
            <p className="text-xs text-muted-foreground">
              Payé le {format(new Date(paymentDate), "d MMM yyyy à HH:mm", { locale: fr })}
            </p>
          )}
          {!isPaid && (
            <Button
              size="sm"
              className={`w-full ${isImad ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
              onClick={() => handleMarkAsPaid(payment.id, person)}
              disabled={processing === `${payment.id}-${person}`}
            >
              {processing === `${payment.id}-${person}` ? "Traitement..." : "Marquer comme payé"}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderHistoryCard = (payment: ProfitPayment) => {
    const isSent = payment.status === "sent"
    const bothPaid = payment.imad_paid && payment.jassem_paid

    return (
      <Card key={payment.id} className={bothPaid ? "border-green-500/30 bg-green-500/5" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="size-5 text-primary" />
                {format(new Date(payment.period_start), "d MMM yyyy", { locale: fr })} -{" "}
                {format(new Date(payment.period_end), "d MMM yyyy", { locale: fr })}
              </CardTitle>
              <CardDescription className="mt-2">
                Créé le {format(new Date(payment.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Bénéfice total</p>
              <p className="text-2xl font-bold text-primary">{Number(payment.total_profit).toFixed(2)} DH</p>
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
              <p className="text-2xl font-bold text-blue-600">{Number(payment.imad_share).toFixed(2)} DH</p>
              {payment.imad_paid && payment.imad_payment_date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Payé le {format(new Date(payment.imad_payment_date), "d MMM yyyy à HH:mm", { locale: fr })}
                </p>
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
              <p className="text-2xl font-bold text-purple-600">{Number(payment.jassem_share).toFixed(2)} DH</p>
              {payment.jassem_paid && payment.jassem_payment_date && (
                <p className="text-xs text-muted-foreground mt-2">
                  Payé le {format(new Date(payment.jassem_payment_date), "d MMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          </div>

          {payment.notes && (
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">{payment.notes}</p>
            </div>
          )}

          {/* Bouton "Envoyer" pour indiquer qu'on a envoyé le paiement */}
          {!isSent && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                className="w-full mb-2"
                onClick={() => handleRecalculate(payment.id)}
                disabled={recalculating === payment.id}
              >
                <RefreshCwIcon className="size-4 mr-2" />
                {recalculating === payment.id ? "Recalcul..." : "Recalculer"}
              </Button>
              <Button
                variant="outline"
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                onClick={() => handleMarkAsSent(payment.id)}
                disabled={sendingPaymentId === payment.id}
              >
                <SendIcon className="size-4 mr-2" />
                {sendingPaymentId === payment.id ? "Envoi..." : "Envoyer"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Cliquez sur "Envoyer" une fois le paiement effectué
              </p>
            </div>
          )}

          {isSent && (
            <div className="pt-3 border-t">
              <Badge className="bg-blue-600 text-white w-full justify-center py-2">
                <SendIcon className="size-3.5 mr-1" />
                Paiement envoyé
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CoinsIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucun paiement enregistré</p>
          <p className="text-muted-foreground text-sm mt-1">
            Le paiement du mois en cours sera généré automatiquement
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Mois actuel</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          {currentMonthPayment ? (
            <div className="grid md:grid-cols-2 gap-4">
              {renderPersonCard(currentMonthPayment, "imad")}
              {renderPersonCard(currentMonthPayment, "jassem")}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CoinsIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">Aucun paiement pour le mois actuel</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Le paiement sera généré automatiquement à partir des réservations et charges
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {pastPayments.length > 0 ? (
            <div className="grid gap-4">
              {pastPayments.map((payment) => renderHistoryCard(payment))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">Aucun paiement dans l'historique</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Les paiements des mois précédents apparaîtront ici
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
