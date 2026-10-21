"use client";

const STORAGE_KEY = "concierge.device.secret.v1";
export const DEVICE_COOKIE_NAME = "concierge_device_secret";
export const DEVICE_SECRET_HEADER = "x-concierge-device-secret";
export const DEVICE_PLATFORM_HEADER = "x-concierge-platform";

let memorySecret: string | null = null;

function readCookie() {
  if (typeof document === "undefined") return null;
  const prefix = `${DEVICE_COOKIE_NAME}=`;
  const item = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function persistCookie(secret: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${DEVICE_COOKIE_NAME}=${encodeURIComponent(secret)}; Path=/; Max-Age=31536000; SameSite=Strict${secure}`;
}

export function getOrCreateWebDeviceSecret() {
  if (memorySecret) return memorySecret;
  if (typeof window === "undefined") return null;

  let secret: string | null = null;
  try {
    secret = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Cookie and memory fallbacks keep private browsing usable.
  }
  secret = secret || readCookie();
  if (!secret || secret.length < 32) secret = generateSecret();

  memorySecret = secret;
  try {
    window.localStorage.setItem(STORAGE_KEY, secret);
  } catch {
    // Some browsers disable local storage. The strict cookie remains available.
  }
  persistCookie(secret);
  return secret;
}

export function describeWebDevice() {
  if (typeof navigator === "undefined") {
    return { name: "Navigateur Web", browser: "Navigateur", operatingSystem: "Inconnu" };
  }

  const userAgent = navigator.userAgent;
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Google Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navigateur";
  const operatingSystem = /Windows/.test(userAgent)
    ? "Windows"
    : /Android/.test(userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS"
        : /Mac OS/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Inconnu";

  return {
    name: `${browser} · ${operatingSystem}`,
    browser,
    operatingSystem,
  };
}
