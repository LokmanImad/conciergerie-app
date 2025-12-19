import { createServerClient } from "@/lib/supabase/server"
import { AutoProfitPaymentsList } from "@/components/payments/auto-profit-payments-list"
import { GeneratePaymentDialog } from "@/components/payments/generate-payment-dialog"
import { PaymentSettings } from "@/components/payments/payment-settings"
import { CoinsIcon } from "lucide-react"

export default async function PaiementsPage() {
  const supabase = await createServerClient()

  // Récupérer tous les paiements
  const { data: payments } = await supabase
    .from("profit_payments")
    .select("*")
    .order("period_start", { ascending: false })

  // Récupérer les paramètres
  const { data: settings } = await supabase.from("payment_settings").select("*").single()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold flex items-center gap-3">
            <CoinsIcon className="size-8 text-primary" />
            Paiements de bénéfices
          </h1>
          <p className="text-pretty text-muted-foreground mt-1">
            Bénéfices calculés automatiquement à partir des réservations et charges (50/50 entre Imad et Jassem)
          </p>
        </div>
        <GeneratePaymentDialog />
      </div>

      <PaymentSettings settings={settings} />

      <AutoProfitPaymentsList payments={payments || []} />
    </div>
  )
}
