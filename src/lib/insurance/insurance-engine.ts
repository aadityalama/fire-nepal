import type {
  InsuranceEngineInputs,
  InsurancePolicy,
  InsuranceProtectionBadge,
  InsuranceRecommendation,
  InsuranceRiskLevel,
} from "@/lib/insurance/insurance-types";
import { formatNprCompact, sumCoverageByType, sumMonthlyPremiums } from "@/lib/insurance/insurance-utils";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function roundToLakh(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100_000) * 100_000;
}

function protectionBadge(score: number): InsuranceProtectionBadge {
  if (score >= 88) return "Excellent";
  if (score >= 72) return "Strong";
  if (score >= 50) return "Needs attention";
  return "Underprotected";
}

function riskLevel(score: number, lifeGap: number, healthGap: number): InsuranceRiskLevel {
  if (score < 40 || lifeGap > 8_000_000 || healthGap > 2_000_000) return "critical";
  if (score < 55 || lifeGap > 4_000_000) return "high";
  if (score < 75) return "moderate";
  return "low";
}

/**
 * FIRE AI Insurance Engine — Nepal diaspora heuristics.
 * Uses income, dependents, emergency runway, FIRE progress, and return plan.
 */
export function computeInsuranceRecommendation(
  policies: InsurancePolicy[],
  inputs: InsuranceEngineInputs,
): InsuranceRecommendation {
  const annualIncome = Math.max(0, inputs.monthlyIncomeNpr) * 12;
  const dependents = Math.max(0, inputs.adults - 1) + Math.max(0, inputs.children);
  const age = inputs.age > 0 ? inputs.age : 32;

  // Health: family medical buffer scaled by dependents + return-to-Nepal healthcare risk
  const healthBase = 1_500_000;
  const healthPerDependent = 750_000;
  const healthReturnBoost = (inputs.yearsToReturn != null && inputs.yearsToReturn <= 5 ? 1_000_000 : 0);
  const recommendedHealthCoverageNpr = roundToLakh(
    clamp(healthBase + dependents * healthPerDependent + healthReturnBoost, 1_000_000, 10_000_000),
  );

  // Life: income replacement (10–15×) + dependent load − liquid assets buffer
  const lifeMultiple = age < 35 ? 15 : age < 45 ? 12 : age < 55 ? 10 : 8;
  const dependentLoad = dependents * 2_500_000;
  const liquidBuffer = Math.max(0, inputs.totalSavingsNpr + inputs.investableNpr) * 0.35;
  const recommendedLifeCoverageNpr = roundToLakh(
    clamp(annualIncome * lifeMultiple + dependentLoad - liquidBuffer, 2_000_000, 50_000_000),
  );

  // Critical illness: ~3–5× annual income, capped
  const recommendedCriticalIllnessNpr = roundToLakh(
    clamp(annualIncome * (age < 40 ? 4 : 3), 1_000_000, 15_000_000),
  );

  // Income protection: replace ~70% of monthly income for 24 months
  const incomeProtectionNeedNpr = roundToLakh(
    clamp(inputs.monthlyIncomeNpr * 0.7 * 24, 500_000, 20_000_000),
  );

  const currentHealthCoverageNpr = sumCoverageByType(policies, "health");
  const currentLifeCoverageNpr = sumCoverageByType(policies, "life");
  const currentCriticalCoverageNpr = sumCoverageByType(policies, "critical_illness");
  const currentMonthlyPremiumNpr = sumMonthlyPremiums(policies);

  const healthGapNpr = Math.max(0, recommendedHealthCoverageNpr - currentHealthCoverageNpr);
  const lifeGapNpr = Math.max(0, recommendedLifeCoverageNpr - currentLifeCoverageNpr);
  const criticalGapNpr = Math.max(0, recommendedCriticalIllnessNpr - currentCriticalCoverageNpr);
  const coverageGapNpr = healthGapNpr + lifeGapNpr + criticalGapNpr;

  // Premium guidance: ~1–2% of gross income, nudged by gap severity
  const premiumBase = inputs.monthlyIncomeNpr * 0.015;
  const gapNudge = coverageGapNpr > 0 ? Math.min(inputs.monthlyIncomeNpr * 0.01, coverageGapNpr / 120) : 0;
  const recommendedMonthlyPremiumNpr = Math.round(clamp(premiumBase + gapNudge, 800, 25_000));

  const healthRatio =
    recommendedHealthCoverageNpr > 0 ? clamp(currentHealthCoverageNpr / recommendedHealthCoverageNpr, 0, 1.15) : 1;
  const lifeRatio =
    recommendedLifeCoverageNpr > 0 ? clamp(currentLifeCoverageNpr / recommendedLifeCoverageNpr, 0, 1.15) : 1;
  const criticalRatio =
    recommendedCriticalIllnessNpr > 0
      ? clamp(currentCriticalCoverageNpr / recommendedCriticalIllnessNpr, 0, 1.15)
      : 1;
  const emergencyBoost =
    inputs.emergencyFundMonths == null
      ? 0
      : clamp(inputs.emergencyFundMonths / 6, 0, 1.2) * 8;
  const fireBoost = inputs.fireProgressPct == null ? 0 : clamp(inputs.fireProgressPct / 100, 0, 1) * 4;
  const ssfBoost = inputs.ssfMonthlyContributionNpr > 0 ? 3 : 0;
  const returnBoost =
    inputs.returnReadinessPct == null ? 0 : clamp(inputs.returnReadinessPct / 100, 0, 1) * 3;

  const coverageScore = healthRatio * 32 + lifeRatio * 42 + criticalRatio * 14;
  const protectionScorePct = Math.round(
    clamp(coverageScore + emergencyBoost + fireBoost + ssfBoost + returnBoost, 0, 100),
  );

  const badge = protectionBadge(protectionScorePct);
  const risk = riskLevel(protectionScorePct, lifeGapNpr, healthGapNpr);

  let aiSummary = "You are well protected.";
  if (lifeGapNpr > healthGapNpr && lifeGapNpr > 1_000_000) {
    aiSummary = "You need additional Life Insurance.";
  } else if (healthGapNpr > 500_000) {
    aiSummary = "Increase Health Insurance for your family.";
  } else if (criticalGapNpr > 1_000_000 && lifeGapNpr <= 1_000_000) {
    aiSummary = "Add Critical Illness cover for medical shocks.";
  } else if (protectionScorePct >= 88) {
    aiSummary = "You are well protected.";
  } else if (protectionScorePct >= 72) {
    aiSummary = "Strong cover — close small gaps before return.";
  } else {
    aiSummary = "Your protection score needs attention.";
  }

  const suggestionIncreaseLifeNpr = lifeGapNpr > 0 ? roundToLakh(lifeGapNpr) : 0;
  const suggestionTitle = coverageGapNpr > 0 ? "Need more protection?" : "Stay on top of renewals";
  const suggestionBody =
    suggestionIncreaseLifeNpr > 0
      ? `Based on your income and family, FIRE AI recommends increasing your Life Insurance by ${formatNprCompact(suggestionIncreaseLifeNpr)}.`
      : healthGapNpr > 0
        ? `Based on your household, FIRE AI recommends adding ${formatNprCompact(healthGapNpr)} in Health Insurance coverage.`
        : coverageGapNpr > 0
          ? `Close a ${formatNprCompact(coverageGapNpr)} total coverage gap across health, life, and critical illness.`
          : "Your coverage matches FIRE AI targets. Review renewals and nominees quarterly.";

  return {
    recommendedHealthCoverageNpr,
    recommendedLifeCoverageNpr,
    recommendedCriticalIllnessNpr,
    incomeProtectionNeedNpr,
    recommendedMonthlyPremiumNpr,
    protectionScorePct,
    protectionBadge: badge,
    riskLevel: risk,
    coverageGapNpr,
    healthGapNpr,
    lifeGapNpr,
    criticalGapNpr,
    currentHealthCoverageNpr,
    currentLifeCoverageNpr,
    currentCriticalCoverageNpr,
    currentMonthlyPremiumNpr,
    aiSummary,
    suggestionTitle,
    suggestionBody,
    suggestionIncreaseLifeNpr,
  };
}

export function hasAdequateHealthInsurance(policies: InsurancePolicy[], recommendedHealthNpr: number): boolean {
  const current = sumCoverageByType(policies, "health");
  return current >= recommendedHealthNpr * 0.7 && current > 0;
}

export function hasAdequateLifeInsurance(policies: InsurancePolicy[], recommendedLifeNpr: number): boolean {
  const current = sumCoverageByType(policies, "life");
  return current >= recommendedLifeNpr * 0.7 && current > 0;
}
