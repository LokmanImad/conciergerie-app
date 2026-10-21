import { NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ registrationId: string }> },
) {
  try {
    const { registrationId } = await context.params
    const path = request.nextUrl.searchParams.get("path") ?? ""
    if (!path.startsWith(`${registrationId}/`)) {
      return NextResponse.json({ error: "Document invalide." }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: registration, error: registrationError } = await supabase
      .from("traveler_registrations")
      .select("id")
      .eq("id", registrationId)
      .single()

    if (registrationError || !registration) {
      return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
    }

    const { data, error } = await supabase.storage
      .from("identity-documents")
      .createSignedUrl(path, 300)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Photo indisponible." }, { status: 404 })
    }

    return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 })
  }
}
