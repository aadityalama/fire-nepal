/**
 * Finance Emergency Fund plan — single source of truth for amounts & targets.
 *
 * Balance SoT: `CashflowDashboardState.emergencyCashReserve`
 * Essential expenses SoT: cashflow `monthlyBurn` (override → categories)
 * Default target: 6 × monthly essential expenses (no risk buffer)
 *
 * Used by Emergency Fund workspace and FIRE Progress so both stay aligned.
 */

import {
  investableCashflow,
  monthlyBurn,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";
import type { CashflowDashboardState } from "@/components/cashflow/types";

/** Classic FIRE Nepal emergency buffer — months of essential spend. */
export const DEFAULT_EMERGENCY_FUND_MONTHS = 6;

export type EmergencyFundPlan = {
  /** Whether income/expense cashflow is enough to size a target. */
  hasSufficientData: boolean;
  /** Monthly essential expenses (cashflow burn). */
  monthlyEssentialExpenses: number;
  /** Months used for the recommended target (default 6). */
  recommendedMonths: number;
  /** Target = expenses × recommendedMonths. */
  recommendedTarget: number;
  /** Current liquid emergency reserve (cashflow SoT). */
  currentAmount: number;
  /** max(0, target − current). */
  remainingAmount: number;
  /** Funded % of target (0–100), null when target cannot be sized. */
  progressPct: number | null;
  /** Coverage in months (current ÷ expenses), null when expenses missing. */
  coverageMonths: number | null;
  /** Monthly income from cashflow. */
  monthlyIncome: number;
  /** Income − burn (may be negative). */
  monthlySurplus: number;
  /**
   * Suggested monthly top-up from positive surplus.
   * 0 when there is no surplus or the fund is already complete.
   */
  recommendedMonthlyContribution: number;
  /** Months to close the gap at the recommended contribution (null if unknown). */
  estimatedMonthsRemaining: number | null;
};

function finiteNonNeg(n: number | undefined | null): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export type ComputeEmergencyFundPlanOptions = {
  /** Override default 6-month target. */
  recommendedMonths?: number;
  /** Optional expense total already resolved (avoids re-reading modules). */
  autoExpenseTotal?: number;
};

/**
 * Derive the Finance Emergency Fund plan from cashflow state.
 * Pure — no I/O. Safe for tests and shared UI/summary consumers.
 */
export function computeEmergencyFundPlan(
  cashflow: CashflowDashboardState,
  options: ComputeEmergencyFundPlanOptions = {},
): EmergencyFundPlan {
  const recommendedMonths = Math.max(
    1,
    Math.round(options.recommendedMonths ?? DEFAULT_EMERGENCY_FUND_MONTHS),
  );
  const monthlyEssentialExpenses = monthlyBurn(cashflow, options.autoExpenseTotal);
  const monthlyIncome = sumIncome(cashflow);
  const monthlySurplus = investableCashflow(cashflow, options.autoExpenseTotal);
  const currentAmount = finiteNonNeg(cashflow.emergencyCashReserve);

  const hasSufficientData = monthlyEssentialExpenses > 0;
  const recommendedTarget = hasSufficientData
    ? Math.round(monthlyEssentialExpenses * recommendedMonths)
    : 0;
  const remainingAmount = Math.max(0, recommendedTarget - currentAmount);
  const progressPct =
    hasSufficientData && recommendedTarget > 0
      ? clampPct((currentAmount / recommendedTarget) * 100)
      : null;
  const coverageMonths =
    monthlyEssentialExpenses > 0 ? currentAmount / monthlyEssentialExpenses : null;

  const recommendedMonthlyContribution =
    remainingAmount <= 0 ? 0 : Math.max(0, Math.round(monthlySurplus));

  let estimatedMonthsRemaining: number | null = null;
  if (!hasSufficientData) {
    estimatedMonthsRemaining = null;
  } else if (remainingAmount <= 0) {
    estimatedMonthsRemaining = 0;
  } else if (recommendedMonthlyContribution > 0) {
    estimatedMonthsRemaining = Math.ceil(remainingAmount / recommendedMonthlyContribution);
  } else {
    estimatedMonthsRemaining = null;
  }

  return {
    hasSufficientData,
    monthlyEssentialExpenses,
    recommendedMonths,
    recommendedTarget,
    currentAmount,
    remainingAmount,
    progressPct,
    coverageMonths,
    monthlyIncome,
    monthlySurplus,
    recommendedMonthlyContribution,
    estimatedMonthsRemaining,
  };
}
