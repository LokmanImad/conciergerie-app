import "react-native-url-polyfill/auto";

import { useSession } from "@clerk/expo";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

import { appConfig } from "@/lib/config";
import { getCachedDeviceSecret } from "@/lib/device-secret";

export function useSupabaseClient() {
  const { session } = useSession();
  const deviceSecret = getCachedDeviceSecret();

  return useMemo(
    () =>
      createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
        accessToken: async () => session?.getToken() ?? null,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            ...(deviceSecret ? { "x-concierge-device-secret": deviceSecret } : {}),
            "x-concierge-platform": "mobile",
          },
        },
      }),
    [deviceSecret, session],
  );
}
