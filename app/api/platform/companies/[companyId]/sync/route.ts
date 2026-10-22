import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";
import { syncCompanyWithClerk } from "@/lib/platform/clerk-sync";

export async function POST(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const { data: company, error } = await supabase
      .from("companies")
      .select("id, clerk_organization_id")
      .eq("id", companyId)
      .single();

    if (error || !company) throw new PlatformApiError("Société introuvable.", 404);
    if (!company.clerk_organization_id) {
      throw new PlatformApiError("L’organisation Clerk n’est pas encore associée.", 409);
    }

    const { error: migrationError } = await supabase
      .from("company_members")
      .select("last_seen_at")
      .limit(1);
    if (migrationError) {
      throw new PlatformApiError(
        "Exécutez d’abord la migration 47 dans Supabase.",
        503,
      );
    }

    const result = await syncCompanyWithClerk({
      companyId,
      organizationId: company.clerk_organization_id,
      supabase,
    });

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: userId,
      action: "company.clerk_synchronized",
      entity_type: "company",
      entity_id: companyId,
      metadata: result,
    });

    return Response.json(result);
  } catch (error) {
    return platformErrorResponse(error);
  }
}
