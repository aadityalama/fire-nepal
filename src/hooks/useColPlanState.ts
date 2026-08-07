"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { defaultColPlan, sanitizeColPlan, type ColPlanState } from "@/lib/nepal-col-dashboard";
import {
  clearColPlanLocalCache,
  loadColPlanDocument,
  saveColPlanDocument,
  type ColPlanPersistedDocument,
} from "@/lib/nepal-col-storage";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

/**
 * Cost-of-living plan state.
 * Authenticated: Supabase `nepal_col` module snapshot is the only source of truth.
 * Guests: anonymous localStorage slot.
 */
export function useColPlanState(): {
  plan: ColPlanState;
  setPlan: Dispatch<SetStateAction<ColPlanState>>;
  hydrated: boolean;
  persistPlan: (next?: ColPlanState) => Promise<ColPlanPersistedDocument>;
  userId: string | undefined;
} {
  const { user } = useProductAuth();
  const userId = user?.id;

  const { state: plan, setState: setPlan, hydrated, persistNow } = useCloudDocumentState({
    moduleKey: "nepal_col",
    getDefault: defaultColPlan,
    sanitize: sanitizeColPlan,
    loadLocal: () => loadColPlanDocument(null).plan,
    saveLocal: (next) => {
      saveColPlanDocument(next, userId ?? null);
    },
    clearLocal: userId ? () => clearColPlanLocalCache(userId) : undefined,
  });

  const persistPlan = useCallback(
    async (next?: ColPlanState) => {
      const snapshot = await persistNow(next);
      return {
        version: 3 as const,
        updatedAt: new Date().toISOString(),
        plan: snapshot,
      } satisfies ColPlanPersistedDocument;
    },
    [persistNow],
  );

  return useMemo(
    () => ({ plan, setPlan, hydrated, persistPlan, userId }),
    [plan, setPlan, hydrated, persistPlan, userId],
  );
}
