import { useEffect, useState } from "react";

import { useSupabaseClient } from "@/lib/supabase";

type EntitlementPayload = {
  platform_allowed: boolean;
  modules: string[];
};

export function useMobileEntitlements(enabled: boolean) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [mobileAllowed, setMobileAllowed] = useState(true);
  const [modules, setModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    if (!enabled) {
      return () => {
        active = false;
      };
    }

    const load = async () => {
      const { data, error } = await supabase.rpc("get_current_entitlements", {
        p_platform: "mobile",
      });

      if (!active) return;
      const ready = !error && Boolean(data);
      const payload = (data ?? null) as EntitlementPayload | null;
      setConfigured(ready);
      setMobileAllowed(!ready || Boolean(payload?.platform_allowed));
      setModules(new Set(ready ? payload?.modules ?? [] : []));
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [enabled, supabase]);

  return {
    loading: enabled && loading,
    configured,
    mobileAllowed,
    canUse: (moduleKey: string) => !configured || modules.has(moduleKey),
  };
}
