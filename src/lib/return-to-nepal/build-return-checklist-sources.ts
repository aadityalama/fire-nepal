import { resolveExpenseBasedFireCorpus } from "@/lib/return-to-nepal/resolve-expense-based-fire-corpus";
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
  insuranceLoading?: boolean;
  insuranceUnavailable?: boolean;
  liabilitiesLoading?: boolean;
  liabilitiesUnavailable?: boolean;
}): ReturnChecklistSources {
  const {
    effectiveState,
    live,
    insurancePolicies,
    insuranceInputs,
    liabilitiesNpr,
    insuranceLoading,
    insuranceUnavailable,
    liabilitiesLoading,
    liabilitiesUnavailable,
  } = args;

  const canonical = live.canonicalEmergencyFund;
  const budgetBasisNpr =
    canonical?.monthlyProtectionBasisNpr != null && canonical.monthlyProtectionBasisNpr > 0
      ? canonical.monthlyProtectionBasisNpr
      : null;

  // Expense-based 25× FIRE corpus — never Savings Goals or profile FIRE goals.
  const fireCorpus = resolveExpenseBasedFireCorpus({
    monthlyExpenseTrackingNpr: live.monthlyLivingExpenseNpr > 0 ? live.monthlyLivingExpenseNpr : null,
    monthlyBudgetTrackingNpr: budgetBasisNpr,
  });

  const incomeNpr = live.monthlyIncomeNpr;
  const ssfContributionTargetNpr = Math.max(incomeNpr * 0.1, 5_000);

  const familyCostSignalsConfigured =
    Boolean(live.savingsGoals.some((g) => /education|child|school/i.test(g.name) || /education/i.test(g.category))) ||
    effectiveState.settlementChecklist.includes("schoolAdmissions") ||
    effectiveState.settlementChecklist.includes("healthNepal") ||
    effectiveState.settlementChecklist.includes("healthInsurance") ||
    (live.householdConfigured &&
      (effectiveState.schoolFeesMonthlyNpr > 0 || effectiveState.healthcareMonthlyNpr > 0));

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
      budgetBasisNpr != null
        ? budgetBasisNpr
        : live.monthlyExpenseNpr > 0
          ? live.monthlyExpenseNpr
          : Math.max(1, live.nepalColMonthlyNpr),
    emergencyMonthsTarget,
    canonicalEmergencyFund: canonical,
    monthlySsfContributionNpr: live.monthlySsfContributionNpr,
    ssfContributionTargetNpr,
    ssfWorkspace: live.ssf,
    ssfNotApplicable: effectiveState.ssfPlanStatus === "not_applicable",
    totalInvestmentNpr: live.totalInvestmentNpr,
    investmentCostNpr: live.investmentCostNpr,
    investmentGoalTargetNpr: fireCorpus.requiredFireCorpusNpr,
    investmentTargetSource: fireCorpus.investmentTargetSource,
    investmentMonthlyExpenseBasisNpr: fireCorpus.monthlyEligibleLivingExpensesNpr,
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
    businessNotApplicable: effectiveState.businessPlanStatus === "not_applicable",
    liabilitiesNpr: Math.max(0, liabilitiesNpr),
    liabilitiesConfigured: effectiveState.debtReviewed || live.liabilityRowCount > 0,
    liabilitiesLoading: Boolean(liabilitiesLoading),
    liabilitiesUnavailable: Boolean(liabilitiesUnavailable),
  };
}
