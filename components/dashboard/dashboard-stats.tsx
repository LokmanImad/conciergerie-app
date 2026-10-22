"use client"

import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  CircleDollarSignIcon,
  CoinsIcon,
  LandmarkIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletCardsIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { ModuleVisibility } from "@/components/module-visibility"

type Wallet = {
  id: string
  person_name: string
  balance: number
}

const amountFormatter = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

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
  const imadWallet = wallets.find((wallet) => wallet.person_name === "imad")
  const jassemWallet = wallets.find((wallet) => wallet.person_name === "jassem")

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow">Indicateurs essentiels</p>
          <h2 className="text-xl font-bold">Performance financière</h2>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">Montants cumulés · MAD</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleVisibility moduleKey="reservations">
          <MetricCard label="Revenu total" value={`${amountFormatter.format(totalRevenue)} DH`} icon={CoinsIcon} tone="teal" />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="reservations">
          <MetricCard label="Commission société" value={`${amountFormatter.format(totalCommission)} DH`} icon={TrendingUpIcon} tone="gold" />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="charges">
          <MetricCard label="Charges société" value={`${amountFormatter.format(companyCharges)} DH`} icon={TrendingDownIcon} tone="rose" />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="accounting">
          <MetricCard
            label="Bénéfice net"
            value={`${amountFormatter.format(netProfit)} DH`}
            icon={CircleDollarSignIcon}
            tone={netProfit >= 0 ? "emerald" : "rose"}
          />
        </ModuleVisibility>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleVisibility moduleKey="apartments">
          <CompactMetric label="Appartements gérés" value={String(apartmentsCount)} icon={Building2Icon} />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="charges">
          <CompactMetric label="Charges propriétaires" value={`${amountFormatter.format(ownerCharges)} DH`} icon={LandmarkIcon} />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="wallets">
          <CompactMetric label="Portefeuille Imad" value={`${amountFormatter.format(imadWallet?.balance || 0)} DH`} icon={WalletCardsIcon} />
        </ModuleVisibility>
        <ModuleVisibility moduleKey="wallets">
          <CompactMetric label="Portefeuille Jassem" value={`${amountFormatter.format(jassemWallet?.balance || 0)} DH`} icon={WalletCardsIcon} />
        </ModuleVisibility>
      </div>
    </section>
  )
}

const toneStyles = {
  teal: "border-primary/10 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_10%,var(--card)),var(--card))] text-primary",
  gold: "border-amber-200/70 bg-[linear-gradient(145deg,rgba(251,191,36,0.11),var(--card))] text-amber-700",
  rose: "border-rose-200/70 bg-[linear-gradient(145deg,rgba(244,63,94,0.08),var(--card))] text-rose-700",
  emerald: "border-emerald-200/70 bg-[linear-gradient(145deg,rgba(16,185,129,0.09),var(--card))] text-emerald-700",
} as const

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone: keyof typeof toneStyles
}) {
  return (
    <Card className={`relative overflow-hidden ${toneStyles[tone]}`}>
      <CardContent className="flex min-h-28 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-current/10">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function CompactMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="bg-card/75">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-base font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
