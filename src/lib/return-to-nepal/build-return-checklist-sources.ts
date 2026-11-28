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
  /** Optional FIRE / profile investment goal (NPR). Used only when no Investment savings goal. */
  fireGoalNpr?: number | null;
  insuranceLoading?: boolean;
  insuranceUnavailable?: boolean;
  liabilitiesLoading?: boolean;
  liabilitiesUnavailable?: boolean;
  ssfNotApplicable?: boolean;
  businessNotApplicable?: boolean;
}): ReturnChecklistSources {
  const {
    effectiveState,
    live,
    insurancePolicies,
    insuranceInputs,
    liabilitiesNpr,
    fireGoalNpr,
    insuranceLoading,
    insuranceUnavailable,
    liabilitiesLoading,
    liabilitiesUnavailable,
    ssfNotApplicable,
    businessNotApplicable,
  } = args;

  const investmentGoal = findInvestmentSavingsGoal(live.savingsGoals);
  // Prefer dedicated Investment savings goal. FIRE goal is an explicit alternate target —
  // never invent a silent numeric fallback for status classification.
  let investmentGoalTargetNpr: number | null = null;
  let investmentTargetSource: "savings_goal" | "fire_goal" | null = null;
  if (investmentGoal && investmentGoal.targetAmountNpr > 0) {
    investmentGoalTargetNpr = investmentGoal.targetAmountNpr;
    investmentTargetSource = "savings_goal";
  } else if (fireGoalNpr != null && fireGoalNpr > 0) {
    investmentGoalTargetNpr = fireGoalNpr;
    investmentTargetSource = "fire_goal";
  }

  const incomeNpr = live.monthlyIncomeNpr;
  const ssfContributionTargetNpr = Math.max(incomeNpr * 0.1, 5_000);

  const familyCostSignalsConfigured =
    Boolean(live.savingsGoals.some((g) => /education|child|school/i.test(g.name) || /education/i.test(g.category))) ||
    effectiveState.settlementChecklist.includes("schoolAdmissions") ||
    effectiveState.settlementChecklist.includes("healthNepal") ||
    effectiveState.settlementChecklist.includes("healthInsurance") ||
    (live.householdConfigured &&
      (effectiveState.schoolFeesMonthlyNpr > 0 || effectiveState.healthcareMonthlyNpr > 0));

  const canonical = live.canonicalEmergencyFund;
  const emergencyMonthsTarget =
    canonical?.requiredProtectionMonths && canonical.requiredProtectionMonths > 0
      ? canonical.requiredProtectionMonths
      : effectiveState.emergencyMonthsTarget > 0
        ? effectiveState.emergencyMonthsTarget
        : 12;

  const colPassiveTarget =
    live.nepalColMonthlyNpr > 0
      ? Math.max(
          live.nepalColMonthlyNpr,
          effectiveState.schoolFeesMonthlyNpr + effectiveState.healthcareMonthlyNpr,
        )
      : effectiveState.schoolFeesMonthlyNpr + effectiveState.healthcareMonthlyNpr > 0
        ? effectiveState.schoolFeesMonthlyNpr + effectiveState.healthcareMonthlyNpr
        : null;

  return {
    state: effectiveState,
    emergencyCashReserveNpr:
      canonical?.loadState === "ready" && canonical.hasReserveData
        ? canonical.currentEmergencyReserveNpr
        : live.emergencyCashReserveNpr,
    // Prefer Budget Planner monthly protection basis; never silently use Nepal COL as EF burn.
    emergencyMonthlyBurnNpr:
      canonical?.monthlyProtectionBasisNpr != null && canonical.monthlyProtectionBasisNpr > 0
        ? canonical.monthlyProtectionBasisNpr
        : live.monthlyExpenseNpr > 0
          ? live.monthlyExpenseNpr
          : Math.max(1, live.nepalColMonthlyNpr),
    emergencyMonthsTarget,
    canonicalEmergencyFund: canonical,
    monthlySsfContributionNpr: live.monthlySsfContributionNpr,
    ssfContributionTargetNpr,
    ssfWorkspace: live.ssf,
    ssfNotApplicable: Boolean(ssfNotApplicable),
    totalInvestmentNpr: live.totalInvestmentNpr,
    investmentCostNpr: live.investmentCostNpr,
    investmentGoalTargetNpr,
    investmentTargetSource,
    modeledPassiveMonthlyNpr: live.passiveMonthlyNpr,
    actualPassiveMonthlyNpr: live.actualPassiveMonthlyNpr,
    passiveTargetMonthlyNpr: colPassiveTarget,
    insurancePolicies,
    insuranceInputs,
    insuranceLoading: Boolean(insuranceLoading),
    insuranceUnavailable: Boolean(insuranceUnavailable),
    houseProgressPct: live.houseProgressPct,
    houseGoalConfigured: live.houseGoalConfigured,
    housePlanStatus: effectiveState.housePlanStatus ?? "unknown",
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
    businessNotApplicable: Boolean(businessNotApplicable),
    liabilitiesNpr: Math.max(0, liabilitiesNpr),
    liabilitiesConfigured: effectiveState.debtReviewed || live.liabilityRowCount > 0,
    liabilitiesLoading: Boolean(liabilitiesLoading),
    liabilitiesUnavailable: Boolean(liabilitiesUnavailable),
  };
}
