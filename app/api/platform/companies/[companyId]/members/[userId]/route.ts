import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  type InternalCompanyRole,
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
  toClerkOrganizationRole,
} from "@/lib/platform/server";

const memberSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["owner", "admin", "agent", "accountant", "viewer"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string; userId: string }> },
) {
  try {
    const { companyId, userId: memberUserId } = await context.params;
    const { userId: actorUserId, supabase } = await requirePlatformAdmin();
    const parsed = memberSchema.safeParse(await request.json());
    if (!parsed.success) throw new PlatformApiError("Modification utilisateur invalide.");

    const { data: member, error } = await supabase
      .from("company_members")
      .select("company_id, clerk_user_id, active, access_status, role, companies!inner(clerk_organization_id)")
      .eq("company_id", companyId)
      .eq("clerk_user_id", memberUserId)
      .single();
    if (error || !member) throw new PlatformApiError("Utilisateur introuvable.", 404);

    const companyRelation = member.companies as unknown as { clerk_organization_id: string | null };
    const organizationId = companyRelation.clerk_organization_id;
    if (!organizationId) throw new PlatformApiError("Organisation Clerk non configurée.", 409);

    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId,
      userId: [memberUserId],
      limit: 1,
    });
    const clerkMembership = memberships.data[0];
    const nextActive = parsed.data.active ?? member.active;
    const nextStatus = parsed.data.active === true
      ? "active"
      : parsed.data.active === false
        ? "suspended"
        : member.access_status;
    const shouldHaveMembership = nextActive || (
      parsed.data.active === undefined && member.access_status === "pending_approval"
    );

    if (shouldHaveMembership) {
      const role = toClerkOrganizationRole(parsed.data.role as InternalCompanyRole);
      if (clerkMembership) {
        await clerk.organizations.updateOrganizationMembership({
          organizationId,
          userId: memberUserId,
          role,
        });
      } else {
        await clerk.organizations.createOrganizationMembership({
          organizationId,
          userId: memberUserId,
          role,
        });
      }
      await clerk.organizations.updateOrganizationMembershipMetadata({
        organizationId,
        userId: memberUserId,
        publicMetadata: { internalRole: parsed.data.role },
      });
    } else if (parsed.data.active === false && clerkMembership) {
      await clerk.organizations.deleteOrganizationMembership({
        organizationId,
        userId: memberUserId,
      });
    }

    const { error: updateError } = await supabase
      .from("company_members")
      .update({
        active: nextActive,
        access_status: nextStatus,
        role: parsed.data.role,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("clerk_user_id", memberUserId);
    if (updateError) throw new PlatformApiError(updateError.message, 500);

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: actorUserId,
      action: parsed.data.active === true
        ? member.access_status === "pending_approval" ? "member.approved" : "member.reactivated"
        : parsed.data.active === false ? "member.suspended" : "member.role_updated",
      entity_type: "company_member",
      entity_id: memberUserId,
      metadata: { role: parsed.data.role },
    });

    return Response.json({ active: nextActive, accessStatus: nextStatus, role: parsed.data.role });
  } catch (error) {
    return platformErrorResponse(error);
  }
}
