import {
  computeInsuranceRecommendation,
  hasAdequateHealthInsurance,
  hasAdequateLifeInsurance,
} from "@/lib/insurance/insurance-engine";
import type { InsuranceEngineInputs, InsurancePolicy } from "@/lib/insurance/insurance-types";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import {
  RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR,
  RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS,
  RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR,
  type ReturnChecklistSources,
} from "@/lib/return-to-nepal/return-checklist";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

export type ReturnReadinessScoreId =
  | "savingsEmergency"
  | "investment"
  | "passiveIncome"
  | "nepalSsf"
  | "insurance"
  | "houseReadiness"
  | "familyEducation"
  | "businessCapital"
  | "debtFree";

export type ReturnReadinessScore = {
  id: ReturnReadinessScoreId;
  label: string;
  pct: number;
  status: "strong" | "on_track" | "in_progress" | "missing";
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromPct(pct: number): ReturnReadinessScore["status"] {
  if (pct >= 85) return "strong";
  if (pct >= 65) return "on_track";
  if (pct >= 35) return "in_progress";
  return "missing";
}

/** Prefer checklist sources when provided; otherwise fall back to legacy snapshot fields. */
export function computeReturnReadinessScores(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
  liabilitiesNpr: number,
  checklistSources?: ReturnChecklistSources,
  insurancePolicies?: InsurancePolicy[],
): ReturnReadinessScore[] {
  const policies = insurancePolicies ?? checklistSources?.insurancePolicies ?? [];
  const recommendation = computeInsuranceRecommendation(policies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(policies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(policies, recommendation.recommendedLifeCoverageNpr);

  const emergencyTarget =
    checklistSources?.emergencyMonthsTarget && checklistSources.emergencyMonthsTarget > 0
      ? checklistSources.emergencyMonthsTarget
      : state.emergencyMonthsTarget > 0
        ? state.emergencyMonthsTarget
        : RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS;

  let savingsEmergencyPct = 0;
  if (checklistSources) {
    const configured =
      checklistSources.emergencyCashReserveNpr != null &&
      Number.isFinite(checklistSources.emergencyCashReserveNpr);
    if (configured) {
      const burn = Math.max(1, checklistSources.emergencyMonthlyBurnNpr);
      const runway = Math.max(0, checklistSources.emergencyCashReserveNpr!) / burn;
      savingsEmergencyPct = clampPct((runway / emergencyTarget) * 100);
    }
  } else {
    savingsEmergencyPct = clampPct((snapshot.emergencyReserveMonths / emergencyTarget) * 100);
  }

  const investmentTarget =
    checklistSources?.investmentGoalTargetNpr && checklistSources.investmentGoalTargetNpr > 0
      ? checklistSources.investmentGoalTargetNpr
      : RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR;
  const investmentAmount = checklistSources?.totalInvestmentNpr ?? investableNpr;
  const investmentPct = clampPct((investmentAmount / investmentTarget) * 100);

  const passiveMonthly = checklistSources?.modeledPassiveMonthlyNpr ?? snapshot.passiveMonthlyNpr;
  const passiveTarget = Math.max(
    checklistSources?.passiveTargetMonthlyNpr ?? snapshot.monthlyNepalLivingNpr * 0.8,
    30_000,
  );
  const passivePct = clampPct((passiveMonthly / passiveTarget) * 100);

  const ssfContribution = checklistSources?.monthlySsfContributionNpr ?? 0;
  const ssfTarget = checklistSources?.ssfContributionTargetNpr ?? Math.max(state.monthlySalaryKrw * state.nprPerKrw * 0.1, 5_000);
  const ssfPct = clampPct((ssfContribution / Math.max(1, ssfTarget)) * 100);

  const insurancePct = clampPct((healthOk ? 50 : 0) + (lifeOk ? 50 : 0));

  const housePct = checklistSources
    ? checklistSources.housePlanStatus === "already_own" || checklistSources.housePlanStatus === "not_needed"
      ? 100
      : checklistSources.housePlanStatus === "plan_to_buy_build"
        ? checklistSources.houseGoalConfigured
          ? clampPct(checklistSources.houseProgressPct)
          : 0
        : 0
    : (() => {
        const houseTarget = Math.max(snapshot.houseTotalBudgetNpr, 1);
        const houseFunded = snapshot.totalReturnFundNpr + state.houseProgressPct * houseTarget * 0.01;
        return clampPct((houseFunded / houseTarget) * 100);
      })();

  const familyChecks = checklistSources
    ? [
        checklistSources.householdConfigured,
        checklistSources.familyCostSignalsConfigured &&
          (checklistSources.schoolFeesMonthlyNpr > 0 || checklistSources.children === 0),
        checklistSources.familyCostSignalsConfigured && checklistSources.healthcareMonthlyNpr > 0,
        checklistSources.settlementChecklistLength >= 2,
      ]
    : [
        state.schoolFeesMonthlyNpr > 0 || state.children === 0,
        state.healthcareMonthlyNpr > 0,
        state.settlementChecklist.length >= 3,
        snapshot.familyRelocationScore >= 50,
      ];
  const familyPct = clampPct((familyChecks.filter(Boolean).length / familyChecks.length) * 100);

  const businessTarget =
    checklistSources?.businessCapitalTargetNpr && checklistSources.businessCapitalTargetNpr > 0
      ? checklistSources.businessCapitalTargetNpr
      : RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR;
  const businessAmount = checklistSources?.businessCapitalNpr ?? state.businessCapitalNpr;
  const businessPct = checklistSources
    ? checklistSources.businessGoalConfigured
      ? clampPct((businessAmount / businessTarget) * 100)
      : 0
    : clampPct((businessAmount / businessTarget) * 100);

  let debtFreePct = 0;
  if (checklistSources) {
    if (!checklistSources.liabilitiesConfigured) debtFreePct = 0;
    else if (liabilitiesNpr <= 0) debtFreePct = 100;
    else {
      const denom = Math.max(investmentAmount + liabilitiesNpr, 1);
      debtFreePct = clampPct((1 - liabilitiesNpr / denom) * 100);
    }
  } else {
    const debtRatio =
      snapshot.totalReturnFundNpr > 0
        ? liabilitiesNpr / (snapshot.totalReturnFundNpr + liabilitiesNpr)
        : liabilitiesNpr > 0
          ? 1
          : 0;
    debtFreePct = clampPct((1 - debtRatio) * 100);
  }

  return [
    { id: "savingsEmergency", label: "Savings & Emergency", pct: savingsEmergencyPct, status: statusFromPct(savingsEmergencyPct) },
    { id: "investment", label: "Investment Portfolio", pct: investmentPct, status: statusFromPct(investmentPct) },
    { id: "passiveIncome", label: "Passive Income", pct: passivePct, status: statusFromPct(passivePct) },
    { id: "nepalSsf", label: "Nepal SSF Retirement", pct: ssfPct, status: statusFromPct(ssfPct) },
    { id: "insurance", label: "Insurance", pct: insurancePct, status: statusFromPct(insurancePct) },
    { id: "houseReadiness", label: "House Readiness", pct: housePct, status: statusFromPct(housePct) },
    { id: "familyEducation", label: "Family & Education", pct: familyPct, status: statusFromPct(familyPct) },
    { id: "businessCapital", label: "Business Capital", pct: businessPct, status: statusFromPct(businessPct) },
    { id: "debtFree", label: "Debt Free", pct: debtFreePct, status: statusFromPct(debtFreePct) },
  ];
}

export function aggregateReadinessPct(scores: ReturnReadinessScore[]): number {
  if (scores.length === 0) return 0;
  const weights: Record<ReturnReadinessScoreId, number> = {
    savingsEmergency: 1.2,
    investment: 1,
    passiveIncome: 1.15,
    nepalSsf: 0.85,
    insurance: 0.9,
    houseReadiness: 1,
    familyEducation: 0.8,
    businessCapital: 0.7,
    debtFree: 0.75,
  };
  let total = 0;
  let weightSum = 0;
  for (const score of scores) {
    const w = weights[score.id];
    total += score.pct * w;
    weightSum += w;
  }
  return clampPct(total / weightSum);
}
