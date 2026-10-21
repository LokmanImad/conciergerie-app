import { useCallback, useEffect, useState } from "react";

import type { ContractDocument, OwnerContract } from "@/features/contracts/types";
import { useSupabaseClient } from "@/lib/supabase";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function useOwnerContract(id?: string) {
  const supabase = useSupabaseClient();
  const [contract, setContract] = useState<OwnerContract | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Contrat introuvable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [contractResult, documentResult] = await Promise.all([
      supabase.from("owner_contracts").select("*, apartment:apartments(name)").eq("id", id).single(),
      supabase.from("owner_contract_documents").select("*").eq("contract_id", id).order("position"),
    ]);
    const queryError = contractResult.error ?? documentResult.error;
    if (queryError || !contractResult.data) {
      setError(queryError?.message.includes("owner_contract") ? "Installez la migration 36 dans Supabase." : queryError?.message ?? "Contrat introuvable.");
      setLoading(false);
      return;
    }
    const normalized = { ...contractResult.data, apartment: firstRelation(contractResult.data.apartment) } as OwnerContract;
    const withUrls = await Promise.all(((documentResult.data ?? []) as Omit<ContractDocument, "signed_url">[]).map(async (document) => {
      const { data: signed } = await supabase.storage.from("owner-contracts").createSignedUrl(document.storage_path, 900);
      return { ...document, signed_url: signed?.signedUrl ?? null };
    }));
    setContract(normalized);
    setDocuments(withUrls);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { contract, documents, loading, error, reload: load };
}
