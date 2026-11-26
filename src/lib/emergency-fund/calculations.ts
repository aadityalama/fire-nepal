/**
 * Centralized Emergency Fund 3.0 calculation engine.
 * Pure TypeScript — no I/O. All UI surfaces must use these formulas.
 */

import {
  approximateProtectionDays,
  ceilPositive,
  clampPct,
  finiteNonNeg,
  roundMoney,
  safeDivide,
  visualProgressPct,
} from "@/lib/emergency-fund/math";
import type {
  EmergencyFundTransaction,
  SafetyMilestone,
} from "@/lib/emergency-fund/types";
import { SAFETY_MILESTONE_MONTHS } from "@/lib/emergency-fund/types";

export type EmergencyFundCoreInput = {
  monthlyProtectionBasisNpr: number;
  protectionMonths: number;
  /** Designated emergency cash (opening + contributions − withdrawals). */
  designatedReserveNpr: number;
  /** Linked eligible savings balances (already de-duplicated by caller). */
  linkedSavingsNpr?: number;
};

export type EmergencyFundCoreResult = {
  monthlyProtectionBasisNpr: number;
  protectionMonths: number;
  emergencyFundTargetNpr: number;
  currentEmergencyReserveNpr: number;
  fundingProgressPct: number | null;
  visualFundingProgressPct: number | null;
  remainingShortfallNpr: number;
  safetyRunwayMonths: number | null;
  approximateProtectionDays: number | null;
  excessReserveNpr: number;
  isFullyFunded: boolean;
};

/**
 * Formula 3 helper — Current Emergency Reserve from ledger components.
 * Prevents double-counting when the caller already folded linked savings into designated.
 */
export function computeCurrentEmergencyReserve(input: {
  openingReserveNpr: number;
  confirmedContributionsNpr: number;
  confirmedWithdrawalsNpr: number;
  linkedSavingsNpr?: number;
}): number {
  const designated =
    finiteNonNeg(input.openingReserveNpr) +
    finiteNonNeg(input.confirmedContributionsNpr) -
    finiteNonNeg(input.confirmedWithdrawalsNpr);
  return Math.max(0, designated + finiteNonNeg(input.linkedSavingsNpr));
}

export function sumTransactionsByType(
  transactions: readonly EmergencyFundTransaction[],
  type: EmergencyFundTransaction["type"],
): number {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((sum, tx) => sum + finiteNonNeg(tx.amountNpr), 0);
}

/**
 * Resolve designated reserve from settings + cashflow SoT.
 * - No opening + no txs → use cashflowEmergencyReserve as the live balance.
 * - Otherwise opening + contrib − withdraw (cashflow should be kept in sync by UI).
 */
export function resolveDesignatedReserve(input: {
  openingReserveNpr: number | null;
  transactions: readonly EmergencyFundTransaction[];
  cashflowEmergencyReserveNpr: number | null | undefined;
}): {
  openingReserveNpr: number;
  contributionsNpr: number;
  withdrawalsNpr: number;
  designatedReserveNpr: number;
  usingLegacyCashflowBalance: boolean;
} {
  const contributionsNpr = sumTransactionsByType(input.transactions, "contribution");
  const withdrawalsNpr = sumTransactionsByType(input.transactions, "withdrawal");
  const hasLedger =
    input.openingReserveNpr != null || input.transactions.length > 0;

  if (!hasLedger) {
    const designated = finiteNonNeg(input.cashflowEmergencyReserveNpr);
    return {
      openingReserveNpr: designated,
      contributionsNpr: 0,
      withdrawalsNpr: 0,
      designatedReserveNpr: designated,
      usingLegacyCashflowBalance: true,
    };
  }

  const opening = finiteNonNeg(input.openingReserveNpr);
  const designated = Math.max(0, opening + contributionsNpr - withdrawalsNpr);
  return {
    openingReserveNpr: opening,
    contributionsNpr,
    withdrawalsNpr,
    designatedReserveNpr: designated,
    usingLegacyCashflowBalance: false,
  };
}

/**
 * Core formulas 1–8.
 */
export function computeEmergencyFundCore(input: EmergencyFundCoreInput): EmergencyFundCoreResult {
  const monthlyProtectionBasisNpr = finiteNonNeg(input.monthlyProtectionBasisNpr);
  const protectionMonths = Math.max(1, Math.round(finiteNonNeg(input.protectionMonths) || 1));
  const designated = finiteNonNeg(input.designatedReserveNpr);
  const linked = finiteNonNeg(input.linkedSavingsNpr);
  const currentEmergencyReserveNpr = designated + linked;

  const emergencyFundTargetNpr = monthlyProtectionBasisNpr * protectionMonths;
  const hasTarget = monthlyProtectionBasisNpr > 0 && emergencyFundTargetNpr > 0;

  const fundingProgressPct = hasTarget
    ? clampPct((currentEmergencyReserveNpr / emergencyFundTargetNpr) * 100, Number.POSITIVE_INFINITY)
    : null;
  const visualFundingProgressPct =
    fundingProgressPct == null ? null : visualProgressPct(fundingProgressPct);

  const remainingShortfallNpr = hasTarget
    ? Math.max(0, emergencyFundTargetNpr - currentEmergencyReserveNpr)
    : 0;
  const excessReserveNpr = hasTarget
    ? Math.max(0, currentEmergencyReserveNpr - emergencyFundTargetNpr)
    : Math.max(0, currentEmergencyReserveNpr);

  const safetyRunwayMonths = safeDivide(currentEmergencyReserveNpr, monthlyProtectionBasisNpr);
  const days = approximateProtectionDays(safetyRunwayMonths);

  return {
    monthlyProtectionBasisNpr,
    protectionMonths,
    emergencyFundTargetNpr,
    currentEmergencyReserveNpr,
    fundingProgressPct,
    visualFundingProgressPct,
    remainingShortfallNpr,
    safetyRunwayMonths,
    approximateProtectionDays: days,
    excessReserveNpr,
    isFullyFunded: hasTarget && remainingShortfallNpr <= 0,
  };
}

export function computeSafetyMilestones(
  monthlyProtectionBasisNpr: number,
  currentEmergencyReserveNpr: number,
): SafetyMilestone[] {
  const basis = finiteNonNeg(monthlyProtectionBasisNpr);
  const reserve = finiteNonNeg(currentEmergencyReserveNpr);
  const labels: Record<number, string> = {
    1: "Initial Protection",
    3: "Basic Protection",
    6: "Standard Protection",
    9: "Advanced Protection",
    12: "Extended Protection",
  };

  return SAFETY_MILESTONE_MONTHS.map((months) => {
    const requiredReserveNpr = basis * months;
    const progressPct =
      requiredReserveNpr > 0
        ? visualProgressPct((reserve / requiredReserveNpr) * 100)
        : reserve > 0
          ? 100
          : 0;
    const remainingNpr = Math.max(0, requiredReserveNpr - reserve);
    return {
      months,
      label: labels[months] ?? `${months}-Month Protection`,
      requiredReserveNpr,
      progressPct,
      remainingNpr,
      achieved: basis > 0 ? reserve >= requiredReserveNpr - 1e-9 : false,
    };
  });
}

export type MonthlyFundingPlanResult = {
  plannedMonthlyContributionNpr: number;
  remainingShortfallNpr: number;
  estimatedMonthsRemaining: number | null;
  estimatedCompletionDate: Date | null;
};

export function computeMonthlyFundingPlan(input: {
  remainingShortfallNpr: number;
  plannedMonthlyContributionNpr: number | null | undefined;
  now?: Date;
}): MonthlyFundingPlanResult | null {
  const contribution = input.plannedMonthlyContributionNpr;
  if (contribution == null || !Number.isFinite(contribution) || contribution <= 0) {
    return null;
  }
  const shortfall = finiteNonNeg(input.remainingShortfallNpr);
  if (shortfall <= 0) {
    return {
      plannedMonthlyContributionNpr: contribution,
      remainingShortfallNpr: 0,
      estimatedMonthsRemaining: 0,
      estimatedCompletionDate: input.now ?? new Date(),
    };
  }
  const months = ceilPositive(shortfall / contribution);
  const now = input.now ?? new Date();
  const completion = new Date(now.getTime());
  completion.setMonth(completion.getMonth() + months);
  return {
    plannedMonthlyContributionNpr: contribution,
    remainingShortfallNpr: shortfall,
    estimatedMonthsRemaining: months,
    estimatedCompletionDate: completion,
  };
}

export type DeadlineFundingPlanResult = {
  deadlineMonths: number;
  remainingShortfallNpr: number;
  requiredMonthlyContributionNpr: number;
};

export function computeDeadlineFundingPlan(input: {
  remainingShortfallNpr: number;
  deadlineMonths: number;
}): DeadlineFundingPlanResult | null {
  const months = Math.max(1, Math.round(finiteNonNeg(input.deadlineMonths) || 0));
  if (!Number.isFinite(months) || months <= 0) return null;
  const shortfall = finiteNonNeg(input.remainingShortfallNpr);
  if (shortfall <= 0) {
    return {
      deadlineMonths: months,
      remainingShortfallNpr: 0,
      requiredMonthlyContributionNpr: 0,
    };
  }
  return {
    deadlineMonths: months,
    remainingShortfallNpr: shortfall,
    requiredMonthlyContributionNpr: roundMoney(shortfall / months, 2),
  };
}

export type GrowthProjectionPoint = {
  label: string;
  monthIndex: number;
  actualNpr: number | null;
  projectedNpr: number | null;
  targetNpr: number;
  isProjected: boolean;
};

/**
 * Build growth series: solid actual history from transactions, dashed future projection
 * from the planned monthly contribution. Does not fabricate history.
 */
export function buildGrowthProjection(input: {
  openingReserveNpr: number;
  transactions: readonly EmergencyFundTransaction[];
  currentReserveNpr: number;
  targetNpr: number;
  plannedMonthlyContributionNpr: number | null;
  horizonMonths: 3 | 6 | 12 | 24;
  now?: Date;
}): GrowthProjectionPoint[] {
  const now = input.now ?? new Date();
  const targetNpr = finiteNonNeg(input.targetNpr);
  const points: GrowthProjectionPoint[] = [];

  const sorted = [...input.transactions].sort((a, b) => a.date.localeCompare(b.date));
  let running = finiteNonNeg(input.openingReserveNpr);

  points.push({
    label: "Start",
    monthIndex: 0,
    actualNpr: running,
    projectedNpr: null,
    targetNpr,
    isProjected: false,
  });

  for (const [index, tx] of sorted.entries()) {
    running += tx.type === "contribution" ? finiteNonNeg(tx.amountNpr) : -finiteNonNeg(tx.amountNpr);
    running = Math.max(0, running);
    points.push({
      label: tx.date.slice(0, 7) || `T${index + 1}`,
      monthIndex: index + 1,
      actualNpr: running,
      projectedNpr: null,
      targetNpr,
      isProjected: false,
    });
  }

  // Anchor "Now" to the live reserve (includes linked savings when provided as current).
  const current = finiteNonNeg(input.currentReserveNpr);
  points.push({
    label: "Now",
    monthIndex: points.length,
    actualNpr: current,
    projectedNpr: current,
    targetNpr,
    isProjected: false,
  });

  const contribution = input.plannedMonthlyContributionNpr;
  if (contribution != null && contribution > 0 && current < targetNpr) {
    let projected = current;
    for (let m = 1; m <= input.horizonMonths; m += 1) {
      projected = Math.min(targetNpr, projected + contribution);
      const future = new Date(now.getTime());
      future.setMonth(future.getMonth() + m);
      const label = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`;
      points.push({
        label,
        monthIndex: points.length,
        actualNpr: null,
        projectedNpr: projected,
        targetNpr,
        isProjected: true,
      });
      if (projected >= targetNpr) break;
    }
  }

  return points;
}
