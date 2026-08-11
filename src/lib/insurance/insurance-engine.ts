import type {
  InsuranceEngineInputs,
  InsuranceMetricAvailability,
  InsurancePolicy,
  InsuranceProtectionBadge,
  InsuranceRecommendation,
  InsuranceRiskLevel,
} from "@/lib/insurance/insurance-types";
import { INSURANCE_METHODOLOGY_DISCLAIMER } from "@/lib/insurance/insurance-types";
import { formatNprCompact, sumCoverageByType, sumMonthlyPremiums } from "@/lib/insurance/insurance-utils";

/**
 * FIRE Nepal Insurance Engine — educational needs analysis.
 *
 * Life need ≈ income replacement (years to working horizon) + liabilities
 *            + dependent living support − liquid assets.
 * Health need ≈ household medical shock buffer from income/expenses
 *            (+ return-to-Nepal healthcare transition when timeline is near).
 * Gaps = max(0, recommended − existing active coverage) per type.
 *
 * Missing required inputs → metric marked insufficient_data (never invent values).
 */

/** Educational working-horizon age for income-replacement years (not a product guarantee). */
const WORKING_HORIZON_AGE = 60;
const MIN_REPLACEMENT_YEARS = 5;
const MAX_REPLACEMENT_YEARS = 20;
/** Years of living-expense support counted per dependent when expenses (or income proxy) exist. */
const DEPENDENT_SUPPORT_YEARS = 5;
/** When expenses are missing, assume ~50% of income is living cost for dependent support only. */
const INCOME_AS_LIVING_PROXY = 0.5;
/** Per-person medical shock vs annual expenses / income (takes the larger when both exist). */
const HEALTH_EXPENSE_SHARE = 0.75;
const HEALTH_INCOME_SHARE = 0.3;
/** Extra fraction of the per-person health buffer when return-to-Nepal is within 5 years. */
const RETURN_HEALTH_SHARE = 0.5;
const RETURN_NEAR_YEARS = 5;
/** Critical-illness educational multiples of annual income. */
const CRITICAL_INCOME_MULT_YOUNG = 3;
const CRITICAL_INCOME_MULT_DEFAULT = 2.5;
const CRITICAL_AGE_THRESHOLD = 40;
const INCOME_PROTECTION_MONTHS = 24;
const INCOME_PROTECTION_PCT = 0.7;
/** Premium guidance: 1% of income when gaps are closed, up to 2% when gaps are large. */
const PREMIUM_BASE_PCT = 0.01;
const PREMIUM_MAX_PCT = 0.02;
const SCORE_HEALTH_WEIGHT = 32;
const SCORE_LIFE_WEIGHT = 42;
const SCORE_CRITICAL_WEIGHT = 14;
const EMERGENCY_BOOST_MAX = 8;
const FIRE_BOOST_MAX = 4;
const SSF_BOOST = 3;
const RETURN_BOOST_MAX = 3;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function roundToLakh(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100_000) * 100_000;
}

function protectionBadge(score: number | null, scoreReady: boolean): InsuranceProtectionBadge {
  if (!scoreReady || score == null) return "Incomplete data";
  if (score >= 88) return "Excellent";
  if (score >= 72) return "Strong";
  if (score >= 50) return "Needs attention";
  return "Underprotected";
}

function riskLevel(
  score: number | null,
  scoreReady: boolean,
  lifeGap: number,
  healthGap: number,
  annualIncome: number,
): InsuranceRiskLevel {
  if (!scoreReady || score == null) return "moderate";
  const largeLifeGap = annualIncome > 0 ? lifeGap > annualIncome * 4 : lifeGap > 0;
  const largeHealthGap = annualIncome > 0 ? healthGap > annualIncome * 0.5 : healthGap > 0;
  if (score < 40 || largeLifeGap || largeHealthGap) return "critical";
  if (score < 55 || (annualIncome > 0 && lifeGap > annualIncome * 2)) return "high";
  if (score < 75) return "moderate";
  return "low";
}

function positive(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function replacementYearsForAge(age: number): number {
  return clamp(WORKING_HORIZON_AGE - age, MIN_REPLACEMENT_YEARS, MAX_REPLACEMENT_YEARS);
}

function emptyRecommendation(
  policies: InsurancePolicy[],
  missingInputs: string[],
  howCalculated: string,
  calculationSteps: string[],
): InsuranceRecommendation {
  const currentHealthCoverageNpr = sumCoverageByType(policies, "health");
  const currentLifeCoverageNpr = sumCoverageByType(policies, "life");
  const currentCriticalCoverageNpr = sumCoverageByType(policies, "critical_illness");
  const currentMonthlyPremiumNpr = sumMonthlyPremiums(policies);
  const insufficient: InsuranceMetricAvailability = "insufficient_data";

  return {
    recommendedHealthCoverageNpr: 0,
    recommendedLifeCoverageNpr: 0,
    recommendedCriticalIllnessNpr: 0,
    incomeProtectionNeedNpr: 0,
    recommendedMonthlyPremiumNpr: 0,
    protectionScorePct: 0,
    protectionBadge: "Incomplete data",
    riskLevel: "moderate",
    coverageGapNpr: 0,
    healthGapNpr: 0,
    lifeGapNpr: 0,
    criticalGapNpr: 0,
    currentHealthCoverageNpr,
    currentLifeCoverageNpr,
    currentCriticalCoverageNpr,
    currentMonthlyPremiumNpr,
    aiSummary: "Not enough information to estimate protection. Complete income, age, and household fields.",
    suggestionTitle: "Complete your profile",
    suggestionBody: `Add missing inputs (${missingInputs.join(", ") || "income and age"}) so FIRE Nepal can estimate educational cover needs from your data.`,
    suggestionIncreaseLifeNpr: 0,
    healthAvailability: insufficient,
    lifeAvailability: insufficient,
    criticalAvailability: insufficient,
    incomeProtectionAvailability: insufficient,
    premiumAvailability: insufficient,
    scoreAvailability: insufficient,
    gapAvailability: insufficient,
    missingInputs,
    howCalculated,
    calculationSteps,
    methodologyDisclaimer: INSURANCE_METHODOLOGY_DISCLAIMER,
  };
}

/**
 * Educational insurance needs analysis from live user inputs + policy coverage.
 * Does not invent missing age/income/expense data.
 */
export function computeInsuranceRecommendation(
  policies: InsurancePolicy[],
  inputs: InsuranceEngineInputs,
): InsuranceRecommendation {
  const monthlyIncome = positive(inputs.monthlyIncomeNpr);
  const monthlyExpense = positive(inputs.monthlyExpenseNpr);
  const annualIncome = monthlyIncome * 12;
  const annualExpenses = monthlyExpense * 12;
  const adults = Math.max(0, Math.round(inputs.adults));
  const children = Math.max(0, Math.round(inputs.children));
  const householdSize = Math.max(1, adults + children);
  const dependents = Math.max(0, adults - 1) + children;
  const age = inputs.age != null && inputs.age > 0 ? inputs.age : null;
  const liabilities = positive(inputs.liabilitiesNpr);
  const liquidAssets = positive(inputs.totalSavingsNpr) + positive(inputs.investableNpr);
  const yearsToReturn = inputs.yearsToReturn;

  const missingInputs: string[] = [];
  if (monthlyIncome <= 0 && monthlyExpense <= 0) missingInputs.push("monthly income or living expenses");
  if (monthlyIncome <= 0) missingInputs.push("monthly income");
  if (age == null) missingInputs.push("current age");

  const currentHealthCoverageNpr = sumCoverageByType(policies, "health");
  const currentLifeCoverageNpr = sumCoverageByType(policies, "life");
  const currentCriticalCoverageNpr = sumCoverageByType(policies, "critical_illness");
  const currentMonthlyPremiumNpr = sumMonthlyPremiums(policies);

  const calculationSteps: string[] = [];

  // --- Health ---
  const healthAvailability: InsuranceMetricAvailability =
    annualIncome > 0 || annualExpenses > 0 ? "ready" : "insufficient_data";
  let recommendedHealthCoverageNpr = 0;
  let healthStep = "Health: not enough information (need income or living expenses).";
  if (healthAvailability === "ready") {
    const fromExpenses = annualExpenses > 0 ? annualExpenses * HEALTH_EXPENSE_SHARE : 0;
    const fromIncome = annualIncome > 0 ? annualIncome * HEALTH_INCOME_SHARE : 0;
    const perPerson = Math.max(fromExpenses, fromIncome);
    const baseHousehold = perPerson * householdSize;
    const returnNear = yearsToReturn != null && yearsToReturn <= RETURN_NEAR_YEARS;
    const returnBuffer = returnNear ? perPerson * RETURN_HEALTH_SHARE : 0;
    recommendedHealthCoverageNpr = roundToLakh(baseHousehold + returnBuffer);
    healthStep = returnNear
      ? `Health: ${householdSize} household × medical buffer (${formatNprCompact(perPerson)}/person from ${annualExpenses > 0 ? "expenses/income" : "income"}) + return-to-Nepal transition (${formatNprCompact(returnBuffer)}) = ${formatNprCompact(recommendedHealthCoverageNpr)}.`
      : `Health: ${householdSize} household × medical buffer (${formatNprCompact(perPerson)}/person from ${annualExpenses > 0 && annualIncome > 0 ? "max(75% annual expenses, 30% annual income)" : annualExpenses > 0 ? "75% annual expenses" : "30% annual income"}) = ${formatNprCompact(recommendedHealthCoverageNpr)}.`;
  }
  calculationSteps.push(healthStep);

  // --- Life ---
  const lifeAvailability: InsuranceMetricAvailability =
    annualIncome > 0 && age != null ? "ready" : "insufficient_data";
  let recommendedLifeCoverageNpr = 0;
  let incomeReplacement = 0;
  let dependentSupport = 0;
  let lifeStep = "Life: not enough information (need monthly income and current age).";
  if (lifeAvailability === "ready" && age != null) {
    const years = replacementYearsForAge(age);
    incomeReplacement = annualIncome * years;
    if (dependents > 0) {
      if (annualExpenses > 0) {
        dependentSupport = dependents * annualExpenses * DEPENDENT_SUPPORT_YEARS;
      } else {
        dependentSupport = dependents * annualIncome * INCOME_AS_LIVING_PROXY * DEPENDENT_SUPPORT_YEARS;
      }
    }
    const grossNeed = incomeReplacement + liabilities + dependentSupport;
    recommendedLifeCoverageNpr = roundToLakh(Math.max(0, grossNeed - liquidAssets));
    lifeStep = `Life: income replacement (${formatNprCompact(annualIncome)} × ${years} yrs to age ${WORKING_HORIZON_AGE}) + liabilities (${formatNprCompact(liabilities)}) + dependent support (${formatNprCompact(dependentSupport)}) − liquid assets (${formatNprCompact(liquidAssets)}) = ${formatNprCompact(recommendedLifeCoverageNpr)}.`;
  }
  calculationSteps.push(lifeStep);

  // --- Critical illness ---
  const criticalAvailability: InsuranceMetricAvailability = annualIncome > 0 ? "ready" : "insufficient_data";
  let recommendedCriticalIllnessNpr = 0;
  let criticalStep = "Critical illness: not enough information (need monthly income).";
  if (criticalAvailability === "ready") {
    const mult =
      age != null && age < CRITICAL_AGE_THRESHOLD ? CRITICAL_INCOME_MULT_YOUNG : CRITICAL_INCOME_MULT_DEFAULT;
    recommendedCriticalIllnessNpr = roundToLakh(annualIncome * mult);
    criticalStep =
      age != null
        ? `Critical illness: ${mult}× annual income (age ${age}) = ${formatNprCompact(recommendedCriticalIllnessNpr)}.`
        : `Critical illness: ${mult}× annual income (age not set; using standard ${CRITICAL_INCOME_MULT_DEFAULT}×) = ${formatNprCompact(recommendedCriticalIllnessNpr)}.`;
  }
  calculationSteps.push(criticalStep);

  // --- Income protection (educational buffer, not a product pick) ---
  const incomeProtectionAvailability: InsuranceMetricAvailability =
    monthlyIncome > 0 ? "ready" : "insufficient_data";
  const incomeProtectionNeedNpr =
    incomeProtectionAvailability === "ready"
      ? roundToLakh(monthlyIncome * INCOME_PROTECTION_PCT * INCOME_PROTECTION_MONTHS)
      : 0;
  calculationSteps.push(
    incomeProtectionAvailability === "ready"
      ? `Income protection buffer: ${INCOME_PROTECTION_PCT * 100}% of monthly income × ${INCOME_PROTECTION_MONTHS} months = ${formatNprCompact(incomeProtectionNeedNpr)}.`
      : "Income protection: not enough information (need monthly income).",
  );

  // --- Gaps (existing coverage deducted) ---
  const healthGapNpr =
    healthAvailability === "ready" ? Math.max(0, recommendedHealthCoverageNpr - currentHealthCoverageNpr) : 0;
  const lifeGapNpr =
    lifeAvailability === "ready" ? Math.max(0, recommendedLifeCoverageNpr - currentLifeCoverageNpr) : 0;
  const criticalGapNpr =
    criticalAvailability === "ready"
      ? Math.max(0, recommendedCriticalIllnessNpr - currentCriticalCoverageNpr)
      : 0;
  const anyGapReady =
    healthAvailability === "ready" || lifeAvailability === "ready" || criticalAvailability === "ready";
  const gapAvailability: InsuranceMetricAvailability = anyGapReady ? "ready" : "insufficient_data";
  const coverageGapNpr = healthGapNpr + lifeGapNpr + criticalGapNpr;
  calculationSteps.push(
    gapAvailability === "ready"
      ? `Gaps: health ${formatNprCompact(healthGapNpr)} + life ${formatNprCompact(lifeGapNpr)} + critical ${formatNprCompact(criticalGapNpr)} (recommended − existing active cover) = ${formatNprCompact(coverageGapNpr)}.`
      : "Gaps: not enough information to compare recommended vs existing cover.",
  );

  // --- Premium guidance from income + gap severity ---
  const premiumAvailability: InsuranceMetricAvailability = monthlyIncome > 0 ? "ready" : "insufficient_data";
  let recommendedMonthlyPremiumNpr = 0;
  if (premiumAvailability === "ready") {
    const totalRecommended =
      (healthAvailability === "ready" ? recommendedHealthCoverageNpr : 0) +
      (lifeAvailability === "ready" ? recommendedLifeCoverageNpr : 0) +
      (criticalAvailability === "ready" ? recommendedCriticalIllnessNpr : 0);
    const gapRatio = totalRecommended > 0 ? clamp(coverageGapNpr / totalRecommended, 0, 1) : 0;
    const premiumPct = PREMIUM_BASE_PCT + (PREMIUM_MAX_PCT - PREMIUM_BASE_PCT) * gapRatio;
    recommendedMonthlyPremiumNpr = Math.round(monthlyIncome * premiumPct);
    calculationSteps.push(
      `Monthly premium guidance: ${(premiumPct * 100).toFixed(1)}% of monthly income (1–2% educational band, scaled by coverage gap) = ${formatNprCompact(recommendedMonthlyPremiumNpr)}/mo.`,
    );
  } else {
    calculationSteps.push("Monthly premium guidance: not enough information (need monthly income).");
  }

  // --- Protection score ---
  const scoreAvailability: InsuranceMetricAvailability =
    healthAvailability === "ready" || lifeAvailability === "ready" ? "ready" : "insufficient_data";
  let protectionScorePct = 0;
  if (scoreAvailability === "ready") {
    let weightSum = 0;
    let weighted = 0;
    if (healthAvailability === "ready") {
      const ratio =
        recommendedHealthCoverageNpr > 0
          ? clamp(currentHealthCoverageNpr / recommendedHealthCoverageNpr, 0, 1.15)
          : 1;
      weighted += ratio * SCORE_HEALTH_WEIGHT;
      weightSum += SCORE_HEALTH_WEIGHT;
    }
    if (lifeAvailability === "ready") {
      const ratio =
        recommendedLifeCoverageNpr > 0
          ? clamp(currentLifeCoverageNpr / recommendedLifeCoverageNpr, 0, 1.15)
          : 1;
      weighted += ratio * SCORE_LIFE_WEIGHT;
      weightSum += SCORE_LIFE_WEIGHT;
    }
    if (criticalAvailability === "ready") {
      const ratio =
        recommendedCriticalIllnessNpr > 0
          ? clamp(currentCriticalCoverageNpr / recommendedCriticalIllnessNpr, 0, 1.15)
          : 1;
      weighted += ratio * SCORE_CRITICAL_WEIGHT;
      weightSum += SCORE_CRITICAL_WEIGHT;
    }
    // Max coverage contribution is 88 pts (32+42+14) before resilience boosts.
    const coveragePoints = weightSum > 0 ? (weighted / weightSum) * 88 : 0;
    const emergencyBoost =
      inputs.emergencyFundMonths == null
        ? 0
        : clamp(inputs.emergencyFundMonths / 6, 0, 1.2) * EMERGENCY_BOOST_MAX;
    const fireBoost =
      inputs.fireProgressPct == null ? 0 : clamp(inputs.fireProgressPct / 100, 0, 1) * FIRE_BOOST_MAX;
    const ssfBoost = inputs.ssfMonthlyContributionNpr > 0 ? SSF_BOOST : 0;
    const returnBoost =
      inputs.returnReadinessPct == null
        ? 0
        : clamp(inputs.returnReadinessPct / 100, 0, 1) * RETURN_BOOST_MAX;
    protectionScorePct = Math.round(
      clamp(coveragePoints + emergencyBoost + fireBoost + ssfBoost + returnBoost, 0, 100),
    );
    calculationSteps.push(
      `Protection score: coverage ratios (health/life/critical vs your need) + emergency/FIRE/SSF/return resilience boosts = ${protectionScorePct}%.`,
    );
  } else {
    calculationSteps.push(
      "Protection score: not enough information (need income or expenses, plus age for full life scoring).",
    );
  }

  const uniqueMissing: string[] = [];
  if (healthAvailability !== "ready") uniqueMissing.push("monthly income or living expenses");
  if (lifeAvailability !== "ready") {
    if (monthlyIncome <= 0) uniqueMissing.push("monthly income");
    if (age == null) uniqueMissing.push("current age");
  } else if (premiumAvailability !== "ready" || criticalAvailability !== "ready") {
    if (monthlyIncome <= 0) uniqueMissing.push("monthly income");
  }

  // If absolutely nothing computable, return empty shell with clear messaging.
  if (scoreAvailability === "insufficient_data" && healthAvailability === "insufficient_data") {
    return emptyRecommendation(
      policies,
      uniqueMissing.length > 0 ? uniqueMissing : missingInputs,
      "FIRE Nepal could not estimate cover because required inputs are missing.",
      calculationSteps,
    );
  }

  const badge = protectionBadge(protectionScorePct, scoreAvailability === "ready");
  const risk = riskLevel(
    protectionScorePct,
    scoreAvailability === "ready",
    lifeGapNpr,
    healthGapNpr,
    annualIncome,
  );

  let aiSummary = "Coverage looks aligned with your current inputs.";
  if (scoreAvailability !== "ready") {
    aiSummary = "Not enough information for a full protection score — complete age and income.";
  } else if (lifeAvailability === "ready" && lifeGapNpr > healthGapNpr && lifeGapNpr > 0) {
    aiSummary = `Life cover gap of ${formatNprCompact(lifeGapNpr)} based on income replacement and liabilities.`;
  } else if (healthAvailability === "ready" && healthGapNpr > 0) {
    aiSummary = `Health cover gap of ${formatNprCompact(healthGapNpr)} for your household medical buffer.`;
  } else if (criticalAvailability === "ready" && criticalGapNpr > 0 && lifeGapNpr <= 0) {
    aiSummary = `Critical illness gap of ${formatNprCompact(criticalGapNpr)} after deducting existing cover.`;
  } else if (protectionScorePct >= 88) {
    aiSummary = "Your tracked cover is close to the educational need from your inputs.";
  } else if (protectionScorePct >= 72) {
    aiSummary = "Strong cover vs your inputs — review small gaps before return.";
  } else {
    aiSummary = "Protection score needs attention relative to your income and household.";
  }

  const suggestionIncreaseLifeNpr = lifeAvailability === "ready" && lifeGapNpr > 0 ? roundToLakh(lifeGapNpr) : 0;
  const suggestionTitle =
    gapAvailability === "ready" && coverageGapNpr > 0 ? "Need more protection?" : "Stay on top of renewals";
  const suggestionBody =
    suggestionIncreaseLifeNpr > 0
      ? `Based on income replacement, liabilities, and dependents — minus liquid assets and existing life cover — FIRE Nepal estimates a life gap of ${formatNprCompact(suggestionIncreaseLifeNpr)}. Educational only; compare policies yourself.`
      : healthAvailability === "ready" && healthGapNpr > 0
        ? `Based on your household medical buffer and existing health cover, the estimated health gap is ${formatNprCompact(healthGapNpr)}. Educational only.`
        : gapAvailability === "ready" && coverageGapNpr > 0
          ? `Estimated total gap across health, life, and critical illness is ${formatNprCompact(coverageGapNpr)} after deducting existing cover.`
          : uniqueMissing.length > 0
            ? `Complete missing fields (${uniqueMissing.join(", ")}) for a fuller estimate. Meanwhile, review renewals and nominees.`
            : "Your tracked cover matches the educational need from your inputs. Review renewals and nominees periodically.";

  const howCalculated = [
    "Needs are derived from your income, expenses, age, dependents, liabilities, liquid assets, return timeline, and existing policies.",
    "Life ≈ income replacement to working horizon + debt + dependent support − liquid assets; gaps subtract existing life cover.",
    "Health ≈ household medical buffer from expenses/income" +
      (yearsToReturn != null && yearsToReturn <= RETURN_NEAR_YEARS
        ? ", plus a return-to-Nepal healthcare transition buffer."
        : "."),
    INSURANCE_METHODOLOGY_DISCLAIMER,
  ].join(" ");

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
    healthAvailability,
    lifeAvailability,
    criticalAvailability,
    incomeProtectionAvailability,
    premiumAvailability,
    scoreAvailability,
    gapAvailability,
    missingInputs: uniqueMissing,
    howCalculated,
    calculationSteps,
    methodologyDisclaimer: INSURANCE_METHODOLOGY_DISCLAIMER,
  };
}

export function hasAdequateHealthInsurance(policies: InsurancePolicy[], recommendedHealthNpr: number): boolean {
  if (!Number.isFinite(recommendedHealthNpr) || recommendedHealthNpr <= 0) return false;
  const current = sumCoverageByType(policies, "health");
  return current >= recommendedHealthNpr * 0.7 && current > 0;
}

export function hasAdequateLifeInsurance(policies: InsurancePolicy[], recommendedLifeNpr: number): boolean {
  if (!Number.isFinite(recommendedLifeNpr) || recommendedLifeNpr <= 0) return false;
  const current = sumCoverageByType(policies, "life");
  return current >= recommendedLifeNpr * 0.7 && current > 0;
}

/** Test helpers — exported for scenario verification only. */
export const INSURANCE_ENGINE_CONSTANTS = {
  WORKING_HORIZON_AGE,
  MIN_REPLACEMENT_YEARS,
  MAX_REPLACEMENT_YEARS,
  DEPENDENT_SUPPORT_YEARS,
  HEALTH_EXPENSE_SHARE,
  HEALTH_INCOME_SHARE,
  RETURN_HEALTH_SHARE,
  RETURN_NEAR_YEARS,
  CRITICAL_INCOME_MULT_YOUNG,
  CRITICAL_INCOME_MULT_DEFAULT,
  CRITICAL_AGE_THRESHOLD,
  INCOME_PROTECTION_MONTHS,
  INCOME_PROTECTION_PCT,
  PREMIUM_BASE_PCT,
  PREMIUM_MAX_PCT,
} as const;
