import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { InternalCompanyRole } from "@/lib/platform/server";
import { fromClerkOrganizationRole } from "@/lib/platform/server";
import type { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;
type Metadata = Record<string, unknown>;

function metadataString(metadata: Metadata | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isInternalRole(value: string | null): value is InternalCompanyRole {
  return value !== null && ["owner", "admin", "agent", "accountant", "viewer"].includes(value);
}

function iso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export async function syncCompanyWithClerk({
  companyId,
  organizationId,
  supabase,
}: {
  companyId: string;
  organizationId: string;
  supabase: AdminClient;
}) {
  const clerk = await clerkClient();
  const [membershipResponse, invitationResponse, existingMembersResponse, storedInvitationsResponse] =
    await Promise.all([
      clerk.organizations.getOrganizationMembershipList({ organizationId, limit: 500 }),
      clerk.organizations.getOrganizationInvitationList({
        organizationId,
        status: ["pending", "accepted", "revoked"],
        limit: 500,
      }),
      supabase
        .from("company_members")
        .select("clerk_user_id, role, access_status")
        .eq("company_id", companyId),
      supabase
        .from("company_invitations")
        .select("id, clerk_invitation_id, email, role, display_name, status")
        .eq("company_id", companyId),
    ]);

  if (existingMembersResponse.error) throw existingMembersResponse.error;
  if (storedInvitationsResponse.error) throw storedInvitationsResponse.error;

  const existingMembers = new Map(
    (existingMembersResponse.data ?? []).map((member) => [member.clerk_user_id, member]),
  );
  const storedInvitations = new Map(
    (storedInvitationsResponse.data ?? []).map((invitation) => [
      invitation.clerk_invitation_id,
      invitation,
    ]),
  );

  const userIds = membershipResponse.data
    .map((membership) => membership.publicUserData?.userId)
    .filter((userId): userId is string => Boolean(userId));
  const userResponses = await Promise.all(
    Array.from({ length: Math.ceil(userIds.length / 100) }, (_, index) =>
      clerk.users.getUserList({
        userId: userIds.slice(index * 100, (index + 1) * 100),
        limit: 100,
      }),
    ),
  );
  const users = new Map(userResponses.flatMap((response) => response.data).map((user) => [user.id, user]));
  const synchronizedAt = new Date().toISOString();
  const activeUserIds = new Set<string>();

  for (const membership of membershipResponse.data) {
    const publicUser = membership.publicUserData;
    if (!publicUser) continue;

    const user = users.get(publicUser.userId);
    const existing = existingMembers.get(publicUser.userId);
    const email = publicUser.identifier.trim().toLowerCase();
    const invitation = [...storedInvitations.values()]
      .filter((item) => item.email === email)
      .sort((left, right) => right.id.localeCompare(left.id))[0];
    const metadataRole = metadataString(
      membership.publicMetadata as Metadata,
      "internalRole",
      "internal_role",
    );
    const role = isInternalRole(metadataRole)
      ? metadataRole
      : existing?.role ?? invitation?.role ?? fromClerkOrganizationRole(membership.role);
    const accessStatus = existing?.access_status ?? "pending_approval";
    activeUserIds.add(publicUser.userId);

    const { error } = await supabase.from("company_members").upsert({
      company_id: companyId,
      clerk_user_id: publicUser.userId,
      role,
      display_name:
        fullName(publicUser.firstName, publicUser.lastName)
        ?? invitation?.display_name
        ?? email,
      email,
      avatar_url: user?.imageUrl || publicUser.imageUrl || null,
      active: accessStatus === "active",
      access_status: accessStatus,
      last_sign_in_at: iso(user?.lastSignInAt),
      last_active_at: iso(user?.lastActiveAt),
      clerk_created_at: iso(user?.createdAt),
      two_factor_enabled: user?.twoFactorEnabled ?? null,
      password_enabled: user?.passwordEnabled ?? null,
      locked: user?.locked ?? false,
      banned: user?.banned ?? false,
      last_synced_at: synchronizedAt,
      updated_at: synchronizedAt,
    });
    if (error) throw error;

    await supabase
      .from("company_invitations")
      .update({
        status: "accepted",
        clerk_user_id: publicUser.userId,
        accepted_at: synchronizedAt,
        updated_at: synchronizedAt,
      })
      .eq("company_id", companyId)
      .eq("email", email)
      .eq("status", "pending");
  }

  for (const existing of existingMembers.values()) {
    if (activeUserIds.has(existing.clerk_user_id)) continue;
    await supabase
      .from("company_members")
      .update({
        active: false,
        access_status: existing.access_status === "revoked" ? "revoked" : "suspended",
        last_synced_at: synchronizedAt,
        updated_at: synchronizedAt,
      })
      .eq("company_id", companyId)
      .eq("clerk_user_id", existing.clerk_user_id);
  }

  for (const clerkInvitation of invitationResponse.data) {
    const stored = storedInvitations.get(clerkInvitation.id);
    if (!stored) continue;
    const status = clerkInvitation.status === "accepted"
      ? "accepted"
      : clerkInvitation.status === "revoked"
        ? "revoked"
        : clerkInvitation.expiresAt <= Date.now()
          ? "expired"
          : "pending";
    await supabase
      .from("company_invitations")
      .update({
        status,
        accepted_at: status === "accepted" ? synchronizedAt : null,
        updated_at: synchronizedAt,
      })
      .eq("id", stored.id);
  }

  return {
    members: membershipResponse.data.length,
    invitations: invitationResponse.data.length,
    synchronizedAt,
  };
}
