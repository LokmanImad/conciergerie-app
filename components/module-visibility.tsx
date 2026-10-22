"use client";

import { useModuleEntitlements } from "@/components/module-entitlements-context";

export function ModuleVisibility({
  moduleKey,
  anyOf,
  children,
  fallback = null,
}: {
  moduleKey?: string;
  anyOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const entitlements = useModuleEntitlements();
  const visible = moduleKey
    ? entitlements.canUse(moduleKey)
    : Boolean(anyOf?.some((key) => entitlements.canUse(key)));

  return visible ? children : fallback;
}

