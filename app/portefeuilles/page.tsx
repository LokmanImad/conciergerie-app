import { getSupabaseServerClient } from "@/lib/supabase/server"
import { WalletCards } from "@/components/wallets/wallet-cards"
import { WalletHistory } from "@/components/wallets/wallet-history"
import { PageHeader } from "@/components/page-header"

export default async function WalletsPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: charges }, { data: reimbursements }] = await Promise.all([
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name)
      `,
      )
      .is("cancelled_at", null)
      .in("paid_by_person", ["imad", "jassem"])
      .order("date", { ascending: false }),
    supabase.from("wallet_reimbursements").select("*").order("payment_date", { ascending: false }),
  ])

  // Calculer les soldes dynamiquement à partir des charges et remboursements
  const imadCharges = charges?.filter((c) => c.paid_by_person === "imad") || []
  const jassemCharges = charges?.filter((c) => c.paid_by_person === "jassem") || []
  const imadReimbursements = reimbursements?.filter((r) => r.person_name === "imad") || []
  const jassemReimbursements = reimbursements?.filter((r) => r.person_name === "jassem") || []

  const imadBalance =
    imadCharges.reduce((sum, c) => sum + Number(c.amount), 0) -
    imadReimbursements.reduce((sum, r) => sum + Number(r.amount), 0)

  const jassemBalance =
    jassemCharges.reduce((sum, c) => sum + Number(c.amount), 0) -
    jassemReimbursements.reduce((sum, r) => sum + Number(r.amount), 0)

  // Créer un tableau de wallets avec les soldes calculés dynamiquement
  const wallets = [
    { id: "imad", person_name: "imad", balance: imadBalance, updated_at: new Date().toISOString() },
    { id: "jassem", person_name: "jassem", balance: jassemBalance, updated_at: new Date().toISOString() },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Trésorerie interne"
        title="Portefeuilles"
        description="Suivez les avances personnelles et les remboursements d'Imad et Jassem."
      />

      <WalletCards wallets={wallets} />
      <WalletHistory charges={charges || []} reimbursements={reimbursements || []} />
    </div>
  )
}
