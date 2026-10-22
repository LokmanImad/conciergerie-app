import {
  verifyWebhook,
  type OrganizationMembershipWebhookEvent,
  type WebhookEvent,
} from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import {
  type InternalCompanyRole,
  fromClerkOrganizationRole,
} from "@/lib/platform/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Metadata = Record<string, unknown>;

function metadataString(metadata: Metadata | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function validRole(value: string | null): value is InternalCompanyRole {
  return value !== null && ["owner", "admin", "agent", "accountant", "viewer"].includes(value);
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

async function companyFromOrganization(organizationId: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("clerk_organization_id", organizationId)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncMembership(
  event: OrganizationMembershipWebhookEvent,
) {
  const supabase = getSupabaseAdminClient();
  const data = event.data;
  const companyId = await companyFromOrganization(data.organization.id);
  if (!companyId) return;

  const user = data.public_user_data;
  const email = user.identifier.trim().toLowerCase();
  const metadata = data.public_metadata as Metadata;
  const { data: invitation } = await supabase
    .from("company_invitations")
    .select("id, role, display_name")
    .eq("company_id", companyId)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: existingMember } = await supabase
    .from("company_members")
    .select("access_status")
    .eq("company_id", companyId)
    .eq("clerk_user_id", user.user_id)
    .maybeSingle();

  const metadataRole = metadataString(metadata, "internalRole", "internal_role");
  const role = validRole(metadataRole)
    ? metadataRole
    : invitation?.role ?? fromClerkOrganizationRole(data.role);
  const displayName = fullName(user.first_name, user.last_name)
    ?? metadataString(metadata, "displayName", "display_name")
    ?? invitation?.display_name
    ?? email;
  const accessStatus = existingMember?.access_status ?? "pending_approval";

  await supabase.from("company_members").upsert({
    company_id: companyId,
    clerk_user_id: user.user_id,
    role,
    display_name: displayName,
    email,
    avatar_url: user.image_url || null,
    active: accessStatus === "active",
    access_status: accessStatus,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await supabase
    .from("company_invitations")
    .update({
      status: "accepted",
      clerk_user_id: user.user_id,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("email", email)
    .eq("status", "pending");
}

async function processEvent(event: WebhookEvent) {
  const supabase = getSupabaseAdminClient();

  if (event.type === "organizationMembership.created" || event.type === "organizationMembership.updated") {
    await syncMembership(event);
    return;
  }

  if (event.type === "organizationMembership.deleted") {
    const companyId = await companyFromOrganization(event.data.organization.id);
    if (!companyId) return;
    const { data: existingMember } = await supabase
      .from("company_members")
      .select("access_status")
      .eq("company_id", companyId)
      .eq("clerk_user_id", event.data.public_user_data.user_id)
      .maybeSingle();
    await supabase
      .from("company_members")
      .update({
        active: false,
        access_status: existingMember?.access_status === "revoked" ? "revoked" : "suspended",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("clerk_user_id", event.data.public_user_data.user_id);
    return;
  }

  if (event.type === "organizationInvitation.accepted") {
    const companyId = await companyFromOrganization(event.data.organization_id);
    if (!companyId) return;
    const metadata = event.data.public_metadata as Metadata;
    const invitationRole = metadataString(metadata, "internalRole", "internal_role");
    const { data: storedInvitation } = await supabase
      .from("company_invitations")
      .select("role, display_name")
      .eq("company_id", companyId)
      .eq("clerk_invitation_id", event.data.id)
      .maybeSingle();
    const { data: existingMember } = await supabase
      .from("company_members")
      .select("access_status")
      .eq("company_id", companyId)
      .eq("clerk_user_id", event.data.user_id)
      .maybeSingle();
    const role = validRole(invitationRole) ? invitationRole : storedInvitation?.role ?? "agent";
    const accessStatus = existingMember?.access_status ?? "pending_approval";

    await supabase.from("company_members").upsert({
      company_id: companyId,
      clerk_user_id: event.data.user_id,
      role,
      display_name: metadataString(metadata, "displayName", "display_name") ?? storedInvitation?.display_name ?? event.data.email_address,
      email: event.data.email_address.toLowerCase(),
      active: accessStatus === "active",
      access_status: accessStatus,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await supabase
      .from("company_invitations")
      .update({
        status: "accepted",
        clerk_user_id: event.data.user_id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("clerk_invitation_id", event.data.id);
    return;
  }

  if (event.type === "organizationInvitation.revoked") {
    await supabase
      .from("company_invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("clerk_invitation_id", event.data.id)
      .eq("status", "pending");
    return;
  }

  if (event.type === "user.updated") {
    const primaryEmail = event.data.email_addresses.find(
      (email) => email.id === event.data.primary_email_address_id,
    )?.email_address ?? event.data.email_addresses[0]?.email_address ?? null;
    await supabase
      .from("company_members")
      .update({
        display_name: fullName(event.data.first_name, event.data.last_name) ?? primaryEmail,
        email: primaryEmail?.toLowerCase() ?? null,
        avatar_url: event.data.image_url || null,
        last_sign_in_at: event.data.last_sign_in_at
          ? new Date(event.data.last_sign_in_at).toISOString()
          : null,
        last_active_at: event.data.last_active_at
          ? new Date(event.data.last_active_at).toISOString()
          : null,
        two_factor_enabled: event.data.two_factor_enabled,
        password_enabled: event.data.password_enabled,
        locked: event.data.locked,
        banned: event.data.banned,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", event.data.id);
    return;
  }

  if (event.type === "user.deleted" && event.data.id) {
    await supabase
      .from("company_members")
      .update({
        active: false,
        access_status: "revoked",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", event.data.id);
  }
}

export async function POST(request: NextRequest) {
  let event: WebhookEvent;
  try {
    event = await verifyWebhook(request);
  } catch {
    return Response.json({ error: "Signature webhook Clerk invalide." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const eventId = request.headers.get("svix-id") ?? request.headers.get("webhook-id");
    if (eventId) {
      const { data: processed } = await supabase
        .from("clerk_webhook_events")
        .select("event_id")
        .eq("event_id", eventId)
        .maybeSingle();
      if (processed) return Response.json({ received: true, duplicate: true });
    }

    await processEvent(event);

    if (eventId) {
      await supabase.from("clerk_webhook_events").upsert({
        event_id: eventId,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook synchronization failed", error);
    return Response.json({ error: "Synchronisation Clerk impossible." }, { status: 500 });
  }
}
