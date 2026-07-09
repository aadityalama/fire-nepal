import { computeInsuranceRecommendation, hasAdequateHealthInsurance, hasAdequateLifeInsurance } from "@/lib/insurance/insurance-engine";
import { loadInsuranceWorkspaceState } from "@/lib/insurance/insurance-storage";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";

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

export function computeReturnReadinessScores(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
  liabilitiesNpr: number,
): ReturnReadinessScore[] {
  const policies = loadInsuranceWorkspaceState().policies;
  const recommendation = computeInsuranceRecommendation(policies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(policies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(policies, recommendation.recommendedLifeCoverageNpr);
  const ssf = loadSsfPensionWorkspace();

  const emergencyTarget = Math.max(1, state.emergencyMonthsTarget);
  const savingsEmergencyPct = clampPct((snapshot.emergencyReserveMonths / emergencyTarget) * 100);

  const investmentTarget = 2_000_000;
  const investmentPct = clampPct((investableNpr / investmentTarget) * 100);

  const passiveTarget = Math.max(snapshot.monthlyNepalLivingNpr * 0.8, 30_000);
  const passivePct = clampPct((snapshot.passiveMonthlyNpr / passiveTarget) * 100);

  const ssfTarget = Math.max(state.monthlySalaryKrw * state.nprPerKrw * 0.1, 5_000);
  const ssfPct = clampPct((ssf.projection.monthlySsfContributionNpr / ssfTarget) * 100);

  const insurancePct = clampPct((healthOk ? 50 : 0) + (lifeOk ? 50 : 0));

  const houseTarget = Math.max(snapshot.houseTotalBudgetNpr, 1);
  const houseFunded = snapshot.totalReturnFundNpr + state.houseProgressPct * houseTarget * 0.01;
  const housePct = clampPct((houseFunded / houseTarget) * 100);

  const familyChecks = [
    state.schoolFeesMonthlyNpr > 0 || state.children === 0,
    state.healthcareMonthlyNpr > 0,
    state.settlementChecklist.length >= 3,
    snapshot.familyRelocationScore >= 50,
  ];
  const familyPct = clampPct((familyChecks.filter(Boolean).length / familyChecks.length) * 100);

  const businessTarget = 1_000_000;
  const businessPct = clampPct((state.businessCapitalNpr / businessTarget) * 100);

  const debtRatio = snapshot.totalReturnFundNpr > 0 ? liabilitiesNpr / (snapshot.totalReturnFundNpr + liabilitiesNpr) : liabilitiesNpr > 0 ? 1 : 0;
  const debtFreePct = clampPct((1 - debtRatio) * 100);

  const scores: ReturnReadinessScore[] = [
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

  return scores;
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
