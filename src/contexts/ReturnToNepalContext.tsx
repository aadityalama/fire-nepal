"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { DEFAULT_RETURN_PLANNER_STATE, RETURN_PLANNER_STORAGE_KEY } from "@/lib/return-to-nepal/default-planner-state";
import { type PlannerSnapshot, computePlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnPlannerLiveBundle } from "@/lib/return-to-nepal/live-inputs";
import { useReturnPlannerLive } from "@/lib/return-to-nepal/use-return-planner-live";
import { sanitizeReturnPlannerState } from "@/lib/return-to-nepal/sanitize-planner-state";
import type { ConstructionPhaseId, ReturnToNepalPlannerState, SettlementChecklistId } from "@/lib/return-to-nepal/types";
import { FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT } from "@/lib/fire-nepal/workspace-data-reset";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

type Ctx = {
  /** User preferences persisted locally (target year, checklist, etc.) */
  state: ReturnToNepalPlannerState;
  /** Auto-merged state from Income, Portfolio, COL, Savings, SSF, etc. */
  effectiveState: ReturnToNepalPlannerState;
  snapshot: PlannerSnapshot;
  live: ReturnPlannerLiveBundle;
  hydrated: boolean;
  cloudReady: boolean;
  hydrateError: string | null;
  retryHydrate: () => void;
  patch: (partial: Partial<ReturnToNepalPlannerState>) => void;
  persistNow: (next?: ReturnToNepalPlannerState) => Promise<ReturnToNepalPlannerState>;
  reset: () => void;
  togglePhase: (id: ConstructionPhaseId) => void;
  toggleSettlement: (id: SettlementChecklistId) => void;
  resync: () => void;
};

const ReturnToNepalContext = createContext<Ctx | null>(null);

function loadGuestReturnPlannerState(): ReturnToNepalPlannerState {
  if (typeof window === "undefined") return DEFAULT_RETURN_PLANNER_STATE;
  try {
    const raw = window.localStorage.getItem(RETURN_PLANNER_STORAGE_KEY);
    if (!raw) return DEFAULT_RETURN_PLANNER_STATE;
    return sanitizeReturnPlannerState(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_RETURN_PLANNER_STATE;
  }
}

function saveGuestReturnPlannerState(state: ReturnToNepalPlannerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RETURN_PLANNER_STORAGE_KEY, JSON.stringify(state));
}

function clearGuestReturnPlannerCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RETURN_PLANNER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function ReturnToNepalProvider({ children }: { children: ReactNode }) {
  const { state, setState, hydrated, cloudReady, hydrateError, retryHydrate, persistNow } = useCloudDocumentState({
    moduleKey: "return_to_nepal",
    getDefault: () => DEFAULT_RETURN_PLANNER_STATE,
    sanitize: sanitizeReturnPlannerState,
    loadLocal: loadGuestReturnPlannerState,
    saveLocal: saveGuestReturnPlannerState,
    clearLocal: clearGuestReturnPlannerCache,
  });

  const { bundle: live, resync } = useReturnPlannerLive(state);

  useEffect(() => {
    const onGlobal = () => {
      void persistNow(DEFAULT_RETURN_PLANNER_STATE);
      resync();
    };
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
    return () => window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
  }, [persistNow, resync]);

  const patch = useCallback(
    (partial: Partial<ReturnToNepalPlannerState>) => {
      setState((s) => ({ ...s, ...partial }));
    },
    [setState],
  );

  const reset = useCallback(() => {
    setState(DEFAULT_RETURN_PLANNER_STATE);
  }, [setState]);

  const togglePhase = useCallback(
    (id: ConstructionPhaseId) => {
      setState((s) => {
        const has = s.completedPhases.includes(id);
        const completedPhases = has ? s.completedPhases.filter((p) => p !== id) : [...s.completedPhases, id];
        return { ...s, completedPhases };
      });
    },
    [setState],
  );

  const toggleSettlement = useCallback(
    (id: SettlementChecklistId) => {
      setState((s) => {
        const has = s.settlementChecklist.includes(id);
        const settlementChecklist = has ? s.settlementChecklist.filter((x) => x !== id) : [...s.settlementChecklist, id];
        return { ...s, settlementChecklist };
      });
    },
    [setState],
  );

  const effectiveState = live.effectiveState;
  const snapshot = useMemo(() => computePlannerSnapshot(effectiveState), [effectiveState]);

  const value = useMemo(
    () => ({
      state,
      effectiveState,
      snapshot,
      live,
      hydrated,
      cloudReady,
      hydrateError,
      retryHydrate,
      patch,
      persistNow,
      reset,
      togglePhase,
      toggleSettlement,
      resync,
    }),
    [
      state,
      effectiveState,
      snapshot,
      live,
      hydrated,
      cloudReady,
      hydrateError,
      retryHydrate,
      patch,
      persistNow,
      reset,
      togglePhase,
      toggleSettlement,
      resync,
    ],
  );

  return <ReturnToNepalContext.Provider value={value}>{children}</ReturnToNepalContext.Provider>;
}

export function useReturnToNepalPlanner(): Ctx {
  const ctx = useContext(ReturnToNepalContext);
  if (!ctx) throw new Error("useReturnToNepalPlanner must be used within ReturnToNepalProvider");
  return ctx;
}
