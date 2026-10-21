"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { describeWebDevice, getOrCreateWebDeviceSecret } from "@/lib/device/web-device";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export type DeviceAccessStatus =
  | "checking"
  | "not_required"
  | "pending"
  | "approved"
  | "suspended"
  | "revoked"
  | "expired"
  | "certificate_required"
  | "limit_reached"
  | "user_mismatch"
  | "error";

type DeviceDecision = {
  allowed: boolean;
  configured: boolean;
  status: DeviceAccessStatus;
  policy: string;
  device_id: string | null;
};

export function useDeviceAccess(enabled: boolean) {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const previousStatus = useRef<DeviceAccessStatus | null>(null);
  const [decision, setDecision] = useState<DeviceDecision>({
    allowed: false,
    configured: false,
    status: "checking",
    policy: "any",
    device_id: null,
  });
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!enabled) return;
    const secret = getOrCreateWebDeviceSecret();
    if (!secret) {
      setDecision({
        allowed: false,
        configured: true,
        status: "error",
        policy: "approved_only",
        device_id: null,
      });
      setLoading(false);
      return;
    }

    const description = describeWebDevice();
    const { data, error } = await supabase.rpc("register_or_check_device", {
      p_device_secret: secret,
      p_device_name: description.name,
      p_platform: "web",
      p_browser: description.browser,
      p_operating_system: description.operatingSystem,
    });

    if (error) {
      const migrationMissing =
        error.code === "42883"
        || error.code === "PGRST202"
        || error.message.toLowerCase().includes("register_or_check_device");

      if (!migrationMissing) {
        setDecision({
          allowed: false,
          configured: true,
          status: "error",
          policy: "approved_only",
          device_id: null,
        });
        setLoading(false);
        return;
      }

      // Compatibility while migration 44 has not yet been applied.
      setDecision({
        allowed: true,
        configured: false,
        status: "not_required",
        policy: "any",
        device_id: null,
      });
      setLoading(false);
      return;
    }

    if (!data) {
      setDecision({
        allowed: false,
        configured: true,
        status: "error",
        policy: "approved_only",
        device_id: null,
      });
      setLoading(false);
      return;
    }

    const next = data as DeviceDecision;
    const shouldReload =
      previousStatus.current !== null
      && previousStatus.current !== "approved"
      && previousStatus.current !== "not_required"
      && next.allowed;
    previousStatus.current = next.status;
    setDecision(next);
    setLoading(false);

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
    retry: check,
  };
}
