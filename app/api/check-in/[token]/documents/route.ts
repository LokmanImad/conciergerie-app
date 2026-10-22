import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getPublicSupabaseClient } from "@/lib/supabase/public"

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_FILE_SIZE = 4 * 1024 * 1024

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 })
  }

  const publicClient = getPublicSupabaseClient()
  const { data: scope, error: scopeError } = await publicClient.rpc("get_public_registration_upload_scope_secure", {
    p_token_hash: hashToken(token),
  })

  if (scopeError || !scope) {
    return NextResponse.json({ error: "Ce lien est invalide ou expiré." }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const side = formData.get("side")
  const position = Number(formData.get("position"))

  if (
    !(file instanceof File)
    || !ALLOWED_TYPES.has(file.type)
    || file.size <= 0
    || file.size > MAX_FILE_SIZE
    || (side !== "front" && side !== "back")
    || !Number.isInteger(position)
    || position < 1
    || position > Number(scope.expected_adults)
  ) {
    return NextResponse.json(
      { error: "Photo invalide. Utilisez une image JPG, PNG ou WebP de moins de 4 Mo." },
      { status: 400 },
    )
  }

  try {
    const adminClient = getSupabaseAdminClient()
    const path = `${scope.registration_id}/${position}/${side}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await adminClient.storage
      .from("identity-documents")
      .upload(path, bytes, { contentType: file.type, upsert: true, cacheControl: "0" })

    if (uploadError) {
      return NextResponse.json({ error: "Impossible d'enregistrer la photo." }, { status: 500 })
    }

    return NextResponse.json({ path })
  } catch (configurationError) {
    return NextResponse.json(
      { error: configurationError instanceof Error ? configurationError.message : "Configuration serveur manquante." },
      { status: 503 },
    )
  }
}
