import { DEFAULT_RETURN_PLANNER_STATE } from "@/lib/return-to-nepal/default-planner-state";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

export function sanitizeReturnPlannerState(raw: unknown): ReturnToNepalPlannerState {
  if (!raw || typeof raw !== "object") return DEFAULT_RETURN_PLANNER_STATE;
  const parsed = raw as Partial<ReturnToNepalPlannerState>;
  return {
    ...DEFAULT_RETURN_PLANNER_STATE,
    ...parsed,
    completedPhases: Array.isArray(parsed.completedPhases) ? parsed.completedPhases : DEFAULT_RETURN_PLANNER_STATE.completedPhases,
    settlementChecklist: Array.isArray(parsed.settlementChecklist)
      ? parsed.settlementChecklist
      : DEFAULT_RETURN_PLANNER_STATE.settlementChecklist,
    debtReviewed: Boolean(parsed.debtReviewed),
    housePlanStatus:
      parsed.housePlanStatus === "plan_to_buy_build" ||
      parsed.housePlanStatus === "already_own" ||
      parsed.housePlanStatus === "not_needed" ||
      parsed.housePlanStatus === "unknown"
        ? parsed.housePlanStatus
        : DEFAULT_RETURN_PLANNER_STATE.housePlanStatus,
  };
}
