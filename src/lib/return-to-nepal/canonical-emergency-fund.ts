/**
 * Canonical Emergency Fund snapshot for Nepal Return Planner.
 *
 * Single source of truth = Emergency Fund 3.0 calculation engine
 * (`computeEmergencyFundCore` + budget protection basis + ledger reserve).
 *
 * Return Planner target months stay independent of the EF workspace protection
 * period (default / fallback: 12 months) so a shorter workspace period cannot
 * silently shrink the Return Checklist requirement.
 */

import type { CashflowDashboardState } from "@/components/cashflow/types";
import type { BudgetRecord } from "@/lib/budget/types";
import {
  normalizeBudgetForEmergencyFund,
  resolveMonthlyProtectionBasis,
} from "@/lib/emergency-fund/budget-integration";
import {
  computeEmergencyFundCore,
  resolveDesignatedReserve,
  type EmergencyFundCoreResult,
} from "@/lib/emergency-fund/calculations";
import type {
  EmergencyFundSettingsState,
  ProtectionMode,
} from "@/lib/emergency-fund/types";
import type { SavingsGoal } from "@/lib/savings/savings-types";

/** Return Planner default Emergency Fund requirement (independent of EF workspace period). */
export const RETURN_PLANNER_DEFAULT_EMERGENCY_MONTHS = 12;

export type CanonicalEmergencyFundLoadState = "ready" | "unavailable" | "loading";

export type CanonicalEmergencyFundStatus =
  | "completed"
  | "in_progress"
  | "missing"
  | "data_unavailable";

export type CanonicalEmergencyFundSnapshot = {
  loadState: CanonicalEmergencyFundLoadState;
  /** Designated ledger reserve + linked savings (same as EF workspace). */
  currentEmergencyReserveNpr: number | null;
  /** Budget Planner monthly protection basis (same as EF workspace). */
  monthlyProtectionBasisNpr: number | null;
  protectionMode: ProtectionMode | null;
  /** EF workspace protection period (informational; not used for Return target). */
  workspaceProtectionMonths: number | null;
  /** Return Planner required months (12 fallback unless user policy set). */
  requiredProtectionMonths: number;
  /** requiredProtectionMonths × monthlyProtectionBasisNpr */
  emergencyFundTargetNpr: number | null;
  /** reserve ÷ monthlyProtectionBasis (null when basis missing). */
  safetyRunwayMonths: number | null;
  fundingProgressPct: number | null;
  fundingGapNpr: number | null;
  excessReserveNpr: number | null;
  isFullyFunded: boolean;
  completionStatus: CanonicalEmergencyFundStatus;
  lastUpdatedAt: string | null;
  /** True when Budget Planner data is available to size the basis. */
  hasBudgetProtectionBasis: boolean;
  /** True when a designated/linked reserve value was resolved (including explicit 0). */
  hasReserveData: boolean;
};

export type ComputeCanonicalEmergencyFundInput = {
  settings: EmergencyFundSettingsState;
  budgets: BudgetRecord[];
  cashflow: CashflowDashboardState;
  savingsGoals: SavingsGoal[];
  /**
   * Return Planner required months. When ≤0, falls back to 12.
   * Never reads EF workspace `protectionMonths` for the Return target.
   */
  requiredProtectionMonths: number;
  /** Set when EF settings / budgets failed to load. */
  loadState?: CanonicalEmergencyFundLoadState;
};

function resolveRequiredMonths(raw: number): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.max(1, Math.round(raw));
  }
  return RETURN_PLANNER_DEFAULT_EMERGENCY_MONTHS;
}

function linkedSavingsTotal(
  settings: EmergencyFundSettingsState,
  savingsGoals: SavingsGoal[],
): number {
  const ids = new Set(settings.linkedSavingsGoalIds);
  return savingsGoals
    .filter((g) => ids.has(g.id) && g.status !== "paused")
    .reduce((sum, g) => sum + Math.max(0, g.savedAmountNpr), 0);
}

/**
 * Map canonical funding state → Return Checklist / badge status.
 * Uses unrounded comparisons for completion.
 *
 * Never classifies a missing/invalid protection basis or target as IN PROGRESS.
 */
export function deriveCanonicalEmergencyFundStatus(input: {
  loadState: CanonicalEmergencyFundLoadState;
  currentEmergencyReserveNpr: number | null;
  emergencyFundTargetNpr: number | null;
  hasReserveData: boolean;
  /** When false/omitted with a null target, required inputs are incomplete. */
  hasBudgetProtectionBasis?: boolean;
}): CanonicalEmergencyFundStatus {
  if (input.loadState === "unavailable") return "data_unavailable";
  if (input.loadState === "loading") return "data_unavailable";

  const target = input.emergencyFundTargetNpr;
  const hasValidTarget = target != null && Number.isFinite(target) && target > 0;
  const hasBasis =
    input.hasBudgetProtectionBasis === true ||
    (input.hasBudgetProtectionBasis !== false && hasValidTarget);
  if (!hasBasis || !hasValidTarget) {
    return "data_unavailable";
  }

  if (!input.hasReserveData || input.currentEmergencyReserveNpr == null) {
    return "missing";
  }
  const reserve = input.currentEmergencyReserveNpr;
  if (!(reserve > 0)) return "missing";
  if (reserve >= target) return "completed";
  return "in_progress";
}

export function emptyCanonicalEmergencyFundSnapshot(
  requiredProtectionMonths = RETURN_PLANNER_DEFAULT_EMERGENCY_MONTHS,
  loadState: CanonicalEmergencyFundLoadState = "loading",
): CanonicalEmergencyFundSnapshot {
  return {
    loadState,
    currentEmergencyReserveNpr: null,
    monthlyProtectionBasisNpr: null,
    protectionMode: null,
    workspaceProtectionMonths: null,
    requiredProtectionMonths: resolveRequiredMonths(requiredProtectionMonths),
    emergencyFundTargetNpr: null,
    safetyRunwayMonths: null,
    fundingProgressPct: null,
    fundingGapNpr: null,
    excessReserveNpr: null,
    isFullyFunded: false,
    completionStatus: "data_unavailable",
    lastUpdatedAt: null,
    hasBudgetProtectionBasis: false,
    hasReserveData: false,
  };
}

/**
 * Pure canonical Emergency Fund compute for Return Planner consumers.
 * Reuses Emergency Fund 3.0 core math — no duplicate formulas.
 */
export function computeCanonicalEmergencyFundForReturn(
  input: ComputeCanonicalEmergencyFundInput,
): CanonicalEmergencyFundSnapshot {
  const loadState = input.loadState ?? "ready";
  const requiredProtectionMonths = resolveRequiredMonths(input.requiredProtectionMonths);

  if (loadState === "unavailable") {
    return {
      ...emptyCanonicalEmergencyFundSnapshot(requiredProtectionMonths, "unavailable"),
      completionStatus: "data_unavailable",
    };
  }

  if (loadState === "loading") {
    return emptyCanonicalEmergencyFundSnapshot(requiredProtectionMonths, "loading");
  }

  const { settings, budgets, cashflow, savingsGoals } = input;

  const breakdown = normalizeBudgetForEmergencyFund(budgets, {
    yearlyAllocationDecisions: settings.yearlyAllocationDecisions,
  });

  const protectionResolved = breakdown.hasBudgetData
    ? resolveMonthlyProtectionBasis(
        breakdown,
        settings.protectionMode,
        settings.essentialRecordIds,
        { excludedRecordIds: settings.excludedRecordIds },
      )
    : null;

  const monthlyProtectionBasisNpr =
    protectionResolved && protectionResolved.finalMonthlyProtectionBasisNpr > 0
      ? protectionResolved.finalMonthlyProtectionBasisNpr
      : null;

  const ledger = resolveDesignatedReserve({
    openingReserveNpr: settings.openingReserveNpr,
    transactions: settings.transactions,
    cashflowEmergencyReserveNpr: cashflow.emergencyCashReserve,
  });

  const linkedSavingsNpr = linkedSavingsTotal(settings, savingsGoals);
  const hasLedgerOrCashflow =
    settings.openingReserveNpr != null ||
    settings.transactions.length > 0 ||
    (cashflow.emergencyCashReserve != null && Number.isFinite(cashflow.emergencyCashReserve)) ||
    linkedSavingsNpr > 0;

  const designatedReserveNpr = ledger.designatedReserveNpr;
  const currentEmergencyReserveNpr = designatedReserveNpr + linkedSavingsNpr;

  let core: EmergencyFundCoreResult | null = null;
  if (monthlyProtectionBasisNpr != null) {
    core = computeEmergencyFundCore({
      monthlyProtectionBasisNpr,
      // Return Planner requirement — not EF workspace protectionMonths.
      protectionMonths: requiredProtectionMonths,
      designatedReserveNpr,
      linkedSavingsNpr,
    });
  }

  const hasReserveData = hasLedgerOrCashflow || currentEmergencyReserveNpr > 0;
  const reserveForStatus = hasReserveData ? currentEmergencyReserveNpr : null;
  const hasBudgetProtectionBasis = monthlyProtectionBasisNpr != null;

  const completionStatus = deriveCanonicalEmergencyFundStatus({
    loadState: "ready",
    currentEmergencyReserveNpr: reserveForStatus,
    emergencyFundTargetNpr: core?.emergencyFundTargetNpr ?? null,
    hasReserveData,
    hasBudgetProtectionBasis,
  });

  return {
    loadState: "ready",
    currentEmergencyReserveNpr: hasReserveData ? currentEmergencyReserveNpr : null,
    monthlyProtectionBasisNpr,
    protectionMode: settings.protectionMode,
    workspaceProtectionMonths: settings.protectionMonths,
    requiredProtectionMonths,
    emergencyFundTargetNpr: core?.emergencyFundTargetNpr ?? null,
    safetyRunwayMonths: core?.safetyRunwayMonths ?? null,
    fundingProgressPct: core?.fundingProgressPct ?? null,
    fundingGapNpr: core?.remainingShortfallNpr ?? null,
    excessReserveNpr: core?.excessReserveNpr ?? null,
    isFullyFunded: core?.isFullyFunded ?? false,
    completionStatus,
    lastUpdatedAt: settings.lastSuccessfulSyncAt,
    hasBudgetProtectionBasis,
    hasReserveData,
  };
}

/** Stable runway months label (avoids Infinity / NaN; keeps two decimals when needed). */
export function formatCanonicalRunwayMonths(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "—";
  const rounded = Math.round(months * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Checklist detail line for canonical runway. */
export function formatEmergencyRunwayDetail(months: number | null | undefined): string {
  const label = formatCanonicalRunwayMonths(months);
  if (label === "—") return "Runway unavailable";
  return `${label} mo runway`;
}
