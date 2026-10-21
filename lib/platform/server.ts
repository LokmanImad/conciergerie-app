import "server-only";

import { auth } from "@clerk/nextjs/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type InternalCompanyRole = "owner" | "admin" | "agent" | "accountant" | "viewer";

export class PlatformApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function requirePlatformAdmin() {
  const { userId } = await auth();
  if (!userId) throw new PlatformApiError("Authentification requise.", 401);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("clerk_user_id")
    .eq("clerk_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    throw new PlatformApiError("Accès réservé aux Super Administrateurs.", 403);
  }

  return { userId, supabase };
}

export function toClerkOrganizationRole(role: InternalCompanyRole) {
  return role === "owner" || role === "admin" ? "org:admin" : "org:member";
}

export function fromClerkOrganizationRole(role: string): InternalCompanyRole {
  return role === "org:admin" ? "admin" : "agent";
}

export function platformErrorResponse(error: unknown) {
  if (error instanceof PlatformApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const clerkErrors = (error as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors;
  const message = clerkErrors?.[0]?.longMessage
    ?? clerkErrors?.[0]?.message
    ?? (error instanceof Error ? error.message : "Une erreur interne est survenue.");
  return Response.json({ error: message }, { status: 500 });
}
