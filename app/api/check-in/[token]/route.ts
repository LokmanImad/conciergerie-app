import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { travelerSubmissionSchema } from "@/features/travelers/validation"
import { getPublicSupabaseClient } from "@/lib/supabase/public"

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function invalidLinkResponse() {
  return NextResponse.json(
    { error: "Ce lien est invalide, expiré ou a été remplacé." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  )
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  if (!TOKEN_PATTERN.test(token)) return invalidLinkResponse()

  const supabase = getPublicSupabaseClient()
  const { data, error } = await supabase.rpc("get_public_traveler_registration_secure", {
    p_token_hash: hashToken(token),
  })

  if (error || !data) return invalidLinkResponse()

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  if (!TOKEN_PATTERN.test(token)) return invalidLinkResponse()

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Formulaire invalide." }, { status: 400 })
  }

  const parsed = travelerSubmissionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Veuillez compléter tous les champs obligatoires." },
      { status: 400 },
    )
  }

  const supabase = getPublicSupabaseClient()
  const { data, error } = await supabase.rpc("submit_public_traveler_registration_secure", {
    p_token_hash: hashToken(token),
    p_travelers: parsed.data.travelers,
    p_signed_by: parsed.data.signed_by,
    p_signature_data_url: parsed.data.signature_data_url,
    p_consent: parsed.data.consent,
  })

  if (error) {
    if (error.message.includes("ADULT_COUNT_MISMATCH")) {
      return NextResponse.json(
        { error: "Le nombre d'adultes ne correspond plus à la réservation. Demandez un nouveau lien." },
        { status: 409 },
      )
    }
    if (error.message.includes("REGISTRATION_ALREADY_SUBMITTED")) {
      return NextResponse.json({ error: "Ce formulaire a déjà été envoyé." }, { status: 409 })
    }
    if (
      error.message.includes("INCOMPLETE_TRAVELER_OR_DOCUMENT")
      || error.message.includes("INVALID_OR_MISSING_DOCUMENT")
    ) {
      return NextResponse.json(
        { error: "Ajoutez les photos demandées pour chaque document d'identité." },
        { status: 400 },
      )
    }
    return invalidLinkResponse()
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
}
