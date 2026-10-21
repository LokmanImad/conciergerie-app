import Link from "next/link";
import { FilePlus2Icon, Settings2Icon } from "lucide-react";

import { InvoicesList } from "@/components/invoices/invoices-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/features/invoices/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function InvoicesPage() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "*, apartment:apartments(name), reservation:reservations(reference, check_in, check_out)",
    )
    .order("issue_date", { ascending: false });
  const invoices = (data ?? []).map((invoice) => ({
    ...invoice,
    apartment: firstRelation(invoice.apartment),
    reservation: firstRelation(invoice.reservation),
  })) as Invoice[];
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Ventes et encaissements"
        title="Factures"
        description="Générez les factures des séjours, suivez les échéances et enregistrez les règlements."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/factures/parametres">
                <Settings2Icon className="size-4" /> Paramètres
              </Link>
            </Button>
            <Button asChild>
              <Link href="/factures/nouvelle">
                <FilePlus2Icon className="size-4" /> Nouvelle facture
              </Link>
            </Button>
          </>
        }
      />
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Exécutez la migration 37 dans Supabase pour activer la facturation.
        </div>
      ) : (
        <InvoicesList invoices={invoices} />
      )}
    </div>
  );
}
