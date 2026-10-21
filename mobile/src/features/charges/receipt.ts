import * as Crypto from "expo-crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChargeReceiptDraft } from "@/features/charges/types";

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadChargeReceipt(
  supabase: SupabaseClient,
  chargeId: string,
  receipt: ChargeReceiptDraft,
) {
  if (receipt.fileSize && receipt.fileSize > 6 * 1024 * 1024) {
    throw new Error("Le justificatif dépasse la limite de 6 Mo.");
  }

  const path = `${chargeId}/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(receipt.mimeType)}`;
  const response = await fetch(receipt.uri);
  if (!response.ok) throw new Error("Impossible de lire le justificatif.");
  const bytes = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from("charge-receipts")
    .upload(path, bytes, {
      contentType: receipt.mimeType,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;
  return path;
}
