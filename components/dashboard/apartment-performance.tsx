"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BuildingIcon, TrendingUpIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type Apartment = {
  id: string
  name: string
  address: string
  owner_name: string
  commission_rate: number
}

export function ApartmentPerformance({ apartments }: { apartments: Apartment[] }) {
  if (apartments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance des appartements</CardTitle>
          <CardDescription>Aucun appartement pour le moment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BuildingIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm mb-4">Commencez par ajouter vos appartements</p>
          <Link href="/appartements">
            <Button>Ajouter un appartement</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos appartements</CardTitle>
        <CardDescription>Liste de tous vos appartements gérés</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apartments.map((apartment) => (
          <div
            key={apartment.id}
            className="flex items-start justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <BuildingIcon className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{apartment.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{apartment.owner_name}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{apartment.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-semibold text-accent">
                  <TrendingUpIcon className="size-4" />
                  {apartment.commission_rate}%
                </div>
                <p className="text-xs text-muted-foreground">Commission</p>
              </div>
            </div>
          </div>
        ))}
        <Link href="/appartements" className="block">
          <Button variant="outline" className="w-full bg-transparent">
            Voir tous les appartements
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
