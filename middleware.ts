import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { firstAvailableModulePath, requiredModuleForPathname } from "@/lib/module-access"
import { stripTenantSlug, tenantSlugFromPathname } from "@/lib/tenant-routing"

// Routes publiques (accessibles sans authentification)
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/check-in", "/api/check-in", "/api/public", "/api/webhooks"]

type EntitlementPayload = {
  platform_admin?: boolean
  platform_allowed?: boolean
  modules?: string[]
}

function accessDeniedResponse(
  request: Request,
  tenantSlug: string | null,
  moduleKey: string,
  reason?: "verification",
  enabledModules: string[] = [],
) {
  const requestUrl = new URL(request.url)
  if (requestUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: reason === "verification"
          ? "Impossible de vérifier les autorisations du module."
          : "Ce module n’est pas activé pour cette société.",
        code: reason === "verification" ? "ENTITLEMENTS_UNAVAILABLE" : "MODULE_DISABLED",
        module: moduleKey,
      },
      { status: reason === "verification" ? 503 : 403 },
    )
  }

  const deniedUrl = new URL(tenantSlug ? `/${tenantSlug}/acces-refuse` : "/acces-refuse", request.url)
  deniedUrl.searchParams.set("module", moduleKey)
  if (reason) deniedUrl.searchParams.set("reason", reason)
  if (!reason) deniedUrl.searchParams.set("returnTo", firstAvailableModulePath(enabledModules))
  return NextResponse.redirect(deniedUrl)
}

export default clerkMiddleware(async (auth, request) => {
  const requestHost = request.nextUrl.hostname.toLowerCase()
  const canonicalHost = (process.env.CANONICAL_APP_HOST ?? "app.asadhospitality.ma")
    .trim()
    .toLowerCase()
  if (
    process.env.VERCEL_ENV === "production"
    && requestHost.endsWith(".vercel.app")
    && canonicalHost
    && requestHost !== canonicalHost
  ) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.protocol = "https:"
    canonicalUrl.hostname = canonicalHost
    canonicalUrl.port = ""
    return NextResponse.redirect(canonicalUrl, 308)
  }

  const { userId, getToken } = await auth()
  const pathname = request.nextUrl.pathname
  const tenantSlug = tenantSlugFromPathname(pathname)
  const internalPathname = stripTenantSlug(pathname, tenantSlug)
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => internalPathname === prefix || internalPathname.startsWith(`${prefix}/`),
  )
  
  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
  if (!userId && !isPublic) {
    // Rediriger vers /sign-in
    const signInUrl = new URL(tenantSlug ? `/${tenantSlug}/sign-in` : "/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }
  
  // Si l'utilisateur est connecté et essaie d'accéder à /sign-in, rediriger vers le dashboard
  if (userId && internalPathname.startsWith("/sign-in")) {
    return NextResponse.redirect(new URL(tenantSlug ? `/${tenantSlug}` : "/", request.url))
  }

  const requiredModule = userId ? requiredModuleForPathname(internalPathname) : null
  if (requiredModule) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    try {
      const token = await getToken()
      if (!supabaseUrl || !supabaseKey || !token) {
        return accessDeniedResponse(request, tenantSlug, requiredModule, "verification")
      }

      const entitlementResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_current_entitlements`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "x-concierge-platform": "web",
        },
        body: JSON.stringify({ p_platform: "web" }),
        cache: "no-store",
      })

      if (!entitlementResponse.ok) {
        return accessDeniedResponse(request, tenantSlug, requiredModule, "verification")
      }

      const entitlements = (await entitlementResponse.json()) as EntitlementPayload | null
      const moduleEnabled = Boolean(
        entitlements?.platform_admin || entitlements?.modules?.includes(requiredModule),
      )

      if (!entitlements?.platform_allowed || !moduleEnabled) {
        return accessDeniedResponse(request, tenantSlug, requiredModule, undefined, entitlements?.modules)
      }
    } catch {
      return accessDeniedResponse(request, tenantSlug, requiredModule, "verification")
    }
  }

  if (tenantSlug) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = internalPathname
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-tenant-slug", tenantSlug)
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
