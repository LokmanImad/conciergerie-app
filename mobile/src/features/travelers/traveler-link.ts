import * as Crypto from "expo-crypto";

import type { Reservation } from "@/features/reservations/types";
import { appConfig } from "@/lib/config";

const BASE64_URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function toBase64Url(bytes: Uint8Array) {
  let result = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    result += BASE64_URL_ALPHABET[(combined >> 18) & 63];
    result += BASE64_URL_ALPHABET[(combined >> 12) & 63];
    if (second !== undefined) result += BASE64_URL_ALPHABET[(combined >> 6) & 63];
    if (third !== undefined) result += BASE64_URL_ALPHABET[combined & 63];
  }

  return result;
}

export function getTravelerLinkExpiry(checkOut: Reservation["check_out"]) {
  const minimumExpiry = new Date();
  minimumExpiry.setDate(minimumExpiry.getDate() + 14);

  const stayExpiry = new Date(`${checkOut}T23:59:59`);
  stayExpiry.setDate(stayExpiry.getDate() + 2);

  return stayExpiry > minimumExpiry ? stayExpiry : minimumExpiry;
}

export async function createTravelerRegistrationLink({
  reservationId,
  checkOut,
  createRegistration,
}: {
  reservationId: string;
  checkOut: string;
  createRegistration: (parameters: {
    p_reservation_id: string;
    p_token_hash: string;
    p_expires_at: string;
  }) => Promise<{ error: { message: string } | null }>;
}) {
  if (!appConfig.webAppUrl) {
    throw new Error("L’adresse de l’application web n’est pas configurée dans EXPO_PUBLIC_WEB_APP_URL.");
  }

  const token = toBase64Url(await Crypto.getRandomBytesAsync(32));
  const tokenHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
  const expiresAt = getTravelerLinkExpiry(checkOut);
  const { error } = await createRegistration({
    p_reservation_id: reservationId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    if (error.message.includes("REGISTRATION_ALREADY_SUBMITTED")) {
      throw new Error("Le formulaire a déjà été envoyé et ne peut plus recevoir un nouveau lien.");
    }
    if (error.message.includes("ADMIN_REQUIRED") || error.message.includes("42501")) {
      throw new Error("Votre compte n’est pas autorisé à créer ce lien.");
    }
    throw new Error("Impossible de créer le lien voyageurs. Réessayez dans quelques instants.");
  }

  return {
    url: `${appConfig.webAppUrl}/check-in/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}
