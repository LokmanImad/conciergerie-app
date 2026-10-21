import { createServerClient } from "@/lib/supabase/server"
import { AutoProfitPaymentsList } from "@/components/payments/auto-profit-payments-list"
import { GeneratePaymentDialog } from "@/components/payments/generate-payment-dialog"
import { PaymentSettings } from "@/components/payments/payment-settings"
import { PageHeader } from "@/components/page-header"

export default async function PaiementsPage() {
  const supabase = await createServerClient()

  // Générer automatiquement le paiement du mois en cours s'il n'existe pas
  await supabase.rpc("auto_generate_current_month_payment")

  // Récupérer tous les paiements
  const { data: payments } = await supabase
    .from("profit_payments")
    .select("*")
    .order("period_start", { ascending: false })

  // Récupérer les paramètres
  const { data: settings } = await supabase.from("payment_settings").select("*").single()

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Répartition des bénéfices"
        title="Paiements de bénéfices"
        description="Consultez les bénéfices calculés à partir des réservations et des charges, répartis entre Imad et Jassem."
      />

      <PaymentSettings settings={settings} />

      <AutoProfitPaymentsList payments={payments || []} />
    </div>
  )
}
