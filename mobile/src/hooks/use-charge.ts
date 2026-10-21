import { useCallback, useEffect, useState } from "react";

import type { Charge } from "@/features/charges/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function useCharge(id?: string) {
  const supabase = useSupabaseClient();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Charge introuvable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("charges")
      .select(
        `
        id, apartment_id, service_type_id, reservation_id, amount, date, supplier,
        description, notes, paid_by_person, payment_method, is_paid, is_invoiced, billable_to_owner,
        receipt_path, cancelled_at, cancellation_reason, created_at,
        apartment:apartments(name),
        service_type:service_types(name, paid_by),
        reservation:reservations(reference, client_name, check_in)
      `,
      )
      .eq("id", id)
      .single();

    if (queryError || !data) {
      setCharge(null);
      setReceiptUrl(null);
      setError(queryError?.message ?? "Charge introuvable.");
      setLoading(false);
      return;
    }

    const normalized = {
      ...data,
      apartment: firstRelation(data.apartment),
      service_type: firstRelation(data.service_type),
      reservation: firstRelation(data.reservation),
    } as Charge;
    setCharge(normalized);
    setReceiptUrl(null);
    if (normalized.receipt_path) {
      const { data: signedData } = await supabase.storage
        .from("charge-receipts")
        .createSignedUrl(normalized.receipt_path, 900);
      setReceiptUrl(signedData?.signedUrl ?? null);
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { charge, receiptUrl, loading, error, reload: load };
}
