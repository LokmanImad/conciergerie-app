import { headers } from "next/headers";

import { ModuleAccessDenied } from "@/components/module-access-denied";
import { withTenantSlug } from "@/lib/tenant-routing";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; reason?: string; returnTo?: string }>;
}) {
  const [{ module: moduleKey, reason, returnTo }, requestHeaders] = await Promise.all([
    searchParams,
    headers(),
  ]);
  const tenantSlug = requestHeaders.get("x-tenant-slug");
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : "/";

  return (
    <ModuleAccessDenied
      moduleKey={moduleKey}
      dashboardHref={withTenantSlug(safeReturnTo, tenantSlug)}
      verificationFailed={reason === "verification"}
    />
  );
}

