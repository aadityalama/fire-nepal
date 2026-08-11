#!/usr/bin/env node
/**
 * FIRE Nepal Insurance Engine — educational needs analysis scenarios.
 * Run: npx tsx --test scripts/insurance-engine.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeInsuranceRecommendation,
  hasAdequateHealthInsurance,
  hasAdequateLifeInsurance,
  INSURANCE_ENGINE_CONSTANTS,
} from "../src/lib/insurance/insurance-engine.ts";

const C = INSURANCE_ENGINE_CONSTANTS;

function baseInputs(overrides = {}) {
  return {
    monthlyIncomeNpr: 0,
    monthlyExpenseNpr: 0,
    totalSavingsNpr: 0,
    investableNpr: 0,
    liabilitiesNpr: 0,
    emergencyFundMonths: null,
    fireGoalNpr: 0,
    fireProgressPct: null,
    age: null,
    adults: 1,
    children: 0,
    ssfMonthlyContributionNpr: 0,
    yearsToReturn: null,
    returnReadinessPct: null,
    ...overrides,
  };
}

function policy(type, coverageAmountNpr, id = `${type}-${coverageAmountNpr}`) {
  const now = new Date().toISOString();
  return {
    id,
    type,
    provider: "Test Provider",
    coverageAmountNpr,
    premiumNpr: 1000,
    paymentFrequency: "yearly",
    startDate: "2024-01-01",
    expiryDate: "2030-01-01",
    nominee: "",
    familyMembersCovered: [],
    notes: "",
    documentDataUrl: null,
    documentFileName: null,
    status: "active",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function roundToLakh(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / 100_000) * 100_000;
}

describe("insurance engine — missing inputs", () => {
  it("shows insufficient data when income, expenses, and age are missing", () => {
    const rec = computeInsuranceRecommendation([], baseInputs());
    assert.equal(rec.healthAvailability, "insufficient_data");
    assert.equal(rec.lifeAvailability, "insufficient_data");
    assert.equal(rec.criticalAvailability, "insufficient_data");
    assert.equal(rec.premiumAvailability, "insufficient_data");
    assert.equal(rec.scoreAvailability, "insufficient_data");
    assert.equal(rec.protectionBadge, "Incomplete data");
    assert.ok(rec.howCalculated.length > 0);
    assert.ok(rec.methodologyDisclaimer.toLowerCase().includes("not financial"));
    assert.ok(rec.calculationSteps.some((s) => s.toLowerCase().includes("not enough information")));
  });

  it("does not invent a default age of 32", () => {
    const rec = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: 200_000, monthlyExpenseNpr: 80_000 }),
    );
    assert.equal(rec.lifeAvailability, "insufficient_data");
    assert.equal(rec.recommendedLifeCoverageNpr, 0);
    assert.ok(rec.missingInputs.includes("current age"));
    assert.equal(rec.healthAvailability, "ready");
    assert.ok(rec.recommendedHealthCoverageNpr > 0);
  });
});

describe("scenario 1 — single worker, no dependents", () => {
  it("derives life from income replacement − liquid assets (no hard 5 Cr floor/cap)", () => {
    const monthlyIncome = 250_000;
    const age = 30;
    const savings = 1_000_000;
    const investable = 500_000;
    const annual = monthlyIncome * 12;
    const years = Math.min(
      C.MAX_REPLACEMENT_YEARS,
      Math.max(C.MIN_REPLACEMENT_YEARS, C.WORKING_HORIZON_AGE - age),
    );
    const expectedLife = roundToLakh(annual * years - savings - investable);

    const rec = computeInsuranceRecommendation(
      [],
      baseInputs({
        monthlyIncomeNpr: monthlyIncome,
        monthlyExpenseNpr: 100_000,
        totalSavingsNpr: savings,
        investableNpr: investable,
        age,
        adults: 1,
        children: 0,
        yearsToReturn: 12,
      }),
    );

    assert.equal(rec.lifeAvailability, "ready");
    assert.equal(rec.recommendedLifeCoverageNpr, expectedLife);
    assert.ok(expectedLife !== 50_000_000, "must not be arbitrary 5 Cr clamp");
    assert.equal(rec.healthAvailability, "ready");
    // 1 adult household: max(expenses*0.75, income*0.3) * 1
    const perPerson = Math.max(100_000 * 12 * C.HEALTH_EXPENSE_SHARE, annual * C.HEALTH_INCOME_SHARE);
    assert.equal(rec.recommendedHealthCoverageNpr, roundToLakh(perPerson));
    assert.equal(rec.coverageGapNpr, rec.healthGapNpr + rec.lifeGapNpr + rec.criticalGapNpr);
    assert.equal(rec.lifeGapNpr, expectedLife);
    assert.ok(rec.calculationSteps.some((s) => s.startsWith("Life:")));
    assert.ok(rec.recommendedMonthlyPremiumNpr > 0);
    assert.ok(rec.recommendedMonthlyPremiumNpr <= monthlyIncome * C.PREMIUM_MAX_PCT + 1);
  });
});

describe("scenario 2 — worker with spouse and children", () => {
  it("scales health by household and adds dependent support to life need", () => {
    const monthlyIncome = 300_000;
    const monthlyExpense = 150_000;
    const age = 35;
    const adults = 2;
    const children = 2;
    const dependents = adults - 1 + children; // 3
    const annual = monthlyIncome * 12;
    const annualExp = monthlyExpense * 12;
    const years = Math.min(
      C.MAX_REPLACEMENT_YEARS,
      Math.max(C.MIN_REPLACEMENT_YEARS, C.WORKING_HORIZON_AGE - age),
    );
    const incomeReplacement = annual * years;
    const dependentSupport = dependents * annualExp * C.DEPENDENT_SUPPORT_YEARS;
    const expectedLife = roundToLakh(incomeReplacement + dependentSupport);

    const household = adults + children;
    const perPerson = Math.max(annualExp * C.HEALTH_EXPENSE_SHARE, annual * C.HEALTH_INCOME_SHARE);
    const expectedHealth = roundToLakh(perPerson * household);

    const rec = computeInsuranceRecommendation(
      [],
      baseInputs({
        monthlyIncomeNpr: monthlyIncome,
        monthlyExpenseNpr: monthlyExpense,
        age,
        adults,
        children,
        yearsToReturn: 10,
      }),
    );

    assert.equal(rec.recommendedLifeCoverageNpr, expectedLife);
    assert.equal(rec.recommendedHealthCoverageNpr, expectedHealth);
    assert.ok(rec.recommendedLifeCoverageNpr > annual * years, "dependent support increases life need");
    assert.ok(rec.howCalculated.toLowerCase().includes("dependent"));
  });
});

describe("scenario 3 — worker with significant debt", () => {
  it("adds outstanding liabilities into life cover need", () => {
    const monthlyIncome = 200_000;
    const age = 40;
    const liabilities = 5_000_000;
    const annual = monthlyIncome * 12;
    const years = Math.min(
      C.MAX_REPLACEMENT_YEARS,
      Math.max(C.MIN_REPLACEMENT_YEARS, C.WORKING_HORIZON_AGE - age),
    );
    const withoutDebt = roundToLakh(annual * years);
    const withDebt = roundToLakh(annual * years + liabilities);

    const base = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: monthlyIncome, monthlyExpenseNpr: 80_000, age, liabilitiesNpr: 0 }),
    );
    const indebted = computeInsuranceRecommendation(
      [],
      baseInputs({
        monthlyIncomeNpr: monthlyIncome,
        monthlyExpenseNpr: 80_000,
        age,
        liabilitiesNpr: liabilities,
      }),
    );

    assert.equal(base.recommendedLifeCoverageNpr, withoutDebt);
    assert.equal(indebted.recommendedLifeCoverageNpr, withDebt);
    assert.equal(indebted.recommendedLifeCoverageNpr - base.recommendedLifeCoverageNpr, roundToLakh(liabilities) || liabilities);
    // Difference should equal liabilities (already round numbers)
    assert.equal(indebted.recommendedLifeCoverageNpr - base.recommendedLifeCoverageNpr, liabilities);
    assert.ok(indebted.calculationSteps.some((s) => s.includes("liabilities")));
  });
});

describe("scenario 4 — substantial existing life/health coverage", () => {
  it("deducts existing cover from gaps and raises protection score", () => {
    const inputs = baseInputs({
      monthlyIncomeNpr: 280_000,
      monthlyExpenseNpr: 120_000,
      age: 32,
      adults: 2,
      children: 1,
      emergencyFundMonths: 6,
      fireProgressPct: 40,
      yearsToReturn: 8,
    });

    const uncovered = computeInsuranceRecommendation([], inputs);
    const policies = [
      policy("health", uncovered.recommendedHealthCoverageNpr),
      policy("life", uncovered.recommendedLifeCoverageNpr),
      policy("critical_illness", uncovered.recommendedCriticalIllnessNpr),
    ];
    const covered = computeInsuranceRecommendation(policies, inputs);

    assert.equal(covered.healthGapNpr, 0);
    assert.equal(covered.lifeGapNpr, 0);
    assert.equal(covered.criticalGapNpr, 0);
    assert.equal(covered.coverageGapNpr, 0);
    assert.equal(covered.currentHealthCoverageNpr, uncovered.recommendedHealthCoverageNpr);
    assert.equal(covered.currentLifeCoverageNpr, uncovered.recommendedLifeCoverageNpr);
    assert.ok(covered.protectionScorePct > uncovered.protectionScorePct);
    assert.equal(hasAdequateHealthInsurance(policies, covered.recommendedHealthCoverageNpr), true);
    assert.equal(hasAdequateLifeInsurance(policies, covered.recommendedLifeCoverageNpr), true);
    // Expired policies must not count
    const expiredOnly = computeInsuranceRecommendation(
      [{ ...policy("life", 50_000_000, "expired-life"), status: "expired" }],
      inputs,
    );
    assert.equal(expiredOnly.currentLifeCoverageNpr, 0);
    assert.equal(expiredOnly.lifeGapNpr, uncovered.lifeGapNpr);
  });
});

describe("scenario 5 — worker close to returning to Nepal", () => {
  it("adds return healthcare transition buffer when yearsToReturn ≤ 5", () => {
    const shared = {
      monthlyIncomeNpr: 220_000,
      monthlyExpenseNpr: 90_000,
      age: 45,
      adults: 2,
      children: 0,
    };
    const far = computeInsuranceRecommendation([], baseInputs({ ...shared, yearsToReturn: 12 }));
    const near = computeInsuranceRecommendation([], baseInputs({ ...shared, yearsToReturn: 3 }));

    assert.ok(near.recommendedHealthCoverageNpr > far.recommendedHealthCoverageNpr);
    const annual = 220_000 * 12;
    const annualExp = 90_000 * 12;
    const perPerson = Math.max(annualExp * C.HEALTH_EXPENSE_SHARE, annual * C.HEALTH_INCOME_SHARE);
    const household = 2;
    const expectedFar = roundToLakh(perPerson * household);
    const expectedNear = roundToLakh(perPerson * household + perPerson * C.RETURN_HEALTH_SHARE);
    assert.equal(far.recommendedHealthCoverageNpr, expectedFar);
    assert.equal(near.recommendedHealthCoverageNpr, expectedNear);
    assert.ok(near.calculationSteps.some((s) => s.toLowerCase().includes("return-to-nepal")));
    // Life replacement years shorten as age rises (45 → 15 years, capped by max 20)
    assert.equal(near.lifeAvailability, "ready");
    const years = Math.min(C.MAX_REPLACEMENT_YEARS, Math.max(C.MIN_REPLACEMENT_YEARS, C.WORKING_HORIZON_AGE - 45));
    assert.equal(years, 15);
  });
});

describe("premium and critical — input-driven", () => {
  it("premium stays within 1–2% of the user's monthly income", () => {
    const monthlyIncome = 180_000;
    const rec = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: monthlyIncome, monthlyExpenseNpr: 70_000, age: 33 }),
    );
    assert.ok(rec.recommendedMonthlyPremiumNpr >= Math.round(monthlyIncome * C.PREMIUM_BASE_PCT));
    assert.ok(rec.recommendedMonthlyPremiumNpr <= Math.round(monthlyIncome * C.PREMIUM_MAX_PCT));
  });

  it("critical illness uses age-adjusted income multiple without hard 15 Lakh floor", () => {
    const young = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: 50_000, monthlyExpenseNpr: 20_000, age: 28 }),
    );
    const older = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: 50_000, monthlyExpenseNpr: 20_000, age: 45 }),
    );
    assert.equal(young.recommendedCriticalIllnessNpr, roundToLakh(50_000 * 12 * C.CRITICAL_INCOME_MULT_YOUNG));
    assert.equal(older.recommendedCriticalIllnessNpr, roundToLakh(50_000 * 12 * C.CRITICAL_INCOME_MULT_DEFAULT));
    assert.notEqual(young.recommendedCriticalIllnessNpr, 1_500_000);
  });

  it("hasAdequate* returns false when recommended is zero / unknown", () => {
    assert.equal(hasAdequateHealthInsurance([policy("health", 1_000_000)], 0), false);
    assert.equal(hasAdequateLifeInsurance([policy("life", 1_000_000)], 0), false);
  });
});

describe("dynamic updates", () => {
  it("recomputes when income or dependents change", () => {
    const low = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: 100_000, monthlyExpenseNpr: 40_000, age: 30 }),
    );
    const high = computeInsuranceRecommendation(
      [],
      baseInputs({ monthlyIncomeNpr: 400_000, monthlyExpenseNpr: 40_000, age: 30 }),
    );
    const family = computeInsuranceRecommendation(
      [],
      baseInputs({
        monthlyIncomeNpr: 100_000,
        monthlyExpenseNpr: 40_000,
        age: 30,
        adults: 2,
        children: 2,
      }),
    );
    assert.ok(high.recommendedLifeCoverageNpr > low.recommendedLifeCoverageNpr);
    assert.ok(family.recommendedHealthCoverageNpr > low.recommendedHealthCoverageNpr);
    assert.ok(family.recommendedLifeCoverageNpr > low.recommendedLifeCoverageNpr);
  });
});
