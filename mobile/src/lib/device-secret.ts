import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "concierge.device.secret.v1";
let cachedSecret: string | null = null;

export function getCachedDeviceSecret() {
  return cachedSecret;
}

export async function getOrCreateDeviceSecret() {
  if (cachedSecret) return cachedSecret;

  let secret = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!secret || secret.length < 32) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    secret = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(STORAGE_KEY, secret, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  cachedSecret = secret;
  return secret;
}
