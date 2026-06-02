import type { ConstructionPhaseId, NepalCityId, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

const CITY_MULT: Record<NepalCityId, number> = {
  kathmandu: 1,
  pokhara: 0.84,
  chitwan: 0.8,
  dharan: 0.78,
  butwal: 0.74,
  village: 0.52,
};

const LIFESTYLE_MULT = {
  basic: 0.62,
  comfortable: 1,
  premium: 1.42,
  luxury: 2.05,
} as const;

/** Kathmandu comfortable baseline — NPR / month for 2 adults (scaled by household) */
const BASE_HOUSEHOLD_COL = 88_000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function fvMonthlyContribution(
  monthly: number,
  months: number,
  /** monthly rate */
  r: number,
): number {
  if (months <= 0) return 0;
  if (r <= 0) return monthly * months;
  return (monthly * (Math.pow(1 + r, months) - 1)) / r;
}

/** Model severance (KRW) from salary × tenure — used when auto-calculate is on. */
export function computeAutoSeveranceKrw(state: ReturnToNepalPlannerState): number {
  const months = clamp(state.koreaYearsWorked + state.plannedKoreaYearsRemaining, 0, 40);
  return state.monthlySalaryKrw * months;
}

/** Rough national-pension maturity (KRW) — used when auto-calculate is on. */
export function computeAutoNationalPensionMaturityKrw(state: ReturnToNepalPlannerState): number {
  const totalYears = clamp(state.koreaYearsWorked + state.plannedKoreaYearsRemaining, 0, 45);
  const annualContrib = state.monthlySalaryKrw * 12 * 0.045;
  const r = 0.035 / 12;
  const months = Math.round(totalYears * 12);
  return fvMonthlyContribution(annualContrib / 12, months, r) * 0.72;
}

function severanceAutoOn(state: ReturnToNepalPlannerState): boolean {
  return state.severanceAutoCalculate !== false;
}

function nationalPensionAutoOn(state: ReturnToNepalPlannerState): boolean {
  return state.nationalPensionAutoCalculate !== false;
}

function estimateSeveranceKrw(state: ReturnToNepalPlannerState): number {
  if (severanceAutoOn(state)) return computeAutoSeveranceKrw(state);
  return Math.max(0, state.severanceOverrideKrw);
}

function estimateNationalPensionMaturityKrw(state: ReturnToNepalPlannerState): number {
  if (nationalPensionAutoOn(state)) return computeAutoNationalPensionMaturityKrw(state);
  return Math.max(0, state.nationalPensionMaturityOverrideKrw);
}

export type TimelinePoint = {
  year: number;
  corpusKrw: number;
  corpusNpr: number;
};

export type PlannerSnapshot = {
  nowYear: number;
  totalReturnFundNpr: number;
  monthlyNepalLivingNpr: number;
  monthlyNepalLivingFutureNpr: number;
  /** Salary − savings, converted to NPR (simple Korea spend proxy) */
  koreaImpliedMonthlySpendNpr: number;
  yearsToReturn: number;
  estimatedReturnYear: number;
  returnReadinessPct: number;
  retirementReadinessPct: number;
  passiveMonthlyNpr: number;
  passiveMonthlyFutureNpr: number;
  familyRelocationScore: number;
  emergencyReserveMonths: number;
  emergencyStatusLabel: "critical" | "lean" | "solid" | "elite";
  monthlySurplusNpr: number;
  monthlyDeficitNpr: number;
  requiredExtraCorpusNpr: number;
  sustainabilityYears: number;
  koreaSavingsAfterPlannedYearsNpr: number;
  projectedSeveranceNpr: number;
  projectedNationalPensionNpr: number;
  houseTotalBudgetNpr: number;
  houseLoanEmiNpr: number;
  businessPassiveMonthlyHintNpr: number;
  aiHeadline: string;
  aiSecondary: string;
  emotionalLine: string;
  freedomMilestone: string;
  stressScore: number;
  /** For charts */
  timeline: TimelinePoint[];
  inflationFactorAtReturn: number;
  targetSavingsGapNpr: number;
  returnGoalProgressPct: number;
  fiYearsFromPassive: number;
};

export function monthlyLoanEmi(principal: number, annualPct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualPct / 100 / 12;
  const n = years * 12;
  if (r <= 0) return principal / n;
  const pow = Math.pow(1 + r, n);
  return (principal * r * pow) / (pow - 1);
}

export function computeNepalMonthlyCol(state: ReturnToNepalPlannerState): number {
  const adults = clamp(state.adults, 1, 6);
  const children = clamp(state.children, 0, 8);
  const householdScale = 0.55 + adults * 0.32 + children * 0.2;
  const city = CITY_MULT[state.city];
  const life = LIFESTYLE_MULT[state.lifestyle];
  return Math.round(BASE_HOUSEHOLD_COL * householdScale * city * life);
}

export function computePlannerSnapshot(state: ReturnToNepalPlannerState): PlannerSnapshot {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nprPerKrw = state.nprPerKrw > 0 ? state.nprPerKrw : 0.1029;
  const infl = state.nepalInflationPct / 100;
  const yearsToTarget = Math.max(0, state.targetReturnYear - nowYear);
  const inflationFactorAtReturn = Math.pow(1 + infl, yearsToTarget);

  const koreaNpr = state.koreaSavingsKrw * nprPerKrw;
  const totalReturnFundNpr = koreaNpr + state.nepalLiquidNpr;

  const koreaImpliedMonthlySpendNpr = Math.round(Math.max(0, state.monthlySalaryKrw - state.monthlySavingsKrw) * nprPerKrw);

  const monthlyNepalLivingNpr = computeNepalMonthlyCol(state);
  const monthlyNepalLivingFutureNpr = Math.round(monthlyNepalLivingNpr * inflationFactorAtReturn);

  const passiveMonthlyNpr =
    state.pensionMonthlyNpr +
    state.dividendMonthlyNpr +
    state.fdMonthlyNpr +
    state.rentalMonthlyNpr +
    state.swpMonthlyNpr;
  const passiveMonthlyFutureNpr = Math.round(passiveMonthlyNpr * inflationFactorAtReturn);

  const familyMonthlyExtra =
    state.schoolFeesMonthlyNpr + state.parentSupportMonthlyNpr + state.healthcareMonthlyNpr;
  const totalMonthlyNeedFuture = monthlyNepalLivingFutureNpr + familyMonthlyExtra;

  const surplus = passiveMonthlyFutureNpr - totalMonthlyNeedFuture;
  const monthlySurplusNpr = surplus > 0 ? surplus : 0;
  const monthlyDeficitNpr = surplus < 0 ? -surplus : 0;

  const swr = 0.0425;
  const requiredExtraCorpusNpr =
    monthlyDeficitNpr > 0 ? Math.round((monthlyDeficitNpr * 12) / swr) : 0;

  const sustainabilityYears =
    monthlyDeficitNpr <= 0
      ? 40
      : totalReturnFundNpr > 0
        ? clamp(totalReturnFundNpr / (monthlyDeficitNpr * 12), 0, 55)
        : 0;

  const houseTotal =
    state.landBudgetNpr +
    state.constructionBudgetNpr +
    state.interiorBudgetNpr +
    state.furnitureBudgetNpr;
  const houseLoanEmi = monthlyLoanEmi(state.homeLoanPrincipalNpr, state.homeLoanAprPct, state.homeLoanYears);

  const targetSavingsGapNpr = Math.max(0, houseTotal + state.relocationOneTimeNpr - totalReturnFundNpr);

  const monthlySaveNpr = state.monthlySavingsKrw * nprPerKrw;
  const annualSaveNpr = monthlySaveNpr * 12;
  const yearsToCloseGap = annualSaveNpr > 5000 ? targetSavingsGapNpr / annualSaveNpr : 99;
  const yearsToReturn = clamp(yearsToCloseGap, 0.25, 45);
  const estimatedReturnYear = nowYear + Math.floor(yearsToReturn);

  const returnGoalProgressPct = clamp(
    houseTotal + state.relocationOneTimeNpr > 0
      ? (totalReturnFundNpr / (houseTotal + state.relocationOneTimeNpr)) * 100
      : (totalReturnFundNpr / (monthlyNepalLivingNpr * 240)) * 100,
    0,
    100,
  );

  const incomeCoverage = totalMonthlyNeedFuture > 0 ? (passiveMonthlyFutureNpr / totalMonthlyNeedFuture) * 100 : 100;
  const retirementReadinessPct = clamp(incomeCoverage * 0.55 + returnGoalProgressPct * 0.45, 0, 100);

  const emergencyReserveMonths =
    totalMonthlyNeedFuture > 0 ? totalReturnFundNpr / totalMonthlyNeedFuture : state.emergencyMonthsTarget * 2;

  let emergencyStatusLabel: PlannerSnapshot["emergencyStatusLabel"] = "solid";
  if (emergencyReserveMonths < state.emergencyMonthsTarget * 0.45) emergencyStatusLabel = "critical";
  else if (emergencyReserveMonths < state.emergencyMonthsTarget * 0.85) emergencyStatusLabel = "lean";
  else if (emergencyReserveMonths >= state.emergencyMonthsTarget * 1.6) emergencyStatusLabel = "elite";

  const schoolOk = state.schoolFeesMonthlyNpr > 0 || state.children === 0;
  const healthOk = state.healthcareMonthlyNpr > 0;
  const relocateOk = state.relocationOneTimeNpr > 0;
  const checklistScore =
    ((schoolOk ? 1 : 0) + (healthOk ? 1 : 0) + (relocateOk ? 1 : 0) + (state.parentSupportMonthlyNpr > 0 ? 1 : 0)) /
    4;
  const settlementDone = state.settlementChecklist?.length ?? 0;
  const settlementFactor = settlementDone / 6;
  const familyRelocationScore = clamp(
    checklistScore * 38 + settlementFactor * 22 + clamp(emergencyReserveMonths / (state.emergencyMonthsTarget || 6), 0, 1) * 40,
    0,
    100,
  );

  const salaryGrowth = state.salaryGrowthPct / 100;
  /** Conservative blended return on Korea-side liquid savings while abroad */
  const annualPortfolioReturn = 0.062;
  let corpusKrw = state.koreaSavingsKrw;
  let boostedMonthlySave = state.monthlySavingsKrw;
  const timeline: TimelinePoint[] = [];
  const horizonYears = Math.min(22, Math.max(5, Math.ceil(state.plannedKoreaYearsRemaining) + 4));
  for (let y = 0; y <= horizonYears; y += 1) {
    const year = nowYear + y;
    timeline.push({
      year,
      corpusKrw,
      corpusNpr: Math.round(corpusKrw * nprPerKrw),
    });
    boostedMonthlySave *= 1 + salaryGrowth * 0.35;
    corpusKrw = (corpusKrw + boostedMonthlySave * 12) * (1 + annualPortfolioReturn);
  }

  const idx = Math.min(
    timeline.length - 1,
    Math.max(0, Math.round(state.plannedKoreaYearsRemaining)),
  );
  const koreaSavingsAfterPlannedYearsNpr = timeline[idx]?.corpusNpr ?? Math.round(corpusKrw * nprPerKrw);

  const projectedSeveranceNpr = Math.round(estimateSeveranceKrw(state) * nprPerKrw);
  const projectedNationalPensionNpr = Math.round(estimateNationalPensionMaturityKrw(state) * nprPerKrw);

  const yieldPct = state.expectedRentalYieldPct / 100;
  const businessPassiveMonthlyHintNpr = Math.round((state.businessCapitalNpr * yieldPct) / 12);

  const returnReadinessPct = clamp(retirementReadinessPct * 0.92 + (emergencyStatusLabel === "elite" ? 8 : 0), 0, 100);

  const fiPassiveNeed = totalMonthlyNeedFuture * 12;
  const fiYearsFromPassive =
    passiveMonthlyFutureNpr > 0 ? clamp(fiPassiveNeed / (passiveMonthlyFutureNpr * 12) * 8, 0.5, 40) : 40;

  const stressScore = clamp(
    monthlyDeficitNpr / Math.max(1, totalMonthlyNeedFuture) * 40 +
      (targetSavingsGapNpr > 0 ? 25 : 0) +
      (emergencyStatusLabel === "critical" ? 25 : emergencyStatusLabel === "lean" ? 12 : 0),
    0,
    100,
  );

  const aiHeadline =
    monthlyDeficitNpr <= 0 && returnReadinessPct >= 72
      ? `You may comfortably return to Nepal in ${yearsToReturn.toFixed(1)} years if current savings continue.`
      : monthlyDeficitNpr > 0
        ? `Close a NPR ${(monthlyDeficitNpr / 1000).toFixed(0)}k monthly gap with passive income or a larger corpus before fully retiring in Nepal.`
        : `You are ${returnGoalProgressPct.toFixed(0)}% closer to your Nepal return fund — keep compounding discipline.`;

  const aiSecondary =
    businessPassiveMonthlyHintNpr > 35_000 && state.businessCapitalNpr > 1_200_000
      ? `Your savings may support a rental-style investment — model hints ~${formatNprShort(businessPassiveMonthlyHintNpr)}/mo passive at your yield assumption.`
      : passiveMonthlyFutureNpr > 40_000
        ? `After return, modeled passive flow is ~${formatNprShort(passiveMonthlyFutureNpr)}/mo in ${state.targetReturnYear} money.`
        : `Layer pension, FD ladder, and rental cashflow to lift passive income above future Nepal living costs.`;

  const emotionalLine =
    returnGoalProgressPct >= 75
      ? "Your future Nepal lifestyle is becoming financially secure."
      : "Every month in Korea is buying future calm in Nepal — stay consistent.";

  const freedomMilestone =
    returnReadinessPct >= 80
      ? "Freedom milestone: independence coverage is approaching your future expense line."
      : `Next milestone: push readiness from ${returnReadinessPct.toFixed(0)}% → 80% with passive + runway.`;

  return {
    nowYear,
    totalReturnFundNpr,
    monthlyNepalLivingNpr,
    monthlyNepalLivingFutureNpr,
    koreaImpliedMonthlySpendNpr,
    yearsToReturn,
    estimatedReturnYear,
    returnReadinessPct,
    retirementReadinessPct,
    passiveMonthlyNpr,
    passiveMonthlyFutureNpr,
    familyRelocationScore,
    emergencyReserveMonths,
    emergencyStatusLabel,
    monthlySurplusNpr,
    monthlyDeficitNpr,
    requiredExtraCorpusNpr,
    sustainabilityYears,
    koreaSavingsAfterPlannedYearsNpr,
    projectedSeveranceNpr,
    projectedNationalPensionNpr,
    houseTotalBudgetNpr: houseTotal,
    houseLoanEmiNpr: houseLoanEmi,
    businessPassiveMonthlyHintNpr,
    aiHeadline,
    aiSecondary,
    emotionalLine,
    freedomMilestone,
    stressScore,
    timeline,
    inflationFactorAtReturn,
    targetSavingsGapNpr,
    returnGoalProgressPct,
    fiYearsFromPassive,
  };
}

function formatNprShort(n: number): string {
  if (n >= 10000000) return `रु ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `रु ${(n / 100000).toFixed(2)}L`;
  return `रु ${Math.round(n / 1000)}k`;
}

export function phaseCompletionRatio(completed: ConstructionPhaseId[]): number {
  const total = 6;
  return clamp(completed.length / total, 0, 1);
}

export function budgetOverrunRisk(state: ReturnToNepalPlannerState, snapshot: PlannerSnapshot): "low" | "medium" | "high" {
  const spent = snapshot.houseTotalBudgetNpr * (state.houseProgressPct / 100);
  const planned = snapshot.houseTotalBudgetNpr * phaseCompletionRatio(state.completedPhases);
  const drift = spent - planned;
  if (drift > snapshot.houseTotalBudgetNpr * 0.12) return "high";
  if (drift > snapshot.houseTotalBudgetNpr * 0.05) return "medium";
  return "low";
}
