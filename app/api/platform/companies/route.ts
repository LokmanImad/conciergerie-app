import { randomUUID } from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";

const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function POST(request: Request) {
  let organizationId: string | null = null;
  try {
    const { userId, supabase } = await requirePlatformAdmin();
    const parsed = companySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new PlatformApiError("Le nom ou l’identifiant d’URL de la société est invalide.");
    }

    const { error: migrationError } = await supabase
      .from("company_invitations")
      .select("id")
      .limit(1);
    if (migrationError) {
      throw new PlatformApiError("Exécutez d’abord la migration 45 dans Supabase.", 503);
    }

    const companyId = randomUUID();
    const clerk = await clerkClient();
    const organization = await clerk.organizations.createOrganization({
      name: parsed.data.name,
      slug: parsed.data.slug,
      publicMetadata: { companyId },
    });
    organizationId = organization.id;

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        id: companyId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        clerk_organization_id: organization.id,
        status: "trial",
        web_enabled: true,
        mobile_enabled: false,
      })
      .select("*")
      .single();

    if (error || !company) {
      await clerk.organizations.deleteOrganization(organization.id).catch(() => undefined);
      organizationId = null;
      throw new PlatformApiError(error?.message ?? "Impossible de créer la société.", 409);
    }

    await supabase.from("audit_logs").insert({
      company_id: company.id,
      actor_user_id: userId,
      action: "company.provisioned",
      entity_type: "company",
      entity_id: company.id,
      metadata: { clerk_organization_id: organization.id },
    });

    return Response.json({ company }, { status: 201 });
  } catch (error) {
    if (organizationId) {
      const clerk = await clerkClient().catch(() => null);
      await clerk?.organizations.deleteOrganization(organizationId).catch(() => undefined);
    }
    return platformErrorResponse(error);
  }
}

