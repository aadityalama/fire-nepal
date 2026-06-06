"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_RETURN_PLANNER_STATE, RETURN_PLANNER_STORAGE_KEY } from "@/lib/return-to-nepal/default-planner-state";
import { type PlannerSnapshot, computePlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ConstructionPhaseId, ReturnToNepalPlannerState, SettlementChecklistId } from "@/lib/return-to-nepal/types";
import { FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT } from "@/lib/fire-nepal/workspace-data-reset";

type Ctx = {
  state: ReturnToNepalPlannerState;
  snapshot: PlannerSnapshot;
  patch: (partial: Partial<ReturnToNepalPlannerState>) => void;
  reset: () => void;
  togglePhase: (id: ConstructionPhaseId) => void;
  toggleSettlement: (id: SettlementChecklistId) => void;
};

const ReturnToNepalContext = createContext<Ctx | null>(null);

function loadState(): ReturnToNepalPlannerState {
  if (typeof window === "undefined") return DEFAULT_RETURN_PLANNER_STATE;
  try {
    const raw = window.localStorage.getItem(RETURN_PLANNER_STORAGE_KEY);
    if (!raw) return DEFAULT_RETURN_PLANNER_STATE;
    const parsed = JSON.parse(raw) as Partial<ReturnToNepalPlannerState>;
    return { ...DEFAULT_RETURN_PLANNER_STATE, ...parsed };
  } catch {
    return DEFAULT_RETURN_PLANNER_STATE;
  }
}

export function ReturnToNepalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReturnToNepalPlannerState>(DEFAULT_RETURN_PLANNER_STATE);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RETURN_PLANNER_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const onGlobal = () => setState(loadState());
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
    return () => window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
  }, []);

  const patch = useCallback((partial: Partial<ReturnToNepalPlannerState>) => {
    setState((s) => ({ ...s, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_RETURN_PLANNER_STATE);
  }, []);

  const togglePhase = useCallback((id: ConstructionPhaseId) => {
    setState((s) => {
      const has = s.completedPhases.includes(id);
      const completedPhases = has ? s.completedPhases.filter((p) => p !== id) : [...s.completedPhases, id];
      return { ...s, completedPhases };
    });
  }, []);

  const toggleSettlement = useCallback((id: SettlementChecklistId) => {
    setState((s) => {
      const has = s.settlementChecklist.includes(id);
      const settlementChecklist = has ? s.settlementChecklist.filter((x) => x !== id) : [...s.settlementChecklist, id];
      return { ...s, settlementChecklist };
    });
  }, []);

  const snapshot = useMemo(() => computePlannerSnapshot(state), [state]);

  const value = useMemo(
    () => ({ state, snapshot, patch, reset, togglePhase, toggleSettlement }),
    [state, snapshot, patch, reset, togglePhase, toggleSettlement],
  );

  return <ReturnToNepalContext.Provider value={value}>{children}</ReturnToNepalContext.Provider>;
}

export function useReturnToNepalPlanner(): Ctx {
  const ctx = useContext(ReturnToNepalContext);
  if (!ctx) throw new Error("useReturnToNepalPlanner must be used within ReturnToNepalProvider");
  return ctx;
}
