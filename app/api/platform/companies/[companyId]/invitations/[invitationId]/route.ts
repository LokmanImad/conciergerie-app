import { clerkClient } from "@clerk/nextjs/server";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ companyId: string; invitationId: string }> },
) {
  try {
    const { companyId, invitationId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const { data: invitation, error } = await supabase
      .from("company_invitations")
      .select("id, company_id, clerk_invitation_id, status, companies!inner(clerk_organization_id)")
      .eq("id", invitationId)
      .eq("company_id", companyId)
      .single();

    if (error || !invitation) throw new PlatformApiError("Invitation introuvable.", 404);
    if (invitation.status !== "pending") {
      throw new PlatformApiError("Cette invitation n’est plus en attente.", 409);
    }

    const companyRelation = invitation.companies as unknown as { clerk_organization_id: string | null };
    if (companyRelation.clerk_organization_id) {
      const clerk = await clerkClient();
      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: companyRelation.clerk_organization_id,
        invitationId: invitation.clerk_invitation_id,
      });
    }

    const { error: updateError } = await supabase
      .from("company_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);
    if (updateError) throw new PlatformApiError(updateError.message, 500);

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: userId,
      action: "member.invitation_revoked",
      entity_type: "company_invitation",
      entity_id: invitation.id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return platformErrorResponse(error);
  }
}

