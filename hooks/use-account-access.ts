"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export type AccountAccessStatus =
  | "checking"
  | "not_configured"
  | "not_assigned"
  | "pending_approval"
  | "active"
  | "suspended"
  | "revoked"
  | "error";

export type AccountAccessDecision = {
  allowed: boolean;
  configured: boolean;
  status: AccountAccessStatus;
  platform_admin: boolean;
  company_id: string | null;
  company_slug: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  display_name: string | null;
  email: string | null;
  role: string | null;
};

const initialDecision: AccountAccessDecision = {
  allowed: false,
  configured: true,
  status: "checking",
  platform_admin: false,
  company_id: null,
  company_slug: null,
  company_name: null,
  company_logo_url: null,
  display_name: null,
  email: null,
  role: null,
};

export function useAccountAccess(enabled: boolean) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const previousStatus = useRef<AccountAccessStatus | null>(null);
  const [decision, setDecision] = useState<AccountAccessDecision>(initialDecision);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!enabled) return;
    setChecking(true);

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
      setLoading(false);
      setChecking(false);
      return;
    }

    const next = (data ?? {
      allowed: false,
      configured: true,
      status: "not_assigned",
    }) as AccountAccessDecision;
    const shouldReload =
      previousStatus.current !== null
      && previousStatus.current !== "active"
      && next.allowed;

    previousStatus.current = next.status;
    setDecision(next);
    setLoading(false);
    setChecking(false);

    if (shouldReload) router.refresh();
  }, [enabled, router, supabase]);

  useEffect(() => {
    if (!enabled) return;
    void check();

    const interval = window.setInterval(() => void check(), 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [check, enabled]);

  return {
    ...decision,
    loading: enabled && loading,
    checking: enabled && checking,
    retry: check,
  };
}
