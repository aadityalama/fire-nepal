import { computePlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { aggregateReadinessPct, computeReturnReadinessScores } from "@/lib/return-to-nepal/return-readiness-scores";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";

export type ReturnAiInsight = {
  id: string;
  title: string;
  body: string;
  tone: "positive" | "neutral" | "caution";
};

export type WhatIfScenario = {
  year: number;
  label: string;
  risk: "high" | "moderate" | "low" | "very_safe";
  riskLabel: string;
  readinessPct: number;
  monthlyGapNpr: number;
  requiredSavingsNpr: number;
  recommended: boolean;
};

function formatNprShort(n: number): string {
  if (n >= 10_000_000) return `NPR ${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `NPR ${(n / 100_000).toFixed(1)}L`;
  return `NPR ${Math.round(n / 1000)}k`;
}

function riskFromReadiness(readiness: number, gap: number): WhatIfScenario["risk"] {
  if (gap > 20_000 && readiness < 70) return "high";
  if (readiness >= 88 && gap <= 0) return "very_safe";
  if (readiness >= 72) return "low";
  return "moderate";
}

function riskLabel(risk: WhatIfScenario["risk"]): string {
  switch (risk) {
    case "high":
      return "High Risk";
    case "moderate":
      return "Moderate";
    case "low":
      return "On Track";
    case "very_safe":
      return "Very Safe";
  }
}

export function computeWhatIfScenarios(
  state: ReturnToNepalPlannerState,
  baseSnapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
  liabilitiesNpr: number,
): WhatIfScenario[] {
  const nowYear = baseSnapshot.nowYear;
  const recommendedYear = baseSnapshot.estimatedReturnYear;
  const candidateYears = [
    nowYear + 2,
    recommendedYear,
    recommendedYear + 2,
  ];
  const uniqueYears = [...new Set(candidateYears)].sort((a, b) => a - b);

  const scenarios = uniqueYears.map((year) => {
    const trialState = { ...state, targetReturnYear: year };
    const snap = computePlannerSnapshot(trialState);
    const scores = computeReturnReadinessScores(trialState, snap, insuranceInputs, investableNpr, liabilitiesNpr);
    const readiness = aggregateReadinessPct(scores);
    const gap = snap.monthlyDeficitNpr;
    const risk = riskFromReadiness(readiness, gap);
    return {
      year,
      label: `Return in ${year}`,
      risk,
      riskLabel: riskLabel(risk),
      readinessPct: readiness,
      monthlyGapNpr: gap,
      requiredSavingsNpr: snap.requiredExtraCorpusNpr,
      recommended: year === recommendedYear,
    };
  });

  if (!scenarios.some((s) => s.recommended) && scenarios.length > 0) {
    const closest = scenarios.reduce((best, cur) =>
      Math.abs(cur.year - recommendedYear) < Math.abs(best.year - recommendedYear) ? cur : best,
    );
    return scenarios.map((s) => ({ ...s, recommended: s.year === closest.year }));
  }

  return scenarios;
}

export function computeReturnAiInsights(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  readinessPct: number,
  investableNpr: number,
  liabilitiesNpr: number,
): ReturnAiInsight[] {
  const insights: ReturnAiInsight[] = [];
  const nowYear = snapshot.nowYear;

  const canReturnToday = readinessPct >= 78 && snapshot.monthlyDeficitNpr <= 0;
  insights.push({
    id: "return-today",
    title: "Can I Return Today?",
    body: canReturnToday
      ? `Yes — your passive income covers Nepal living costs with ${snapshot.emergencyReserveMonths.toFixed(1)} months runway.`
      : readinessPct >= 55
        ? `Not yet — close a ${formatNprShort(snapshot.monthlyDeficitNpr)}/mo gap and build ${state.emergencyMonthsTarget} months emergency reserve first.`
        : `Not yet — you are ${readinessPct}% ready. Focus on savings rate and passive income first.`,
    tone: canReturnToday ? "positive" : "caution",
  });

  if (snapshot.monthlyDeficitNpr > 0) {
    const corpusNeed = snapshot.requiredExtraCorpusNpr;
    insights.push({
      id: "stop-working",
      title: "If I stop working today…",
      body: `Your corpus sustains ~${snapshot.sustainabilityYears.toFixed(1)} years at future Nepal spend. You need ~${formatNprShort(corpusNeed)} more for full coverage.`,
      tone: "caution",
    });
  } else {
    insights.push({
      id: "stop-working",
      title: "If I stop working today…",
      body: `Passive income exceeds future Nepal costs by ${formatNprShort(snapshot.monthlySurplusNpr)}/mo — financially viable for return.`,
      tone: "positive",
    });
  }

  const boostNpr = 20_000;
  const boostKrw = Math.round(boostNpr / Math.max(state.nprPerKrw, 0.08));
  const boosted = { ...state, monthlySavingsKrw: state.monthlySavingsKrw + boostKrw };
  const boostedSnap = computePlannerSnapshot(boosted);
  const monthsEarlier = Math.max(0, Math.round((snapshot.yearsToReturn - boostedSnap.yearsToReturn) * 12));
  if (monthsEarlier > 0) {
    insights.push({
      id: "save-more",
      title: `If I save ${formatNprShort(boostNpr)} more…`,
      body: `You can return ${monthsEarlier} month${monthsEarlier === 1 ? "" : "s"} earlier — target shifts from ${snapshot.estimatedReturnYear} toward ${boostedSnap.estimatedReturnYear}.`,
      tone: "positive",
    });
  }

  const inflHigh = { ...state, nepalInflationPct: state.nepalInflationPct + 3 };
  const inflSnap = computePlannerSnapshot(inflHigh);
  insights.push({
    id: "inflation",
    title: "If Nepal inflation increases…",
    body: `At +3% higher inflation, future monthly need rises to ${formatNprShort(inflSnap.monthlyNepalLivingFutureNpr)} — readiness drops ~${Math.max(0, Math.round(readinessPct - aggregateReadinessPct(computeReturnReadinessScores(inflHigh, inflSnap, { monthlyIncomeNpr: 0, monthlyExpenseNpr: 0, totalSavingsNpr: 0, investableNpr, emergencyFundMonths: null, fireGoalNpr: 0, fireProgressPct: null, age: 32, adults: 1, children: 0, ssfMonthlyContributionNpr: 0, yearsToReturn: snapshot.yearsToReturn, returnReadinessPct: readinessPct }, investableNpr, liabilitiesNpr))))} pts.`,
    tone: "neutral",
  });

  const fxShift = { ...state, nprPerKrw: state.nprPerKrw * 0.95 };
  const fxSnap = computePlannerSnapshot(fxShift);
  insights.push({
    id: "fx",
    title: "If KRW exchange changes…",
    body: `A 5% weaker NPR/KRW rate moves your return fund to ${formatNprShort(fxSnap.totalReturnFundNpr)} — ${fxSnap.totalReturnFundNpr >= snapshot.totalReturnFundNpr ? "slightly stronger" : "slightly weaker"} in NPR terms.`,
    tone: "neutral",
  });

  if (investableNpr > 500_000 && snapshot.returnGoalProgressPct < 80) {
    insights.push({
      id: "compound",
      title: "Compound your investable assets",
      body: `You have ${formatNprShort(investableNpr)} investable — routing 15% more into income assets lifts passive readiness fastest.`,
      tone: "positive",
    });
  }

  void nowYear;
  return insights;
}

export function formatReturnCountdown(targetYear: number, now = new Date()): string {
  const target = new Date(targetYear, 2, 1);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  if (months <= 0) return "Ready now";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) return `${years} Year${years === 1 ? "" : "s"} ${rem} Month${rem === 1 ? "" : "s"} Left`;
  if (years > 0) return `${years} Year${years === 1 ? "" : "s"} Left`;
  return `${rem} Month${rem === 1 ? "" : "s"} Left`;
}

export function recommendedReturnMonthYear(targetYear: number): string {
  const d = new Date(targetYear, 2, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatReturnCountdownRemaining(targetYear: number, now = new Date()): string {
  const target = new Date(targetYear, 2, 1);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  if (months <= 0) return "Ready now";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) {
    return `${years} Year${years === 1 ? "" : "s"} ${rem} Month${rem === 1 ? "" : "s"} Remaining`;
  }
  if (years > 0) return `${years} Year${years === 1 ? "" : "s"} Remaining`;
  return `${rem} Month${rem === 1 ? "" : "s"} Remaining`;
}

export function computeReturnDaysRemaining(targetYear: number, now = new Date()): number {
  const target = new Date(targetYear, 2, 1);
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function computeSaveMoreBoost(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  boostNpr = 20_000,
): { boostNpr: number; monthsEarlier: number } {
  const boostKrw = Math.round(boostNpr / Math.max(state.nprPerKrw, 0.08));
  const boosted = { ...state, monthlySavingsKrw: state.monthlySavingsKrw + boostKrw };
  const boostedSnap = computePlannerSnapshot(boosted);
  const monthsEarlier = Math.max(0, Math.round((snapshot.yearsToReturn - boostedSnap.yearsToReturn) * 12));
  return { boostNpr, monthsEarlier };
}
