import { escapeHtml, safeUrl } from "./html.mjs";

export function brandLogo(site, variant = "light") {
  const source = safeUrl(
    variant === "dark" ? site.branding?.logoDark : site.branding?.logoLight,
  );
  if (source) {
    return `<span class="brand-logo-crop"><img class="brand-logo-original" src="${escapeHtml(source)}" alt="Asad Hospitality — Where hospitality roars" width="570" height="570" decoding="async"></span>`;
  }
  // Source images must be supplied locally before enabling the official logo.
  // Do not recreate the client's lion or silently substitute another symbol.
  return `<span class="brand-wordmark"><strong>ASAD HOSPITALITY</strong><span>${escapeHtml(site.branding?.signature || "Where hospitality roars")}</span></span>`;
}
