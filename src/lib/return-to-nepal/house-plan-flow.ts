import { RETURN_TO_NEPAL_CHECKLIST_HREF } from "@/lib/return-to-nepal/return-checklist-routes";
import type { HousePlanStatus, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

/** One of the three user-selectable housing plans (excludes unknown). */
export type SelectableHousePlanStatus = Exclude<HousePlanStatus, "unknown">;

/** Max wait for canonical return_to_nepal persist before failing the Save CTA. */
export const HOUSE_PLAN_SAVE_TIMEOUT_MS = 12_000;

export const HOUSE_PLAN_SAVE_TIMEOUT_MESSAGE =
  "Save timed out. Check your connection and try again.";

export function isSelectableHousePlanStatus(
  status: HousePlanStatus | null | undefined,
): status is SelectableHousePlanStatus {
  return status === "plan_to_buy_build" || status === "already_own" || status === "not_needed";
}

/** Destination after saving a house plan from the decision page. */
export function housePlanReturnHref(_fromChecklist: boolean): string {
  return RETURN_TO_NEPAL_CHECKLIST_HREF;
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

export function formatHousePlanSaveError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not save your housing plan.";
}

/** Reject if `promise` does not settle within `ms`. Clears the timer on settle. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = HOUSE_PLAN_SAVE_TIMEOUT_MESSAGE,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function canStartHousePlanSave(args: {
  pending: HousePlanStatus | null;
  saving: boolean;
  hydrateError: string | null;
}): args is {
  pending: SelectableHousePlanStatus;
  saving: false;
  hydrateError: null;
} {
  return (
    isSelectableHousePlanStatus(args.pending) &&
    !args.saving &&
    args.hydrateError == null
  );
}

export type HousePlanSaveResult =
  | { ok: true; state: ReturnToNepalPlannerState }
  | { ok: false; error: string };

/**
 * Await canonical return_to_nepal persist for the selected house plan.
 * Applies a timeout so the Save CTA never hangs on "Saving…".
 */
export async function runHousePlanSave(args: {
  pending: SelectableHousePlanStatus;
  state: ReturnToNepalPlannerState;
  persistNow: (next: ReturnToNepalPlannerState) => Promise<ReturnToNepalPlannerState>;
  timeoutMs?: number;
}): Promise<HousePlanSaveResult> {
  const next = mergeHousePlanStatus(args.state, args.pending);
  try {
    const saved = await withTimeout(
      args.persistNow(next),
      args.timeoutMs ?? HOUSE_PLAN_SAVE_TIMEOUT_MS,
    );
    return { ok: true, state: saved };
  } catch (error) {
    return { ok: false, error: formatHousePlanSaveError(error) };
  }
}
