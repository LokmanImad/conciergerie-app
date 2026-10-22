export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  apartments: "Appartements",
  reservations: "Réservations",
  travelers: "Voyageurs",
  police_forms: "Fiches de police",
  charges: "Charges",
  tasks: "Tâches",
  accounting: "Comptabilité",
  invoices: "Factures clients",
  owner_billing: "Factures propriétaires",
  contracts: "Contrats",
  wallets: "Portefeuilles",
  payments: "Paiements",
  services: "Types de services",
};

export const MODULE_HOME_ROUTES: Record<string, string> = {
  dashboard: "/",
  apartments: "/appartements",
  reservations: "/reservations",
  travelers: "/voyageurs",
  charges: "/charges",
  tasks: "/taches",
  accounting: "/comptabilite",
  invoices: "/factures",
  owner_billing: "/proprietaires",
  contracts: "/contrats",
  wallets: "/portefeuilles",
  payments: "/paiements",
  services: "/services",
};

type RouteRule = {
  matches: (pathname: string) => boolean;
  moduleKey: string;
};

function pathStartsWith(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const PAGE_RULES: RouteRule[] = [
  { matches: (path) => path === "/", moduleKey: "dashboard" },
  { matches: (path) => pathStartsWith(path, "/appartements"), moduleKey: "apartments" },
  { matches: (path) => pathStartsWith(path, "/reservations"), moduleKey: "reservations" },
  { matches: (path) => pathStartsWith(path, "/voyageurs"), moduleKey: "travelers" },
  { matches: (path) => pathStartsWith(path, "/charges"), moduleKey: "charges" },
  { matches: (path) => pathStartsWith(path, "/taches"), moduleKey: "tasks" },
  { matches: (path) => pathStartsWith(path, "/comptabilite"), moduleKey: "accounting" },
  { matches: (path) => pathStartsWith(path, "/factures"), moduleKey: "invoices" },
  { matches: (path) => pathStartsWith(path, "/proprietaires"), moduleKey: "owner_billing" },
  { matches: (path) => pathStartsWith(path, "/contrats"), moduleKey: "contracts" },
  { matches: (path) => pathStartsWith(path, "/portefeuilles"), moduleKey: "wallets" },
  { matches: (path) => pathStartsWith(path, "/paiements"), moduleKey: "payments" },
  { matches: (path) => pathStartsWith(path, "/services"), moduleKey: "services" },
];

const API_RULES: RouteRule[] = [
  {
    matches: (path) => /^\/api\/admin\/reservations\/[^/]+\/traveler-link$/.test(path),
    moduleKey: "police_forms",
  },
  {
    matches: (path) => pathStartsWith(path, "/api/admin/travelers"),
    moduleKey: "police_forms",
  },
];

export function requiredModuleForPathname(pathname: string) {
  const rules = pathname.startsWith("/api/") ? API_RULES : PAGE_RULES;
  return rules.find((rule) => rule.matches(pathname))?.moduleKey ?? null;
}

export function firstAvailableModulePath(modules: Iterable<string>) {
  for (const moduleKey of modules) {
    const route = MODULE_HOME_ROUTES[moduleKey];
    if (route) return route;
  }
  return "/acces-refuse";
}

