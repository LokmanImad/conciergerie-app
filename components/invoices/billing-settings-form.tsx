"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BillingSettings } from "@/features/invoices/types";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function BillingSettingsForm({
  settings,
}: {
  settings: BillingSettings;
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();
  const [form, setForm] = useState({
    ...settings,
    default_tax_rate: String(settings.default_tax_rate),
    payment_terms_days: String(settings.payment_terms_days),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("billing_settings")
      .update({
        company_name: form.company_name,
        company_address: form.company_address || null,
        company_phone: form.company_phone || null,
        company_email: form.company_email || null,
        company_identifier: form.company_identifier || null,
        bank_details: form.bank_details || null,
        default_tax_rate: Number(form.default_tax_rate),
        invoice_prefix: form.invoice_prefix || "FAC",
        payment_terms_days: Number(form.payment_terms_days),
        footer_text: form.footer_text || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSaving(false);
    setMessage(error ? error.message : "Paramètres enregistrés.");
    if (!error) router.refresh();
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité de facturation</CardTitle>
        <CardDescription>
          Ces informations apparaîtront sur les factures PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {message && (
          <p className="md:col-span-2 text-sm text-muted-foreground">
            {message}
          </p>
        )}
        <Field label="Nom de l’entreprise">
          <Input
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
          />
        </Field>
        <Field label="Identifiant / ICE">
          <Input
            value={form.company_identifier ?? ""}
            onChange={(e) => update("company_identifier", e.target.value)}
          />
        </Field>
        <Field label="Téléphone">
          <Input
            value={form.company_phone ?? ""}
            onChange={(e) => update("company_phone", e.target.value)}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={form.company_email ?? ""}
            onChange={(e) => update("company_email", e.target.value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Adresse">
            <Textarea
              value={form.company_address ?? ""}
              onChange={(e) => update("company_address", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Préfixe des factures">
          <Input
            value={form.invoice_prefix}
            onChange={(e) =>
              update("invoice_prefix", e.target.value.toUpperCase())
            }
          />
        </Field>
        <Field label="Échéance par défaut (jours)">
          <Input
            type="number"
            min="0"
            value={form.payment_terms_days}
            onChange={(e) => update("payment_terms_days", e.target.value)}
          />
        </Field>
        <Field label="Taxe par défaut (%)">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.default_tax_rate}
            onChange={(e) => update("default_tax_rate", e.target.value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Coordonnées bancaires">
            <Textarea
              value={form.bank_details ?? ""}
              onChange={(e) => update("bank_details", e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Pied de page">
            <Textarea
              value={form.footer_text ?? ""}
              onChange={(e) => update("footer_text", e.target.value)}
            />
          </Field>
        </div>
        <Button disabled={saving} onClick={() => void save()}>
          <SaveIcon className="size-4" />{" "}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
