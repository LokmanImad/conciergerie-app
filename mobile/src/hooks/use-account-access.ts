import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { useSupabaseClient } from "@/lib/supabase";

export type MobileAccountAccessStatus =
  | "checking"
  | "not_configured"
  | "not_assigned"
  | "pending_approval"
  | "active"
  | "suspended"
  | "revoked"
  | "error";

export type MobileAccountAccessDecision = {
  allowed: boolean;
  configured: boolean;
  status: MobileAccountAccessStatus;
  company_id: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  display_name: string | null;
  email: string | null;
  role: string | null;
};

const initialDecision: MobileAccountAccessDecision = {
  allowed: false,
  configured: true,
  status: "checking",
  company_id: null,
  company_name: null,
  company_logo_url: null,
  display_name: null,
  email: null,
  role: null,
};

export function useAccountAccess(enabled: boolean) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [decision, setDecision] = useState<MobileAccountAccessDecision>(initialDecision);

  const check = useCallback(async () => {
    if (!enabled) return;
    setChecking(true);

    try {
      const { data, error } = await supabase.rpc("get_current_account_access");

      if (error) {
        const migrationMissing =
          error.code === "42883"
          || error.code === "PGRST202"
          || error.message.toLowerCase().includes("get_current_account_access");

        setDecision(
          migrationMissing
            ? {
                ...initialDecision,
                allowed: true,
                configured: false,
                status: "not_configured",
              }
            : { ...initialDecision, status: "error" },
        );
      } else {
        setDecision(
          (data ?? {
            ...initialDecision,
            status: "not_assigned",
          }) as MobileAccountAccessDecision,
        );
      }
    } catch {
      setDecision({ ...initialDecision, status: "error" });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [enabled, supabase]);

  useEffect(() => {
    if (!enabled) return;
    const initialCheck = setTimeout(() => void check(), 0);
    const interval = setInterval(() => void check(), 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      subscription.remove();
    };
  }, [check, enabled]);

  return {
    ...decision,
    loading: enabled && loading,
    checking: enabled && checking,
    retry: check,
  };
}
