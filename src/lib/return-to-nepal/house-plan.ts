import type { HousePlanDecision, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

/** True when the user explicitly does not need a house funding goal. */
export function houseFundingNotRequired(decision: HousePlanDecision): boolean {
  return decision === "already_own" || decision === "not_needed";
}

/**
 * Effective house decision for readiness/checklist.
 * If the user has not chosen yet but already has a House/Land savings goal,
 * treat as plan-to-buy/build for progress display only (does not write state).
 */
export function resolveEffectiveHouseDecision(
  state: Pick<ReturnToNepalPlannerState, "housePlanDecision">,
  hasHouseSavingsGoal: boolean,
): HousePlanDecision {
  if (state.housePlanDecision !== "unknown") return state.housePlanDecision;
  if (hasHouseSavingsGoal) return "plan_to_buy_build";
  return "unknown";
}

/** House budget amount that should count toward return funding gap. */
export function effectiveHouseFundingBudgetNpr(
  decision: HousePlanDecision,
  houseTotalBudgetNpr: number,
): number {
  if (houseFundingNotRequired(decision)) return 0;
  return Math.max(0, houseTotalBudgetNpr);
}
