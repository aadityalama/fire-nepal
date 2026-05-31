"use client";

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { familyModuleReducer, initialFamilyModuleState } from "@/lib/family-module/family-module-reducer";
import type { FamilyModuleAction } from "@/lib/family-module/family-module-reducer";
import type { FamilyModuleState } from "@/lib/family-module/types";

type FamilyModuleContextValue = {
  state: FamilyModuleState;
  dispatch: Dispatch<FamilyModuleAction>;
};

const FamilyModuleContext = createContext<FamilyModuleContextValue | null>(null);

export function FamilyModuleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(familyModuleReducer, initialFamilyModuleState);
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <FamilyModuleContext.Provider value={value}>{children}</FamilyModuleContext.Provider>;
}

export function useFamilyModule(): FamilyModuleContextValue {
  const ctx = useContext(FamilyModuleContext);
  if (!ctx) {
    throw new Error("useFamilyModule must be used within FamilyModuleProvider");
  }
  return ctx;
}
