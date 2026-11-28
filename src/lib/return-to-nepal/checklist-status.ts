/**
 * Unified Return Checklist status semantics.
 *
 * Rules (apply to every checklist item):
 * - LOADING: retrieval genuinely pending
 * - DATA UNAVAILABLE: retrieval/validation failed
 * - NOT APPLICABLE: user explicitly opted out
 * - TARGET NOT SET: positive actuals exist (or domain engaged) but no valid target
 * - MISSING: verified absence of required actuals (and a target/requirement applies)
 * - IN PROGRESS: positive actuals below a valid target
 * - COMPLETED: actuals meet or exceed a valid target (unrounded)
 *
 * Never classify a positive balance as MISSING merely because a target is absent
 * or because progress is below an arbitrary percentage band.
 */

export type ChecklistStatus =
  | "completed"
  | "on_track"
  | "in_progress"
  | "missing"
  | "target_not_set"
  | "not_applicable"
  | "data_unavailable"
  | "loading";

export type FundingStatusInput = {
  actual: number | null | undefined;
  target: number | null | undefined;
  /** Domain intentionally opted out. */
  notApplicable?: boolean;
  /** Authenticated fetch still in flight. */
  loading?: boolean;
  /** Retrieval failed. */
  dataUnavailable?: boolean;
  /**
   * When true, a zero actual with a valid target is MISSING (requirement applies).
   * When false/omitted and actual is zero with no target → TARGET NOT SET / MISSING
   * depending on whether the domain was engaged.
   */
  requirementApplies?: boolean;
};

/**
 * Map verified actual + optional target → checklist status.
 * Uses unrounded comparisons for completion (`actual >= target`).
 */
export function deriveFundingStatus(input: FundingStatusInput): ChecklistStatus {
  if (input.loading) return "loading";
  if (input.dataUnavailable) return "data_unavailable";
  if (input.notApplicable) return "not_applicable";

  const actualRaw = input.actual;
  const actual =
    actualRaw != null && Number.isFinite(actualRaw) ? Math.max(0, actualRaw) : null;
  const targetRaw = input.target;
  const hasValidTarget =
    targetRaw != null && Number.isFinite(targetRaw) && targetRaw > 0;
  const target = hasValidTarget ? (targetRaw as number) : null;

  if (actual == null) {
    return input.requirementApplies ? "missing" : "data_unavailable";
  }

  if (!hasValidTarget || target == null) {
    if (actual > 0) return "target_not_set";
    return input.requirementApplies ? "missing" : "target_not_set";
  }

  if (!(actual > 0)) return "missing";
  if (actual >= target) return "completed";
  return "in_progress";
}

/** @deprecated Prefer deriveFundingStatus — pct bands caused false MISSING on positive balances. */
export function deriveChecklistStatusFromPct(pct: number): ChecklistStatus {
  if (pct >= 100) return "completed";
  if (pct >= 75) return "on_track";
  if (pct > 0) return "in_progress";
  return "missing";
}

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  completed: "Completed",
  on_track: "On Track",
  in_progress: "In Progress",
  missing: "Missing",
  target_not_set: "Target Not Set",
  not_applicable: "Not Applicable",
  data_unavailable: "Data Unavailable",
  loading: "Loading",
};

/** Optional checklist items excluded from readiness averages when N/A. */
export function isOptionalChecklistItem(id: string): boolean {
  return id === "business" || id === "house" || id === "ssf";
}

export function readinessWeightForStatus(status: ChecklistStatus): {
  include: boolean;
  pct: number | null;
} {
  if (status === "not_applicable") return { include: false, pct: null };
  if (status === "loading" || status === "data_unavailable") return { include: true, pct: null };
  if (status === "completed" || status === "on_track") return { include: true, pct: 100 };
  if (status === "target_not_set") return { include: true, pct: null };
  if (status === "in_progress") return { include: true, pct: null }; // caller supplies real pct
  return { include: true, pct: 0 };
}
