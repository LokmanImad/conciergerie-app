import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  type InternalCompanyRole,
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
  toClerkOrganizationRole,
} from "@/lib/platform/server";

const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().max(120).optional().default(""),
  role: z.enum(["owner", "admin", "agent", "accountant", "viewer"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  let clerkInvitation: { organizationId: string; invitationId: string } | null = null;
  try {
    const { companyId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const parsed = invitationSchema.safeParse(await request.json());
    if (!parsed.success) throw new PlatformApiError("Les informations de l’invitation sont invalides.");

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, slug, max_users, clerk_organization_id")
      .eq("id", companyId)
      .single();
    if (companyError || !company) throw new PlatformApiError("Société introuvable.", 404);
    if (!company.clerk_organization_id) {
      throw new PlatformApiError("Créez d’abord l’organisation Clerk de cette société.", 409);
    }

    await supabase
      .from("company_invitations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("company_id", company.id)
      .eq("status", "pending")
      .lte("expires_at", new Date().toISOString());

    const { data: existingMember } = await supabase
      .from("company_members")
      .select("clerk_user_id")
      .eq("company_id", company.id)
      .eq("email", parsed.data.email)
      .eq("active", true)
      .maybeSingle();
    if (existingMember) {
      throw new PlatformApiError("Cette adresse appartient déjà à un utilisateur actif.", 409);
    }

    const [{ count: activeMembers }, { count: pendingInvitations }] = await Promise.all([
      supabase.from("company_members").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("active", true),
      supabase.from("company_invitations").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "pending"),
    ]);
    if (company.max_users && (activeMembers ?? 0) + (pendingInvitations ?? 0) >= company.max_users) {
      throw new PlatformApiError("La limite d’utilisateurs de cette société est atteinte.", 409);
    }

    const { data: existing } = await supabase
      .from("company_invitations")
      .select("id")
      .eq("company_id", company.id)
      .eq("email", parsed.data.email)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new PlatformApiError("Une invitation est déjà en attente pour cette adresse.", 409);

    const clerk = await clerkClient();
    const applicationOrigin = new URL(request.url).origin;
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: company.clerk_organization_id,
      emailAddress: parsed.data.email,
      role: toClerkOrganizationRole(parsed.data.role as InternalCompanyRole),
      expiresInDays: 7,
      redirectUrl: `${applicationOrigin}/${company.slug}/sign-up`,
      publicMetadata: {
        companyId: company.id,
        internalRole: parsed.data.role,
        displayName: parsed.data.displayName || undefined,
      },
    });
    clerkInvitation = {
      organizationId: company.clerk_organization_id,
      invitationId: invitation.id,
    };

    const { data: storedInvitation, error: invitationError } = await supabase
      .from("company_invitations")
      .insert({
        company_id: company.id,
        clerk_invitation_id: invitation.id,
        email: parsed.data.email,
        display_name: parsed.data.displayName || null,
        role: parsed.data.role,
        status: "pending",
        invited_by: userId,
        expires_at: new Date(invitation.expiresAt).toISOString(),
      })
      .select("*")
      .single();

    if (invitationError || !storedInvitation) {
      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: company.clerk_organization_id,
        invitationId: invitation.id,
      }).catch(() => undefined);
      clerkInvitation = null;
      throw new PlatformApiError(invitationError?.message ?? "Impossible d’enregistrer l’invitation.", 500);
    }

    await supabase.from("audit_logs").insert({
      company_id: company.id,
      actor_user_id: userId,
      action: "member.invited",
      entity_type: "company_invitation",
      entity_id: storedInvitation.id,
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    return Response.json({ invitation: storedInvitation }, { status: 201 });
  } catch (error) {
    if (clerkInvitation) {
      const clerk = await clerkClient().catch(() => null);
      await clerk?.organizations.revokeOrganizationInvitation(clerkInvitation).catch(() => undefined);
    }
    return platformErrorResponse(error);
  }
}
