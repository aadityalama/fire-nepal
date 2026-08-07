"use client";

import { createContext, useCallback, useContext, useMemo, type Dispatch, type ReactNode } from "react";
import { familyModuleReducer, initialFamilyModuleState } from "@/lib/family-module/family-module-reducer";
import type { FamilyModuleAction } from "@/lib/family-module/family-module-reducer";
import {
  clearFamilyModuleLocalCache,
  loadFamilyModuleLocal,
  saveFamilyModuleLocal,
  sanitizeFamilyModuleState,
} from "@/lib/family-module/family-module-storage";
import type { FamilyModuleState } from "@/lib/family-module/types";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

type FamilyModuleContextValue = {
  state: FamilyModuleState;
  dispatch: Dispatch<FamilyModuleAction>;
  hydrated: boolean;
};

const FamilyModuleContext = createContext<FamilyModuleContextValue | null>(null);

export function FamilyModuleProvider({ children }: { children: ReactNode }) {
  const { state, setState, hydrated } = useCloudDocumentState({
    moduleKey: "family_hub",
    getDefault: () => initialFamilyModuleState,
    sanitize: sanitizeFamilyModuleState,
    loadLocal: loadFamilyModuleLocal,
    saveLocal: saveFamilyModuleLocal,
    clearLocal: clearFamilyModuleLocalCache,
  });

  const dispatch = useCallback<Dispatch<FamilyModuleAction>>(
    (action) => {
      setState((prev) => familyModuleReducer(prev, action));
    },
    [setState],
  );

  const value = useMemo(() => ({ state, dispatch, hydrated }), [state, dispatch, hydrated]);
  return <FamilyModuleContext.Provider value={value}>{children}</FamilyModuleContext.Provider>;
}

export function useFamilyModule(): FamilyModuleContextValue {
  const ctx = useContext(FamilyModuleContext);
  if (!ctx) {
    throw new Error("useFamilyModule must be used within FamilyModuleProvider");
  }
  return ctx;
}
