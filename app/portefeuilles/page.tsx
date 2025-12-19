import { getSupabaseServerClient } from "@/lib/supabase/server"
import { WalletCards } from "@/components/wallets/wallet-cards"
import { WalletHistory } from "@/components/wallets/wallet-history"

export default async function WalletsPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: wallets }, { data: charges }, { data: reimbursements }] = await Promise.all([
    supabase.from("wallets").select("*").order("person_name"),
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name)
      `,
      )
      .in("paid_by_person", ["imad", "jassem"])
      .order("date", { ascending: false }),
    supabase.from("wallet_reimbursements").select("*").order("payment_date", { ascending: false }),
  ])

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-balance text-3xl font-bold">Portefeuilles</h1>
        <p className="text-pretty text-muted-foreground mt-2">
          Suivez les dépenses personnelles d'Imad et Jassem et gérez leurs remboursements
        </p>
      </div>

      <WalletCards wallets={wallets || []} />
      <WalletHistory charges={charges || []} reimbursements={reimbursements || []} />
    </div>
  )
}
