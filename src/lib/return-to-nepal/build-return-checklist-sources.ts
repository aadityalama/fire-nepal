import { findInvestmentSavingsGoal } from "@/lib/return-to-nepal/checklist-goal-matchers";
import type { ReturnChecklistSources } from "@/lib/return-to-nepal/return-checklist";
import type { ReturnPlannerLiveBundle } from "@/lib/return-to-nepal/live-inputs";
import type { InsuranceEngineInputs, InsurancePolicy } from "@/lib/insurance/insurance-types";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

/**
 * Assemble canonical Return Checklist sources from live planner bundle + insurance.
 * Single adapter used by the dashboard (no duplicated localStorage formulas).
 */
export function buildReturnChecklistSources(args: {
  effectiveState: ReturnToNepalPlannerState;
  live: ReturnPlannerLiveBundle;
  insurancePolicies: InsurancePolicy[];
  insuranceInputs: InsuranceEngineInputs;
  liabilitiesNpr: number;
  /** Optional FIRE / profile investment goal (NPR). */
  fireGoalNpr?: number | null;
}): ReturnChecklistSources {
  const { effectiveState, live, insurancePolicies, insuranceInputs, liabilitiesNpr, fireGoalNpr } = args;
  const investmentGoal = findInvestmentSavingsGoal(live.savingsGoals);
  const investmentGoalTargetNpr =
    investmentGoal && investmentGoal.targetAmountNpr > 0
      ? investmentGoal.targetAmountNpr
      : fireGoalNpr != null && fireGoalNpr > 0
        ? fireGoalNpr
        : null;

  const incomeNpr = live.monthlyIncomeNpr;
  const ssfContributionTargetNpr = Math.max(incomeNpr * 0.1, 5_000);

  const familyCostSignalsConfigured =
    Boolean(live.savingsGoals.some((g) => /education|child|school/i.test(g.name) || /education/i.test(g.category))) ||
    effectiveState.settlementChecklist.includes("schoolAdmissions") ||
    effectiveState.settlementChecklist.includes("healthNepal") ||
    effectiveState.settlementChecklist.includes("healthInsurance") ||
    (live.householdConfigured &&
      (effectiveState.schoolFeesMonthlyNpr > 0 || effectiveState.healthcareMonthlyNpr > 0));

  return {
    state: effectiveState,
    emergencyCashReserveNpr: live.emergencyCashReserveNpr,
    emergencyMonthlyBurnNpr: live.monthlyExpenseNpr > 0 ? live.monthlyExpenseNpr : Math.max(1, live.nepalColMonthlyNpr),
    emergencyMonthsTarget: effectiveState.emergencyMonthsTarget,
    monthlySsfContributionNpr: live.monthlySsfContributionNpr,
    ssfContributionTargetNpr,
    totalInvestmentNpr: live.totalInvestmentNpr,
    investmentGoalTargetNpr,
    modeledPassiveMonthlyNpr: live.passiveMonthlyNpr,
    actualPassiveMonthlyNpr: live.actualPassiveMonthlyNpr,
    passiveTargetMonthlyNpr: Math.max(
      live.nepalColMonthlyNpr,
      effectiveState.schoolFeesMonthlyNpr + effectiveState.healthcareMonthlyNpr,
    ),
    insurancePolicies,
    insuranceInputs,
    houseProgressPct: live.houseProgressPct,
    houseGoalConfigured: live.houseGoalConfigured,
    adults: effectiveState.adults,
    children: effectiveState.children,
    householdConfigured: live.householdConfigured,
    schoolFeesMonthlyNpr: effectiveState.schoolFeesMonthlyNpr,
    healthcareMonthlyNpr: effectiveState.healthcareMonthlyNpr,
    familyCostSignalsConfigured,
    settlementChecklistLength: effectiveState.settlementChecklist.length,
    businessCapitalNpr: live.businessCapitalNpr,
    businessGoalConfigured: live.businessGoalConfigured,
    businessCapitalTargetNpr: live.businessCapitalTargetNpr,
    liabilitiesNpr: Math.max(0, liabilitiesNpr),
    liabilitiesConfigured: effectiveState.debtReviewed || live.liabilityRowCount > 0,
  };
}
