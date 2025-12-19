import { getSupabaseServerClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { ApartmentPerformance } from "@/components/dashboard/apartment-performance"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: apartments }, { data: reservations }, { data: charges }, { data: wallets }] = await Promise.all([
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
      .limit(5),
    supabase
      .from("charges")
      .select(
        `
        *,
        apartment:apartments(name),
        service_type:service_types(name, paid_by)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("wallets").select("*"),
  ])

  // Calcul des statistiques globales
  const { data: allReservations } = await supabase
    .from("reservations")
    .select("total_amount, apartment:apartments(commission_rate)")
  const { data: allCharges } = await supabase.from("charges").select("amount, service_type:service_types(paid_by)")

  const totalRevenue = allReservations?.reduce((sum, res) => sum + Number(res.total_amount), 0) || 0
  const totalCommission =
    allReservations?.reduce((sum, res) => {
      const commission = (Number(res.total_amount) * (res.apartment?.commission_rate || 25)) / 100
      return sum + commission
    }, 0) || 0

  const companyCharges =
    allCharges?.filter((c) => c.service_type?.paid_by === "company").reduce((sum, c) => sum + Number(c.amount), 0) || 0
  const ownerCharges =
    allCharges?.filter((c) => c.service_type?.paid_by === "owner").reduce((sum, c) => sum + Number(c.amount), 0) || 0

  const netProfit = totalCommission - companyCharges

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-balance text-3xl font-bold">Dashboard</h1>
        <p className="text-pretty text-muted-foreground mt-2">Vue d'ensemble de votre activité de conciergerie</p>
      </div>

      <DashboardStats
        totalRevenue={totalRevenue}
        totalCommission={totalCommission}
        companyCharges={companyCharges}
        ownerCharges={ownerCharges}
        netProfit={netProfit}
        apartmentsCount={apartments?.length || 0}
        wallets={wallets || []}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ApartmentPerformance apartments={apartments || []} />
        <RecentActivity reservations={reservations || []} charges={charges || []} />
      </div>
    </div>
  )
}
