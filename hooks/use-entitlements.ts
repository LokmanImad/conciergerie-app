"use client";

import { useEffect, useState } from "react";

import { useSupabaseBrowserClient } from "@/lib/supabase/client";

type EntitlementState = {
  loading: boolean;
  configured: boolean;
  platformAdmin: boolean;
  webAllowed: boolean;
  enabledModules: Set<string>;
  branding: {
    name: string;
    logo_url: string | null;
    primary_color: string;
    accent_color: string;
  } | null;
};

type EntitlementPayload = {
  company_id: string | null;
  platform_admin: boolean;
  platform_allowed: boolean;
  modules: string[];
  branding: EntitlementState["branding"];
};

export function useEntitlements(enabled = true) {
  const supabase = useSupabaseBrowserClient();
  const [state, setState] = useState<EntitlementState>({
    loading: true,
    configured: false,
    platformAdmin: false,
    webAllowed: true,
    enabledModules: new Set(),
    branding: null,
  });

  useEffect(() => {
    let active = true;
    if (!enabled) {
      return () => {
        active = false;
      };
    }

    const load = async () => {
      const { data, error } = await supabase.rpc("get_current_entitlements", {
        p_platform: "web",
      });

      if (!active) return;
      const configured = !error && Boolean(data);
      const payload = (data ?? null) as EntitlementPayload | null;
      setState({
        loading: false,
        configured,
        platformAdmin: configured && Boolean(payload?.platform_admin),
        webAllowed: !configured || Boolean(payload?.platform_allowed),
        enabledModules: new Set(configured ? payload?.modules ?? [] : []),
        branding: configured ? payload?.branding ?? null : null,
      });
    };

    void load();
    return () => {
      active = false;
    };
  }, [enabled, supabase]);

  return {
    ...state,
    loading: enabled && state.loading,
    canUse: (moduleKey?: string) =>
      !moduleKey || !state.configured || state.platformAdmin || state.enabledModules.has(moduleKey),
  };
}
