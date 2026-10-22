import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { stripTenantSlug, tenantSlugFromPathname } from "@/lib/tenant-routing"

// Routes publiques (accessibles sans authentification)
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/check-in", "/api/check-in", "/api/public", "/api/webhooks"]

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

  const { userId } = await auth()
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
