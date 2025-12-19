"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CoinsIcon, TrendingUpIcon, TrendingDownIcon, BuildingIcon, WalletIcon, DollarSignIcon } from "lucide-react"

type Wallet = {
  id: string
  person_name: string
  balance: number
}

export function DashboardStats({
  totalRevenue,
  totalCommission,
  companyCharges,
  ownerCharges,
  netProfit,
  apartmentsCount,
  wallets,
}: {
  totalRevenue: number
  totalCommission: number
  companyCharges: number
  ownerCharges: number
  netProfit: number
  apartmentsCount: number
  wallets: Wallet[]
}) {
  const imadWallet = wallets.find((w) => w.person_name === "imad")
  const jassemWallet = wallets.find((w) => w.person_name === "jassem")

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Revenu total</p>
              <p className="text-2xl font-bold text-primary">{totalRevenue.toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <CoinsIcon className="size-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Commission société</p>
              <p className="text-2xl font-bold text-accent">{totalCommission.toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10">
              <TrendingUpIcon className="size-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Charges société</p>
              <p className="text-2xl font-bold text-destructive">{companyCharges.toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10">
              <TrendingDownIcon className="size-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={netProfit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-destructive/20 bg-destructive/5"}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Bénéfice net</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                {netProfit.toFixed(2)} TND
              </p>
            </div>
            <div className={`p-3 rounded-lg ${netProfit >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
              <DollarSignIcon className={`size-6 ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Appartements</p>
              <p className="text-2xl font-bold">{apartmentsCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <BuildingIcon className="size-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Charges propriétaires</p>
              <p className="text-2xl font-bold">{ownerCharges.toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <TrendingDownIcon className="size-6 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Portefeuille Imad</p>
              <p className="text-2xl font-bold text-blue-600">{(imadWallet?.balance || 0).toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <WalletIcon className="size-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Portefeuille Jassem</p>
              <p className="text-2xl font-bold text-purple-600">{(jassemWallet?.balance || 0).toFixed(2)} TND</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10">
              <WalletIcon className="size-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
