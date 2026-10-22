"use client";

import { useEffect } from "react";

import { useSupabaseBrowserClient } from "@/lib/supabase/client";

export function UserActivityTracker() {
  const supabase = useSupabaseBrowserClient();

  useEffect(() => {
    let lastRecordedAt = 0;
    const record = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRecordedAt < 60_000) return;
      lastRecordedAt = Date.now();
      void supabase.rpc("record_current_member_activity");
    };

    record();
    const interval = window.setInterval(record, 5 * 60_000);
    window.addEventListener("focus", record);
    document.addEventListener("visibilitychange", record);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", record);
      document.removeEventListener("visibilitychange", record);
    };
  }, [supabase]);

  return null;
}
