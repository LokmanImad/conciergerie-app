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
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {serviceTypes.map((serviceType) => {
        const payerInfo = getPayerInfo(serviceType.paid_by)
        const PayerIcon = payerInfo.icon

        return (
          <Card key={serviceType.id} className="group overflow-hidden bg-card/85 transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><WrenchIcon className="size-5" /></span>
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
