import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Routes publiques (accessibles sans authentification)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/check-in(.*)",
  "/api/check-in(.*)",
  "/api/webhooks(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const isPublic = isPublicRoute(request)
  
  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
  if (!userId && !isPublic) {
    // Rediriger vers /sign-in
    const signInUrl = new URL("/sign-in", request.url)
    return NextResponse.redirect(signInUrl)
  }
  
  // Si l'utilisateur est connecté et essaie d'accéder à /sign-in, rediriger vers le dashboard
  if (userId && request.nextUrl.pathname.startsWith("/sign-in")) {
    return NextResponse.redirect(new URL("/", request.url))
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
