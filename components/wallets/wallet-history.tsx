"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReceiptIcon, BuildingIcon, CalendarIcon, CoinsIcon, CheckCircleIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Charge = {
  id: string
  apartment_id: string
  amount: number
  date: string
  description: string | null
  paid_by_person: string
  apartment: { name: string } | null
  service_type: { name: string } | null
}

type Reimbursement = {
  id: string
  person_name: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

export function WalletHistory({ charges, reimbursements }: { charges: Charge[]; reimbursements: Reimbursement[] }) {
  const [filter, setFilter] = useState<string>("all")
  const [reimbursementFilter, setReimbursementFilter] = useState<string>("all")

  const filteredCharges = charges.filter((charge) => {
    if (filter === "all") return true
    return charge.paid_by_person === filter
  })

  const filteredReimbursements = reimbursements.filter((reimbursement) => {
    if (reimbursementFilter === "all") return true
    return reimbursement.person_name === reimbursementFilter
  })

  const totalByImad = charges.filter((c) => c.paid_by_person === "imad").reduce((sum, c) => sum + Number(c.amount), 0)
  const totalByJassem = charges
    .filter((c) => c.paid_by_person === "jassem")
    .reduce((sum, c) => sum + Number(c.amount), 0)

  const reimbursedToImad = reimbursements
    .filter((r) => r.person_name === "imad")
    .reduce((sum, r) => sum + Number(r.amount), 0)
  const reimbursedToJassem = reimbursements
    .filter((r) => r.person_name === "jassem")
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des transactions</CardTitle>
        <CardDescription>Dépenses personnelles et remboursements effectués</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Dépenses</TabsTrigger>
            <TabsTrigger value="reimbursements">Remboursements</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Filtrer par personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="imad">Imad</SelectItem>
                  <SelectItem value="jassem">Jassem</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <CoinsIcon className="size-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Imad</p>
                    <p className="text-sm font-bold text-blue-600">{totalByImad.toFixed(2)} TND</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                  <CoinsIcon className="size-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Jassem</p>
                    <p className="text-sm font-bold text-purple-600">{totalByJassem.toFixed(2)} TND</p>
                  </div>
                </div>
              </div>
            </div>

            {filteredCharges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ReceiptIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm">Aucune dépense enregistrée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="p-2 rounded-md bg-muted shrink-0">
                      <ReceiptIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{charge.service_type?.name || "Service inconnu"}</h4>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-2 mt-1">
                            <BuildingIcon className="size-3.5" />
                            {charge.apartment?.name}
                          </p>
                          {charge.description && (
                            <p className="text-sm text-muted-foreground mt-1 text-pretty">{charge.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">{Number(charge.amount).toFixed(2)} TND</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={charge.paid_by_person === "imad" ? "default" : "secondary"}>
                          {charge.paid_by_person === "imad" ? "Imad" : "Jassem"}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {format(new Date(charge.date), "d MMMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reimbursements" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={reimbursementFilter} onValueChange={setReimbursementFilter}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Filtrer par personne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="imad">Imad</SelectItem>
                  <SelectItem value="jassem">Jassem</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 border border-green-500/20">
                  <CheckCircleIcon className="size-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Remboursé Imad</p>
                    <p className="text-sm font-bold text-green-600">{reimbursedToImad.toFixed(2)} TND</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 border border-green-500/20">
                  <CheckCircleIcon className="size-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Remboursé Jassem</p>
                    <p className="text-sm font-bold text-green-600">{reimbursedToJassem.toFixed(2)} TND</p>
                  </div>
                </div>
              </div>
            </div>

            {filteredReimbursements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircleIcon className="size-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm">Aucun remboursement enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReimbursements.map((reimbursement) => (
                  <div
                    key={reimbursement.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5 hover:border-green-500/40 transition-colors"
                  >
                    <div className="p-2 rounded-md bg-green-500/10 shrink-0">
                      <CheckCircleIcon className="size-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">Remboursement de dépenses</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {reimbursement.person_name === "imad" ? "Imad" : "Jassem"}
                          </p>
                          {reimbursement.notes && (
                            <p className="text-sm text-muted-foreground mt-2 text-pretty">{reimbursement.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-green-600">
                            {Number(reimbursement.amount).toFixed(2)} TND
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="bg-green-600">
                          Payé
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {format(new Date(reimbursement.payment_date), "d MMMM yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
