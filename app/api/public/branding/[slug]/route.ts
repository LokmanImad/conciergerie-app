import { z } from "zod";

import { DEFAULT_BRANDING_COLORS } from "@/lib/branding-theme";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const parsedSlug = slugSchema.safeParse((await context.params).slug);
  if (!parsedSlug.success) {
    return Response.json({ error: "Société introuvable." }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, slug, name")
      .eq("slug", parsedSlug.data)
      .maybeSingle();

    if (companyError || !company) {
      return Response.json({ error: "Société introuvable." }, { status: 404 });
    }

    const { data: branding } = await supabase
      .from("company_branding")
      .select("legal_name, logo_url, primary_color, accent_color")
      .eq("company_id", company.id)
      .maybeSingle();

    return Response.json(
      {
        branding: {
          company_id: company.id,
          slug: company.slug,
          name: branding?.legal_name || company.name,
          logo_url: branding?.logo_url ?? null,
          primary_color: branding?.primary_color ?? DEFAULT_BRANDING_COLORS.primary,
          accent_color: branding?.accent_color ?? DEFAULT_BRANDING_COLORS.accent,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "Identité visuelle indisponible." }, { status: 500 });
  }
}
