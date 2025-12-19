"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EditServiceTypeDialog } from "./edit-service-type-dialog"
import { DeleteServiceTypeDialog } from "./delete-service-type-dialog"
import { WrenchIcon, BuildingIcon, UserIcon } from "lucide-react"

type ServiceType = {
  id: string
  name: string
  description: string | null
  paid_by: string
  created_at: string
}

export function ServiceTypesList({ serviceTypes }: { serviceTypes: ServiceType[] }) {
  if (serviceTypes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <WrenchIcon className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Aucun type de service pour le moment</p>
          <p className="text-muted-foreground text-sm mt-1">
            Cliquez sur le bouton ci-dessus pour ajouter votre premier type de service
          </p>
        </CardContent>
      </Card>
    )
  }

  const getPayerInfo = (paidBy: string) => {
    if (paidBy === "company") {
      return {
        label: "Société",
        icon: BuildingIcon,
        variant: "default" as const,
      }
    }
    return {
      label: "Propriétaire",
      icon: UserIcon,
      variant: "secondary" as const,
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {serviceTypes.map((serviceType) => {
        const payerInfo = getPayerInfo(serviceType.paid_by)
        const PayerIcon = payerInfo.icon

        return (
          <Card key={serviceType.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <WrenchIcon className="size-5 text-primary" />
                    {serviceType.name}
                  </CardTitle>
                  {serviceType.description && (
                    <CardDescription className="text-pretty mt-2">{serviceType.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={payerInfo.variant} className="flex items-center gap-1.5">
                  <PayerIcon className="size-3.5" />
                  Payé par: {payerInfo.label}
                </Badge>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <EditServiceTypeDialog serviceType={serviceType} />
                <DeleteServiceTypeDialog serviceTypeId={serviceType.id} serviceTypeName={serviceType.name} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
