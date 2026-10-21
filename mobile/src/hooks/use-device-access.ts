import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Device from "expo-device";

import { getOrCreateDeviceSecret } from "@/lib/device-secret";
import { useSupabaseClient } from "@/lib/supabase";

export type MobileDeviceStatus =
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
  status: MobileDeviceStatus;
  policy: string;
  device_id: string | null;
};

export function useDeviceAccess(enabled: boolean) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<DeviceDecision>({
    allowed: false,
    configured: false,
    status: "checking",
    policy: "any",
    device_id: null,
  });

  const check = useCallback(async () => {
    if (!enabled) return;
    try {
      const secret = await getOrCreateDeviceSecret();
      const operatingSystem = Device.osName ?? "Mobile";
      const model = Device.modelName ?? "Appareil mobile";
      const name = Device.deviceName || `${model} · ${operatingSystem}`;
      const { data, error } = await supabase.rpc("register_or_check_device", {
        p_device_secret: secret,
        p_device_name: name,
        p_platform: "mobile",
        p_browser: null,
        p_operating_system: operatingSystem,
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
          return;
        }

        setDecision({
          allowed: true,
          configured: false,
          status: "not_required",
          policy: "any",
          device_id: null,
        });
      } else if (!data) {
        setDecision({
          allowed: false,
          configured: true,
          status: "error",
          policy: "approved_only",
          device_id: null,
        });
      } else {
        const next = data as DeviceDecision;
        setDecision(next);
      }
    } catch {
      setDecision({
        allowed: false,
        configured: true,
        status: "error",
        policy: "approved_only",
        device_id: null,
      });
    } finally {
      setLoading(false);
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
    retry: check,
  };
}
