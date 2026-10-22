"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ReceiptIcon, UserIcon, CoinsIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModuleVisibility } from "@/components/module-visibility"
import { useModuleEntitlements } from "@/components/module-entitlements-context"

type Reservation = {
  id: string
  client_name: string
  total_amount: number
  check_in: string
  apartment: { name: string; commission_rate: number } | null
  created_at: string
}

type Charge = {
  id: string
  amount: number
  date: string
  paid_by_person: string
  apartment: { name: string } | null
  service_type: { name: string; paid_by: string } | null
  created_at: string
}

export function RecentActivity({
  reservations,
  charges,
}: {
  reservations: Reservation[]
  charges: Charge[]
}) {
  const entitlements = useModuleEntitlements()
  // Combiner et trier les activités par date de création
  const activities = [
    ...(entitlements.canUse("reservations")
      ? reservations.map((r) => ({ type: "reservation" as const, data: r, created_at: r.created_at }))
      : []),
    ...(entitlements.canUse("charges")
      ? charges.map((c) => ({ type: "charge" as const, data: c, created_at: c.created_at }))
      : []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>Aucune activité pour le moment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CalendarIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Les activités récentes apparaîtront ici</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full overflow-hidden bg-card/80 flex flex-col">
      <CardHeader className="border-b border-border/60 bg-muted/25">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
            <CalendarIcon className="size-5" />
          </div>
          <div>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription className="mt-1">Dernières opérations enregistrées</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {activities.slice(0, 3).map((activity, index) => {
          if (activity.type === "reservation") {
            const res = activity.data as Reservation
            return (
              <div key={`res-${res.id}`} className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border/60 hover:bg-muted/35">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <UserIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Nouvelle réservation - {res.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{res.apartment?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <CoinsIcon className="size-3 mr-1" />
                      {Number(res.total_amount).toFixed(2)} DH
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(res.check_in), "d MMM", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            )
          } else {
            const charge = activity.data as Charge
            return (
              <div key={`charge-${charge.id}`} className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border/60 hover:bg-muted/35">
                <div className="p-2.5 rounded-xl bg-destructive/10 shrink-0">
                  <ReceiptIcon className="size-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Charge - {charge.service_type?.name || "Service inconnu"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{charge.apartment?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <CoinsIcon className="size-3 mr-1" />
                      {Number(charge.amount).toFixed(2)} DH
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {charge.paid_by_person === "imad"
                        ? "Imad"
                        : charge.paid_by_person === "jassem"
                          ? "Jassem"
                          : "Société"}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          }
        })}
        <div className="mt-auto pt-2">
          <div className="grid grid-cols-2 gap-2">
            <ModuleVisibility moduleKey="reservations">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/reservations">Réservations</Link>
              </Button>
            </ModuleVisibility>
            <ModuleVisibility moduleKey="charges">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/charges">Charges</Link>
              </Button>
            </ModuleVisibility>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
