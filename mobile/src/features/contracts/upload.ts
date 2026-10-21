import type { SupabaseClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";
import type { ImagePickerAsset } from "expo-image-picker";

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadContractPage(
  supabase: SupabaseClient,
  contractId: string,
  asset: ImagePickerAsset,
  position: number,
) {
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error("La page dépasse la limite de 10 Mo.");
  const mimeType = asset.mimeType ?? "image/jpeg";
  const path = `${contractId}/${Date.now()}-${Crypto.randomUUID()}.${extensionFor(mimeType)}`;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("Impossible de lire la page scannée.");
  const bytes = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("owner-contracts").upload(path, bytes, { contentType: mimeType, cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase.from("owner_contract_documents").insert({
    contract_id: contractId,
    storage_path: path,
    file_name: asset.fileName ?? `page-${position}.${extensionFor(mimeType)}`,
    mime_type: mimeType,
    position,
  });
  if (rowError) {
    await supabase.storage.from("owner-contracts").remove([path]);
    throw rowError;
  }
  return path;
}
