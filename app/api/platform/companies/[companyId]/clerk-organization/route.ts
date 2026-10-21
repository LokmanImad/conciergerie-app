import { clerkClient } from "@clerk/nextjs/server";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
  toClerkOrganizationRole,
} from "@/lib/platform/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  let createdOrganizationId: string | null = null;
  try {
    const { companyId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const { data: company, error } = await supabase
      .from("companies")
      .select("id, name, slug, clerk_organization_id")
      .eq("id", companyId)
      .single();

    if (error || !company) throw new PlatformApiError("Société introuvable.", 404);
    if (company.clerk_organization_id) {
      return Response.json({ organizationId: company.clerk_organization_id });
    }

    const clerk = await clerkClient();
    const organization = await clerk.organizations.createOrganization({
      name: company.name,
      slug: company.slug,
      publicMetadata: { companyId: company.id },
    });
    createdOrganizationId = organization.id;

    const { data: linkedCompany, error: updateError } = await supabase
      .from("companies")
      .update({ clerk_organization_id: organization.id, updated_at: new Date().toISOString() })
      .eq("id", company.id)
      .is("clerk_organization_id", null)
      .select("id")
      .maybeSingle();

    if (updateError || !linkedCompany) {
      await clerk.organizations.deleteOrganization(organization.id).catch(() => undefined);
      createdOrganizationId = null;
      throw new PlatformApiError(updateError?.message ?? "Cette société a déjà été associée.", 409);
    }

    const { data: existingMembers } = await supabase
      .from("company_members")
      .select("clerk_user_id, role")
      .eq("company_id", company.id)
      .eq("active", true);
    for (const member of existingMembers ?? []) {
      await clerk.organizations.createOrganizationMembership({
        organizationId: organization.id,
        userId: member.clerk_user_id,
        role: toClerkOrganizationRole(member.role),
      }).then(async () => {
        await clerk.organizations.updateOrganizationMembershipMetadata({
          organizationId: organization.id,
          userId: member.clerk_user_id,
          publicMetadata: { internalRole: member.role },
        });
      }).catch(() => undefined);
    }

    await supabase.from("audit_logs").insert({
      company_id: company.id,
      actor_user_id: userId,
      action: "company.clerk_organization_created",
      entity_type: "company",
      entity_id: company.id,
      metadata: { clerk_organization_id: organization.id },
    });

    return Response.json({ organizationId: organization.id }, { status: 201 });
  } catch (error) {
    if (createdOrganizationId) {
      const clerk = await clerkClient().catch(() => null);
      await clerk?.organizations.deleteOrganization(createdOrganizationId).catch(() => undefined);
    }
    return platformErrorResponse(error);
  }
}
