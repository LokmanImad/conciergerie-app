"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditApartmentDialog } from "./edit-apartment-dialog"
import { DeleteApartmentDialog } from "./delete-apartment-dialog"
import { BuildingIcon, MapPinIcon, UserIcon, PercentIcon } from "lucide-react"

type Apartment = {
  id: string
  name: string
  address: string
  owner_name: string
  owner_contact: string | null
  commission_rate: number
  notes: string | null
  created_at: string
  updated_at: string
}

export function ApartmentsList({ apartments }: { apartments: Apartment[] }) {
  if (apartments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BuildingIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucun appartement pour le moment</p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour ajouter votre premier appartement
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {apartments.map((apartment) => (
        <Card key={apartment.id} className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <BuildingIcon className="size-5 text-primary" />
                  {apartment.name}
                </CardTitle>
                <CardDescription className="flex items-start gap-2 mt-2">
                  <MapPinIcon className="size-4 shrink-0 mt-0.5" />
                  <span className="text-pretty">{apartment.address}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="size-4 text-muted-foreground" />
              <span className="font-medium">{apartment.owner_name}</span>
            </div>
            {apartment.owner_contact && (
              <div className="text-sm text-muted-foreground">
                <span>{apartment.owner_contact}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <PercentIcon className="size-4 text-muted-foreground" />
              <span>
                Commission: <span className="font-semibold text-primary">{apartment.commission_rate}%</span>
              </span>
            </div>
            {apartment.notes && (
              <p className="text-pretty text-sm text-muted-foreground border-t pt-3 mt-3">{apartment.notes}</p>
            )}
            <div className="flex gap-2 pt-3 border-t">
              <EditApartmentDialog apartment={apartment} />
              <DeleteApartmentDialog apartmentId={apartment.id} apartmentName={apartment.name} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
