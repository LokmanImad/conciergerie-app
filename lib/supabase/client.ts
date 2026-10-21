"use client"

import { useAuth } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import { useMemo } from "react"

import {
  DEVICE_PLATFORM_HEADER,
  DEVICE_SECRET_HEADER,
  getOrCreateWebDeviceSecret,
} from "@/lib/device/web-device"

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Variables Supabase manquantes. Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    )
  }

  return { supabaseUrl, supabaseKey }
}

/**
 * Creates one Supabase client per Clerk session. Every request receives the
 * current Clerk session token, allowing PostgreSQL RLS to identify the user.
 */
export function useSupabaseBrowserClient() {
  const { getToken, userId } = useAuth()

  return useMemo(() => {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig()
    const deviceSecret = getOrCreateWebDeviceSecret()

    return createClient(supabaseUrl, supabaseKey, {
      accessToken: async () =>
        typeof getToken === "function" ? getToken() : null,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          ...(deviceSecret ? { [DEVICE_SECRET_HEADER]: deviceSecret } : {}),
          [DEVICE_PLATFORM_HEADER]: "web",
        },
      },
    })
  }, [getToken, userId])
}
