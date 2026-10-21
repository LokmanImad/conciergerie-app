import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { ApartmentPerformance } from "@/components/dashboard/apartment-performance"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, CalendarPlusIcon, UsersRoundIcon } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: apartments }, { data: reservations }, { data: charges }] = await Promise.all([
    supabase.from("apartments").select("*"),
    supabase
      .from("reservations")
      .select(
        `
        *,
        apartment:apartments(name, commission_rate)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name, paid_by)
      `,
      )
      .is("cancelled_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ])

  // Calcul des statistiques globales
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("id, total_amount, apartment:apartments(commission_rate)")
  const { data: allCharges } = await supabase
    .from("charges")
    .select("id, amount, reservation_id, service_type:service_types(name, paid_by)")
    .is("cancelled_at", null)
  const { data: allChargesForWallets } = await supabase
    .from("charges")
    .select("amount, paid_by_person")
    .is("cancelled_at", null)
    .in("paid_by_person", ["imad", "jassem"])
  const { data: reimbursements } = await supabase
    .from("wallet_reimbursements")
    .select("amount, person_name")

  // Calculer les soldes dynamiquement
  const imadCharges = allChargesForWallets?.filter((c) => c.paid_by_person === "imad") || []
  const jassemCharges = allChargesForWallets?.filter((c) => c.paid_by_person === "jassem") || []
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

  const totalRevenue = allReservations?.reduce((sum, res) => sum + Number(res.total_amount), 0) || 0
  
  // Calculer la commission en déduisant les frais de ménage liés à chaque réservation
  const totalCommission =
    allReservations?.reduce((sum, res) => {
      // Trouver UNIQUEMENT les frais de ménage liés à cette réservation (charges avec reservation_id et service_type = "ménage")
      const cleaningFees = allCharges
        ?.filter((charge: any) => {
          if (charge.reservation_id !== res.id) return false
          // Identifier les frais de ménage par le nom du service_type
          const serviceName = charge.service_type?.name?.toLowerCase() || ""
          const cleaningFeeServiceNames = ["ménage", "menage", "cleaning", "nettoyage", "frais de ménage"]
          return cleaningFeeServiceNames.some(name => serviceName.includes(name))
        })
        .reduce((sum, charge) => sum + Number(charge.amount || 0), 0) || 0
      
      // Calculer le montant après déduction des frais de ménage
      const amountAfterCleaning = Number(res.total_amount) - cleaningFees
      
      // Calculer la commission sur le montant après déduction
      // Toujours utiliser le commission_rate de l'appartement
      const apartment = Array.isArray(res.apartment) ? res.apartment[0] : res.apartment
      const commission = (amountAfterCleaning * (apartment?.commission_rate || 25)) / 100
      return sum + commission
    }, 0) || 0

  const companyCharges =
    allCharges?.filter((c: any) => c.service_type?.paid_by === "company").reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const ownerCharges =
    allCharges?.filter((c: any) => {
      // Inclure les charges payées par le propriétaire
      if (c.service_type?.paid_by === "owner") return true
      // Inclure les frais de ménage liés à une réservation
      if (c.service_type?.name === "Frais de menage" && c.reservation_id) return true
      return false
    }).reduce((sum, c) => sum + Number(c.amount), 0) || 0

  const netProfit = totalCommission - companyCharges

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Pilotage quotidien"
        title="Votre activité, en un coup d'œil"
        description="Suivez les revenus, les dépenses et les opérations importantes depuis un seul espace."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/voyageurs"><UsersRoundIcon className="size-4" /> Voyageurs</Link>
            </Button>
            <Button asChild>
              <Link href="/reservations"><CalendarPlusIcon className="size-4" /> Réservations <ArrowRightIcon className="size-4" /></Link>
            </Button>
          </>
        }
      />

      <DashboardStats
        totalRevenue={totalRevenue}
        totalCommission={totalCommission}
        companyCharges={companyCharges}
        ownerCharges={ownerCharges}
        netProfit={netProfit}
        apartmentsCount={apartments?.length || 0}
        wallets={wallets || []}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ApartmentPerformance apartments={apartments || []} />
        <RecentActivity reservations={reservations || []} charges={charges || []} />
      </div>
    </div>
  )
}
