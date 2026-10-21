import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const DEVICE_COOKIE_NAME = "concierge_device_secret"

export async function getSupabaseServerClient() {
  const { getToken, userId } = await auth()

  if (!userId) {
    throw new Error("Utilisateur non authentifie")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Variables Supabase manquantes. Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    )
  }

  const cookieStore = await cookies()
  const deviceSecret = cookieStore.get(DEVICE_COOKIE_NAME)?.value

  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => getToken(),
    global: {
      headers: {
        ...(deviceSecret ? { "x-concierge-device-secret": deviceSecret } : {}),
        "x-concierge-platform": "web",
      },
    },
  })
}

export const createServerClient = getSupabaseServerClient
