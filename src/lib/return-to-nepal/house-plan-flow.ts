import { RETURN_TO_NEPAL_CHECKLIST_HREF } from "@/lib/return-to-nepal/return-checklist-routes";
import type { HousePlanStatus, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

/** One of the three user-selectable housing plans (excludes unknown). */
export type SelectableHousePlanStatus = Exclude<HousePlanStatus, "unknown">;

export function isSelectableHousePlanStatus(
  status: HousePlanStatus | null | undefined,
): status is SelectableHousePlanStatus {
  return status === "plan_to_buy_build" || status === "already_own" || status === "not_needed";
}

/** Destination after saving a house plan from the decision page. */
export function housePlanReturnHref(fromChecklist: boolean): string {
  return fromChecklist ? RETURN_TO_NEPAL_CHECKLIST_HREF : RETURN_TO_NEPAL_CHECKLIST_HREF;
}

export function mergeHousePlanStatus(
  state: ReturnToNepalPlannerState,
  housePlanStatus: SelectableHousePlanStatus,
): ReturnToNepalPlannerState {
  return { ...state, housePlanStatus };
}

/** True when the user picked a different option than what is already saved. */
export function housePlanSelectionDirty(
  saved: HousePlanStatus,
  pending: HousePlanStatus | null,
): boolean {
  if (pending == null) return false;
  return pending !== saved;
}

export function formatPlannerHydrateError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not load your Return Planner data.";
}
