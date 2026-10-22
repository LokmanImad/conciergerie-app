import { z } from "zod";

import {
  PlatformApiError,
  platformErrorResponse,
  requirePlatformAdmin,
} from "@/lib/platform/server";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const BRANDING_BUCKET = "company-branding";

const brandingSchema = z.object({
  legal_name: z.string().trim().min(1).max(160),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(80),
  email: z.union([z.literal(""), z.string().trim().email().max(320)]),
  company_identifier: z.string().trim().max(160),
  remove_logo: z.boolean(),
});

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function detectLogoExtension(bytes: Uint8Array) {
  const isPng = bytes.length >= 8
    && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  if (isPng) return { extension: "png", contentType: "image/png" };

  const isJpeg = bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
  if (isJpeg) return { extension: "jpg", contentType: "image/jpeg" };

  const isWebp = bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (isWebp) return { extension: "webp", contentType: "image/webp" };

  return null;
}

function storagePathFromPublicUrl(url: string | null, companyId: string) {
  if (!url) return null;
  try {
    const marker = `/storage/v1/object/public/${BRANDING_BUCKET}/`;
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${companyId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  let uploadedPath: string | null = null;

  try {
    const { companyId } = await context.params;
    const { userId, supabase } = await requirePlatformAdmin();
    const formData = await request.formData();
    const parsed = brandingSchema.safeParse({
      legal_name: getText(formData, "legal_name"),
      primary_color: getText(formData, "primary_color"),
      accent_color: getText(formData, "accent_color"),
      address: getText(formData, "address"),
      phone: getText(formData, "phone"),
      email: getText(formData, "email"),
      company_identifier: getText(formData, "company_identifier"),
      remove_logo: getText(formData, "remove_logo") === "true",
    });
    if (!parsed.success) {
      throw new PlatformApiError("Les informations de l’identité visuelle sont invalides.");
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError || !company) throw new PlatformApiError("Société introuvable.", 404);

    const { data: currentBranding } = await supabase
      .from("company_branding")
      .select("logo_url")
      .eq("company_id", companyId)
      .maybeSingle();
    const previousLogoUrl = currentBranding?.logo_url ?? null;

    const logoEntry = formData.get("logo");
    const logo = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null;
    let logoUrl = parsed.data.remove_logo ? null : previousLogoUrl;

    if (logo) {
      if (logo.size > MAX_LOGO_SIZE) {
        throw new PlatformApiError("Le logo ne doit pas dépasser 2 Mo.");
      }

      const bytes = new Uint8Array(await logo.arrayBuffer());
      const image = detectLogoExtension(bytes);
      if (!image) {
        throw new PlatformApiError("Format de logo invalide. Utilisez PNG, JPG ou WebP.");
      }

      uploadedPath = `${companyId}/logo-${crypto.randomUUID()}.${image.extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BRANDING_BUCKET)
        .upload(uploadedPath, bytes, {
          contentType: image.contentType,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) {
        throw new PlatformApiError(
          uploadError.message.includes("Bucket not found")
            ? "Le stockage des logos n’est pas configuré. Exécutez le script SQL 48."
            : `Impossible d’importer le logo : ${uploadError.message}`,
          500,
        );
      }

      logoUrl = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }

    const { remove_logo: _removeLogo, ...values } = parsed.data;
    const { error: updateError } = await supabase.from("company_branding").upsert({
      company_id: companyId,
      ...values,
      address: values.address || null,
      phone: values.phone || null,
      email: values.email || null,
      company_identifier: values.company_identifier || null,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    });
    if (updateError) {
      if (uploadedPath) await supabase.storage.from(BRANDING_BUCKET).remove([uploadedPath]);
      throw new PlatformApiError(updateError.message, 500);
    }

    const previousPath = storagePathFromPublicUrl(previousLogoUrl, companyId);
    if (previousPath && previousPath !== uploadedPath && (logo || parsed.data.remove_logo)) {
      await supabase.storage.from(BRANDING_BUCKET).remove([previousPath]);
    }

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_user_id: userId,
      action: "company.branding_updated",
      entity_type: "company",
      entity_id: companyId,
      metadata: {
        logo_replaced: Boolean(logo),
        logo_removed: parsed.data.remove_logo && !logo,
        primary_color: values.primary_color,
        accent_color: values.accent_color,
      },
    });

    return Response.json({
      success: true,
      branding: { ...values, logo_url: logoUrl },
    });
  } catch (error) {
    return platformErrorResponse(error);
  }
}
