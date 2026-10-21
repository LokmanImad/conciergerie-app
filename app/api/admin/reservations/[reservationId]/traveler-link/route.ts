import { createHash, randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reservationId: string }> },
) {
  try {
    const { reservationId } = await context.params
    const supabase = await getSupabaseServerClient()

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id, check_out")
      .eq("id", reservationId)
      .single()

    if (reservationError || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 })
    }

    const token = randomBytes(32).toString("base64url")
    const minimumExpiry = new Date()
    minimumExpiry.setDate(minimumExpiry.getDate() + 14)

    const stayExpiry = new Date(`${reservation.check_out}T23:59:59`)
    stayExpiry.setDate(stayExpiry.getDate() + 2)
    const expiresAt = stayExpiry > minimumExpiry ? stayExpiry : minimumExpiry

    const { data, error } = await supabase.rpc("create_traveler_registration_link", {
      p_reservation_id: reservationId,
      p_token_hash: hashToken(token),
      p_expires_at: expiresAt.toISOString(),
    })

    if (error) {
      const alreadySubmitted = error.message.includes("REGISTRATION_ALREADY_SUBMITTED")
      return NextResponse.json(
        {
          error: alreadySubmitted
            ? "Le formulaire a déjà été envoyé et ne peut plus recevoir un nouveau lien."
            : "Impossible de créer le lien. Vérifiez que les migrations 32 et 33 sont installées.",
        },
        { status: alreadySubmitted ? 409 : 500 },
      )
    }

    const publicUrl = new URL(`/check-in/${token}`, request.nextUrl.origin).toString()

    return NextResponse.json(
      { url: publicUrl, expires_at: expiresAt.toISOString(), registration: data?.[0] ?? null },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return NextResponse.json({ error: "Vous devez être connecté pour créer ce lien." }, { status: 401 })
  }
}
