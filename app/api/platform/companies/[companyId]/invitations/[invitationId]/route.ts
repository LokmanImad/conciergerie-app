import { clerkClient } from "@clerk/nextjs/server";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";
import { syncCompanyWithClerk } from "@/lib/platform/clerk-sync";

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
    let nextStatus: "accepted" | "revoked" | "expired" = "revoked";
    if (companyRelation.clerk_organization_id) {
      const clerk = await clerkClient();
      const clerkInvitation = await clerk.organizations.getOrganizationInvitation({
        organizationId: companyRelation.clerk_organization_id,
        invitationId: invitation.clerk_invitation_id,
      });

      if (clerkInvitation.status === "accepted") {
        nextStatus = "accepted";
      } else if (clerkInvitation.status === "revoked") {
        nextStatus = "revoked";
      } else if (clerkInvitation.expiresAt <= Date.now()) {
        nextStatus = "expired";
      } else {
        await clerk.organizations.revokeOrganizationInvitation({
          organizationId: companyRelation.clerk_organization_id,
          invitationId: invitation.clerk_invitation_id,
        });
      }
    }

    const { error: updateError } = await supabase
      .from("company_invitations")
      .update({
        status: nextStatus,
        accepted_at: nextStatus === "accepted" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);
    if (updateError) throw new PlatformApiError(updateError.message, 500);

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: userId,
      action: nextStatus === "revoked"
        ? "member.invitation_revoked"
        : "member.invitation_reconciled",
      entity_type: "company_invitation",
      entity_id: invitation.id,
    });

    if (nextStatus === "accepted" && companyRelation.clerk_organization_id) {
      await syncCompanyWithClerk({
        companyId,
        organizationId: companyRelation.clerk_organization_id,
        supabase,
      });
    }

    return Response.json({
      status: nextStatus,
      message: nextStatus === "accepted"
        ? "L’invitation avait déjà été acceptée. L’utilisateur a été synchronisé."
        : nextStatus === "expired"
          ? "L’invitation était expirée et a été actualisée."
          : "L’invitation a été révoquée.",
    });
  } catch (error) {
    return platformErrorResponse(error);
  }
}

