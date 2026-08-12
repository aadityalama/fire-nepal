import { DEFAULT_RETURN_PLANNER_STATE } from "@/lib/return-to-nepal/default-planner-state";
import type {
  HouseAcquireMode,
  HousePlanDecision,
  ReturnToNepalPlannerState,
} from "@/lib/return-to-nepal/types";

const HOUSE_DECISIONS = new Set<HousePlanDecision>(["unknown", "already_own", "plan_to_buy_build", "not_needed"]);
const HOUSE_ACQUIRE_MODES = new Set<HouseAcquireMode>(["buy", "build"]);

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeHousePlanDecision(value: unknown): HousePlanDecision {
  return typeof value === "string" && HOUSE_DECISIONS.has(value as HousePlanDecision)
    ? (value as HousePlanDecision)
    : DEFAULT_RETURN_PLANNER_STATE.housePlanDecision;
}

function sanitizeHouseAcquireMode(value: unknown): HouseAcquireMode | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && HOUSE_ACQUIRE_MODES.has(value as HouseAcquireMode)
    ? (value as HouseAcquireMode)
    : null;
}

function sanitizeHouseFullyOwned(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  return null;
}

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
    housePlanDecision: sanitizeHousePlanDecision(parsed.housePlanDecision),
    houseAcquireMode: sanitizeHouseAcquireMode(parsed.houseAcquireMode),
    houseOwnedValueNpr: Math.max(0, asFiniteNumber(parsed.houseOwnedValueNpr, DEFAULT_RETURN_PLANNER_STATE.houseOwnedValueNpr)),
    houseLocation: asString(parsed.houseLocation, DEFAULT_RETURN_PLANNER_STATE.houseLocation),
    houseFullyOwned: sanitizeHouseFullyOwned(parsed.houseFullyOwned),
    houseNotes: asString(parsed.houseNotes, DEFAULT_RETURN_PLANNER_STATE.houseNotes),
    houseTargetYear: Math.max(0, Math.round(asFiniteNumber(parsed.houseTargetYear, DEFAULT_RETURN_PLANNER_STATE.houseTargetYear))),
  };
}
