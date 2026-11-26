/**
 * Finance Emergency Fund plan — single source of truth for amounts & targets.
 *
 * Emergency Fund 3.0:
 * - Monthly protection basis SoT: Budget Planner (effective monthly / essential selection)
 * - Balance SoT: designated emergency reserve (cashflow `emergencyCashReserve` + ledger)
 *
 * Income Tracker and Expense Tracker are intentionally NOT used for sizing.
 *
 * Used by Emergency Fund workspace and FIRE Progress so both stay aligned.
 */

import type { CashflowDashboardState } from "@/components/cashflow/types";
import {
  computeEmergencyFundCore,
  computeMonthlyFundingPlan,
  resolveDesignatedReserve,
} from "@/lib/emergency-fund/calculations";
import { DEFAULT_PROTECTION_MONTHS } from "@/lib/emergency-fund/types";

/** Classic FIRE Nepal emergency buffer — months of planned budget protection. */
export const DEFAULT_EMERGENCY_FUND_MONTHS = DEFAULT_PROTECTION_MONTHS;

export type EmergencyFundPlan = {
  /** Whether a valid budget-based monthly protection basis is available. */
  hasSufficientData: boolean;
  /**
   * Monthly protection basis (effective monthly budget or essential selection).
   * Named `monthlyEssentialExpenses` for backward-compatible FIRE Progress consumers;
   * it is no longer derived from cashflow burn / expense tracker.
   */
  monthlyEssentialExpenses: number;
  /** Months used for the recommended target (default 6). */
  recommendedMonths: number;
  /** Target = monthly basis × recommendedMonths. */
  recommendedTarget: number;
  /** Current liquid emergency reserve. */
  currentAmount: number;
  /** max(0, target − current). */
  remainingAmount: number;
  /** Funded % of target (0–100+), null when target cannot be sized. */
  progressPct: number | null;
  /** Coverage in months (current ÷ basis), null when basis missing. */
  coverageMonths: number | null;
  /**
   * @deprecated Income is not used by Emergency Fund 3.0. Always 0.
   * Kept so existing consumers compiling against the shape do not break.
   */
  monthlyIncome: number;
  /**
   * @deprecated Surplus allocation removed. Always 0.
   */
  monthlySurplus: number;
  /**
   * Planned monthly contribution when provided; otherwise 0.
   * No longer inferred from income surplus.
   */
  recommendedMonthlyContribution: number;
  /** Months to close the gap at the planned contribution (null if unknown). */
  estimatedMonthsRemaining: number | null;
};

export type ComputeEmergencyFundPlanOptions = {
  /** Override default 6-month target. */
  recommendedMonths?: number;
  /**
   * Budget-powered monthly protection basis.
   * When null/undefined/≤0, the plan is marked insufficient (no income/expense fallback).
   */
  monthlyProtectionBasisNpr?: number | null;
  /** Optional planned monthly contribution for completion estimates. */
  plannedMonthlyContributionNpr?: number | null;
  /** Linked savings balances already designated for emergency use. */
  linkedSavingsNpr?: number;
  /** Opening reserve override when a ledger exists. */
  openingReserveNpr?: number | null;
  /** Contribution / withdrawal ledger amounts (net applied via resolveDesignatedReserve). */
  transactions?: Parameters<typeof resolveDesignatedReserve>[0]["transactions"];
};

/**
 * Derive the Finance Emergency Fund plan.
 * Pure — no I/O. Safe for tests and shared UI/summary consumers.
 *
 * Requires an explicit budget-based `monthlyProtectionBasisNpr`.
 * Cashflow is only used for the emergency reserve balance — never for expense sizing.
 */
export function computeEmergencyFundPlan(
  cashflow: CashflowDashboardState,
  options: ComputeEmergencyFundPlanOptions = {},
): EmergencyFundPlan {
  const recommendedMonths = Math.max(
    1,
    Math.round(options.recommendedMonths ?? DEFAULT_EMERGENCY_FUND_MONTHS),
  );

  const basis = options.monthlyProtectionBasisNpr;
  const hasSufficientData =
    typeof basis === "number" && Number.isFinite(basis) && basis > 0;
  const monthlyEssentialExpenses = hasSufficientData ? basis : 0;

  const ledger = resolveDesignatedReserve({
    openingReserveNpr: options.openingReserveNpr ?? null,
    transactions: options.transactions ?? [],
    cashflowEmergencyReserveNpr: cashflow.emergencyCashReserve,
  });

  const core = computeEmergencyFundCore({
    monthlyProtectionBasisNpr: monthlyEssentialExpenses,
    protectionMonths: recommendedMonths,
    designatedReserveNpr: ledger.designatedReserveNpr,
    linkedSavingsNpr: options.linkedSavingsNpr,
  });

  const funding = computeMonthlyFundingPlan({
    remainingShortfallNpr: core.remainingShortfallNpr,
    plannedMonthlyContributionNpr: options.plannedMonthlyContributionNpr,
  });

  return {
    hasSufficientData,
    monthlyEssentialExpenses,
    recommendedMonths,
    recommendedTarget: hasSufficientData ? core.emergencyFundTargetNpr : 0,
    currentAmount: core.currentEmergencyReserveNpr,
    remainingAmount: hasSufficientData ? core.remainingShortfallNpr : 0,
    progressPct: hasSufficientData ? core.fundingProgressPct : null,
    coverageMonths: hasSufficientData ? core.safetyRunwayMonths : null,
    monthlyIncome: 0,
    monthlySurplus: 0,
    recommendedMonthlyContribution: funding?.plannedMonthlyContributionNpr ?? 0,
    estimatedMonthsRemaining: hasSufficientData
      ? (funding?.estimatedMonthsRemaining ?? null)
      : null,
  };
}
