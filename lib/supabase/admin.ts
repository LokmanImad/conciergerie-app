import "server-only"

import { createClient } from "@supabase/supabase-js"

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Ajoutez SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) aux variables serveur.",
    )
  }

  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
