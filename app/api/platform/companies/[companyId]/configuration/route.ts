import { z } from "zod";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";

const companyStatus = z.enum(["trial", "active", "suspended", "expired", "cancelled"]);
const licenseStatus = z.enum(["trial", "active", "grace", "suspended", "expired", "cancelled"]);

const configurationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("company"),
    values: z.object({
      status: companyStatus.optional(),
      web_enabled: z.boolean().optional(),
      mobile_enabled: z.boolean().optional(),
    }).refine((values) => Object.keys(values).length > 0),
  }),
  z.object({
    type: z.literal("license"),
    licenseId: z.string().uuid(),
    status: licenseStatus,
  }),
  z.object({
    type: z.literal("module"),
    moduleKey: z.string().regex(/^[a-z][a-z0-9_]*$/),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("device_policy"),
    accessMode: z.enum(["any", "approved_only", "certificate_required"]),
  }),
  z.object({
    type: z.literal("branding"),
    values: z.object({
      legal_name: z.string().trim().min(1).max(160),
      logo_url: z.string().trim().max(1000).nullable(),
      primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      address: z.string().trim().max(500).nullable(),
      phone: z.string().trim().max(80).nullable(),
      email: z.string().trim().email().max(320).nullable(),
      company_identifier: z.string().trim().max(160).nullable(),
    }),
  }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const parsed = configurationSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new PlatformApiError("La configuration envoyée est invalide.");
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError || !company) throw new PlatformApiError("Société introuvable.", 404);

    const payload = parsed.data;
    let operationError: { message: string } | null = null;
    let auditAction = "company.configuration_updated";
    let metadata: Record<string, unknown> = { type: payload.type };

    if (payload.type === "company") {
      const { error } = await supabase
        .from("companies")
        .update({ ...payload.values, updated_at: new Date().toISOString() })
        .eq("id", companyId);
      operationError = error;
      auditAction = "company.status_updated";
      metadata = { type: payload.type, ...payload.values };
    } else if (payload.type === "license") {
      const { error } = await supabase
        .from("company_licenses")
        .update({ status: payload.status, updated_at: new Date().toISOString() })
        .eq("id", payload.licenseId)
        .eq("company_id", companyId);
      operationError = error;
      auditAction = "company.license_updated";
      metadata = { type: payload.type, status: payload.status };
    } else if (payload.type === "module") {
      const { error } = await supabase.from("company_modules").upsert({
        company_id: companyId,
        module_key: payload.moduleKey,
        enabled: payload.enabled,
        enabled_at: payload.enabled ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
      operationError = error;
      auditAction = "company.module_updated";
      metadata = { type: payload.type, module: payload.moduleKey, enabled: payload.enabled };
    } else if (payload.type === "device_policy") {
      const { error } = await supabase
        .from("company_device_policies")
        .update({
          access_mode: payload.accessMode,
          web_enforced: payload.accessMode !== "any",
          mobile_enforced: payload.accessMode !== "any",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);
      operationError = error;
      auditAction = "company.device_policy_updated";
      metadata = { type: payload.type, access_mode: payload.accessMode };
    } else {
      const { error } = await supabase.from("company_branding").upsert({
        company_id: companyId,
        ...payload.values,
        updated_at: new Date().toISOString(),
      });
      operationError = error;
      auditAction = "company.branding_updated";
    }

    if (operationError) throw new PlatformApiError(operationError.message, 500);

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: userId,
      action: auditAction,
      entity_type: "company",
      entity_id: companyId,
      metadata,
    });

    return Response.json({ success: true });
  } catch (error) {
    return platformErrorResponse(error);
  }
}
