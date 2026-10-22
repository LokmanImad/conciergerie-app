const RESERVED_SEGMENTS = new Set([
  "api",
  "appartements",
  "charges",
  "check-in",
  "comptabilite",
  "contrats",
  "factures",
  "paiements",
  "plateforme",
  "portefeuilles",
  "proprietaires",
  "reservations",
  "services",
  "sign-in",
  "sign-up",
  "taches",
  "voyageurs",
]);

export const TENANT_APP_SEGMENTS = new Set([
  "appartements",
  "charges",
  "comptabilite",
  "contrats",
  "factures",
  "paiements",
  "portefeuilles",
  "proprietaires",
  "reservations",
  "services",
  "sign-in",
  "sign-up",
  "taches",
  "voyageurs",
]);

export function tenantSlugFromPathname(pathname: string) {
  const [first, second] = pathname.split("/").filter(Boolean);
  if (!first || RESERVED_SEGMENTS.has(first)) return null;
  if (second && !TENANT_APP_SEGMENTS.has(second)) return null;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(first) ? first : null;
}

export function stripTenantSlug(pathname: string, tenantSlug: string | null) {
  if (!tenantSlug) return pathname;
  const stripped = pathname.slice(tenantSlug.length + 1);
  return stripped || "/";
}

export function withTenantSlug(href: string, tenantSlug: string | null) {
  if (!tenantSlug || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/") return `/${tenantSlug}`;
  if (href === `/${tenantSlug}` || href.startsWith(`/${tenantSlug}/`)) return href;
  return `/${tenantSlug}${href}`;
}
