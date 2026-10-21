"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  FileTextIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  effectiveInvoiceStatus,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type Invoice,
  type InvoiceStatus,
} from "@/features/invoices/types";

const money = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
});

export function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return invoices.filter((invoice) => {
      const currentStatus = effectiveInvoiceStatus(invoice);
      return (
        (status === "all" || currentStatus === status) &&
        (!query ||
          [
            invoice.invoice_number,
            invoice.client_name,
            invoice.apartment?.name,
            invoice.reservation?.reference,
          ].some((value) => value?.toLocaleLowerCase("fr").includes(query)))
      );
    });
  }, [invoices, search, status]);

  if (invoices.length === 0)
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
          <FileTextIcon className="mb-4 size-11 text-muted-foreground" />
          <h2 className="font-semibold">Aucune facture</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez une facture depuis une réservation enregistrée.
          </p>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Numéro, client, réservation…"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as InvoiceStatus | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {INVOICE_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {INVOICE_STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        {filtered.length} facture{filtered.length > 1 ? "s" : ""}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((invoice) => {
          const currentStatus = effectiveInvoiceStatus(invoice);
          return (
            <Link
              href={`/factures/${invoice.id}`}
              key={invoice.id}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileTextIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">
                          {invoice.invoice_number}
                        </h2>
                        <InvoiceStatusBadge status={currentStatus} />
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {invoice.client_name} ·{" "}
                        {invoice.apartment?.name ?? "Sans appartement"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {money.format(Number(invoice.total_amount))}
                      </p>
                      <ChevronRightIcon className="ml-auto mt-2 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="size-3.5" /> Émise le{" "}
                      {formatDate(invoice.issue_date)}
                    </span>
                    <span>Échéance {formatDate(invoice.due_date)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variant =
    status === "paid"
      ? "default"
      : status === "overdue" || status === "cancelled"
        ? "destructive"
        : "outline";
  return <Badge variant={variant}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}
