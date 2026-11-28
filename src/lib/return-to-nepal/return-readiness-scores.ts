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
  /**
   * When true, this pillar is omitted from the aggregate readiness average
   * (NOT APPLICABLE / TARGET NOT SET / DATA UNAVAILABLE / LOADING).
   * Prevents optional gaps from unfairly lowering the score and prevents
   * unknown data from inventing optimistic progress.
   */
  excludeFromAggregate?: boolean;
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromPct(pct: number): ReturnReadinessScore["status"] {
  if (pct >= 85) return "strong";
  if (pct >= 65) return "on_track";
  if (pct > 0) return "in_progress";
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
  let savingsExclude = false;
  if (checklistSources?.canonicalEmergencyFund) {
    const canonical = checklistSources.canonicalEmergencyFund;
    if (canonical.loadState === "loading" || canonical.loadState === "unavailable") {
      savingsExclude = true;
    } else if (canonical.loadState === "ready") {
      if (canonical.completionStatus === "data_unavailable") {
        savingsExclude = true;
      } else if (canonical.fundingProgressPct != null && Number.isFinite(canonical.fundingProgressPct)) {
        savingsEmergencyPct = clampPct(canonical.fundingProgressPct);
      } else if (
        canonical.safetyRunwayMonths != null &&
        Number.isFinite(canonical.safetyRunwayMonths) &&
        emergencyTarget > 0
      ) {
        savingsEmergencyPct = clampPct((canonical.safetyRunwayMonths / emergencyTarget) * 100);
      }
    }
  } else if (checklistSources) {
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

  const investmentAmount = checklistSources?.totalInvestmentNpr ?? investableNpr;
  const investmentTarget =
    checklistSources?.investmentGoalTargetNpr != null && checklistSources.investmentGoalTargetNpr > 0
      ? checklistSources.investmentGoalTargetNpr
      : null;
  let investmentPct = 0;
  let investmentExclude = false;
  if (investmentTarget == null) {
    // Positive portfolio without a target must not invent a silent 2M goal.
    investmentExclude = true;
    investmentPct = investmentAmount > 0 ? 0 : 0;
  } else {
    investmentPct = clampPct((investmentAmount / investmentTarget) * 100);
  }

  const passiveMonthly = checklistSources?.modeledPassiveMonthlyNpr ?? snapshot.passiveMonthlyNpr;
  const passiveTargetRaw = checklistSources?.passiveTargetMonthlyNpr;
  const passiveTarget =
    passiveTargetRaw != null && passiveTargetRaw > 0
      ? Math.max(passiveTargetRaw, 25_000)
      : Math.max(snapshot.monthlyNepalLivingNpr * 0.8, 30_000);
  const passivePct = clampPct((passiveMonthly / Math.max(1, passiveTarget)) * 100);

  let ssfPct = 0;
  let ssfExclude = false;
  if (checklistSources?.ssfNotApplicable) {
    ssfExclude = true;
  } else {
    const ssfContribution = checklistSources?.monthlySsfContributionNpr ?? 0;
    const ssfTarget =
      checklistSources?.ssfContributionTargetNpr ??
      Math.max(state.monthlySalaryKrw * state.nprPerKrw * 0.1, 5_000);
    ssfPct = clampPct((ssfContribution / Math.max(1, ssfTarget)) * 100);
  }

  let insurancePct = clampPct((healthOk ? 50 : 0) + (lifeOk ? 50 : 0));
  let insuranceExclude = false;
  if (checklistSources?.insuranceLoading || checklistSources?.insuranceUnavailable) {
    insuranceExclude = true;
    insurancePct = 0;
  }

  let housePct = 0;
  let houseExclude = false;
  if (checklistSources) {
    if (checklistSources.housePlanStatus === "not_needed") {
      houseExclude = true;
      housePct = 100;
    } else if (checklistSources.housePlanStatus === "already_own") {
      housePct = 100;
    } else if (checklistSources.housePlanStatus === "plan_to_buy_build") {
      housePct = checklistSources.houseGoalConfigured
        ? clampPct(checklistSources.houseProgressPct)
        : 0;
      if (!checklistSources.houseGoalConfigured) houseExclude = true;
    }
  } else {
    const houseTarget = Math.max(snapshot.houseTotalBudgetNpr, 1);
    const houseFunded = snapshot.totalReturnFundNpr + state.houseProgressPct * houseTarget * 0.01;
    housePct = clampPct((houseFunded / houseTarget) * 100);
  }

  const familyChecks = checklistSources
    ? [
        checklistSources.householdConfigured,
        checklistSources.children === 0 ||
          (checklistSources.familyCostSignalsConfigured && checklistSources.schoolFeesMonthlyNpr > 0),
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

  let businessPct = 0;
  let businessExclude = false;
  if (checklistSources?.businessNotApplicable) {
    businessExclude = true;
  } else if (checklistSources) {
    if (!checklistSources.businessGoalConfigured) {
      businessExclude = true;
    } else {
      const businessTarget =
        checklistSources.businessCapitalTargetNpr > 0
          ? checklistSources.businessCapitalTargetNpr
          : RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR;
      businessPct = clampPct((checklistSources.businessCapitalNpr / businessTarget) * 100);
    }
  } else {
    const businessTarget = RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR;
    businessPct = clampPct((state.businessCapitalNpr / businessTarget) * 100);
  }

  let debtFreePct = 0;
  let debtExclude = false;
  if (checklistSources) {
    if (checklistSources.liabilitiesLoading || checklistSources.liabilitiesUnavailable) {
      debtExclude = true;
    } else if (!checklistSources.liabilitiesConfigured) {
      debtExclude = true;
    } else if (liabilitiesNpr <= 0) {
      debtFreePct = 100;
    } else {
      // Outstanding debt → in progress; never claim COMPLETED via ratio.
      debtFreePct = clampPct(
        Math.max(5, 100 - Math.min(95, (liabilitiesNpr / Math.max(investmentAmount + liabilitiesNpr, 1)) * 100)),
      );
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
    {
      id: "savingsEmergency",
      label: "Savings & Emergency",
      pct: savingsEmergencyPct,
      status: statusFromPct(savingsEmergencyPct),
      excludeFromAggregate: savingsExclude,
    },
    {
      id: "investment",
      label: "Investment Portfolio",
      pct: investmentPct,
      status: statusFromPct(investmentPct),
      excludeFromAggregate: investmentExclude,
    },
    {
      id: "passiveIncome",
      label: "Passive Income",
      pct: passivePct,
      status: statusFromPct(passivePct),
    },
    {
      id: "nepalSsf",
      label: "Nepal SSF Retirement",
      pct: ssfPct,
      status: statusFromPct(ssfPct),
      excludeFromAggregate: ssfExclude,
    },
    {
      id: "insurance",
      label: "Insurance",
      pct: insurancePct,
      status: statusFromPct(insurancePct),
      excludeFromAggregate: insuranceExclude,
    },
    {
      id: "houseReadiness",
      label: "House Readiness",
      pct: housePct,
      status: statusFromPct(housePct),
      excludeFromAggregate: houseExclude,
    },
    {
      id: "familyEducation",
      label: "Family & Education",
      pct: familyPct,
      status: statusFromPct(familyPct),
    },
    {
      id: "businessCapital",
      label: "Business Capital",
      pct: businessPct,
      status: statusFromPct(businessPct),
      excludeFromAggregate: businessExclude,
    },
    {
      id: "debtFree",
      label: "Debt Free",
      pct: debtFreePct,
      status: statusFromPct(debtFreePct),
      excludeFromAggregate: debtExclude,
    },
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
    if (score.excludeFromAggregate) continue;
    const w = weights[score.id];
    total += score.pct * w;
    weightSum += w;
  }
  if (weightSum <= 0) return 0;
  return clampPct(total / weightSum);
}
