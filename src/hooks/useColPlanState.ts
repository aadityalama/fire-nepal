"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  defaultColPlan,
  resetColPlanData,
  sanitizeColPlan,
  type ColPlanState,
} from "@/lib/nepal-col-dashboard";
import {
  clearColPlanLocalCache,
  loadColPlanDocument,
  saveColPlanDocument,
  type ColPlanPersistedDocument,
} from "@/lib/nepal-col-storage";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

function loadGuestColPlan(): ColPlanState {
  return loadColPlanDocument(null).plan;
}

/**
 * Cost-of-living plan state.
 * Authenticated: Supabase `nepal_col` module snapshot is the only source of truth.
 * Guests: anonymous localStorage slot.
 *
 * loadLocal/saveLocal/clearLocal must stay referentially stable (or be ignored via refs
 * inside useCloudDocumentState) — unstable lambdas used to re-trigger hydrate every render
 * and blank Return-to-Nepal on mobile.
 */
export function useColPlanState(): {
  plan: ColPlanState;
  setPlan: Dispatch<SetStateAction<ColPlanState>>;
  hydrated: boolean;
  persistPlan: (next?: ColPlanState) => Promise<ColPlanPersistedDocument>;
  /** Reset CoL plan to defaults and persist immediately (cloud or guest local). */
  resetPlan: () => Promise<ColPlanPersistedDocument>;
  userId: string | undefined;
} {
  const { user } = useProductAuth();
  const userId = user?.id;

  const saveLocal = useCallback((next: ColPlanState) => {
    saveColPlanDocument(next, userId ?? null);
  }, [userId]);

  const clearLocal = useCallback(() => {
    if (userId) clearColPlanLocalCache(userId);
  }, [userId]);

  const { state: plan, setState: setPlan, hydrated, persistNow } = useCloudDocumentState({
    moduleKey: "nepal_col",
    getDefault: defaultColPlan,
    sanitize: sanitizeColPlan,
    loadLocal: loadGuestColPlan,
    saveLocal,
    clearLocal: userId ? clearLocal : undefined,
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

  const resetPlan = useCallback(async () => {
    return persistPlan(resetColPlanData());
  }, [persistPlan]);

  return useMemo(
    () => ({ plan, setPlan, hydrated, persistPlan, resetPlan, userId }),
    [plan, setPlan, hydrated, persistPlan, resetPlan, userId],
  );
}
