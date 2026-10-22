"use client";

import { createContext, useContext } from "react";

import { useEntitlements } from "@/hooks/use-entitlements";

type ModuleEntitlements = ReturnType<typeof useEntitlements>;

const ModuleEntitlementsContext = createContext<ModuleEntitlements | null>(null);

export function ModuleEntitlementsProvider({
  value,
  children,
}: {
  value: ModuleEntitlements;
  children: React.ReactNode;
}) {
  return (
    <ModuleEntitlementsContext.Provider value={value}>
      {children}
    </ModuleEntitlementsContext.Provider>
  );
}

export function useModuleEntitlements() {
  const context = useContext(ModuleEntitlementsContext);
  if (!context) {
    throw new Error("useModuleEntitlements doit être utilisé dans ModuleEntitlementsProvider.");
  }
  return context;
}

