#!/usr/bin/env node
/**
 * Emergency Fund 3.0 calculation fixtures + audit fixes.
 * Run: npx tsx --test scripts/emergency-fund-engine.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeBudgetForEmergencyFund,
  plannedEmergencyContributionFromBudget,
  resolveMonthlyProtectionBasis,
} from "../src/lib/emergency-fund/budget-integration.ts";
import {
  buildUpcomingAnnualPayments,
  calendarDaysUntilDue,
  resolveAnnualPaymentStatus,
} from "../src/lib/emergency-fund/annual-payments.ts";
import {
  computeDeadlineFundingPlan,
  computeEmergencyFundCore,
  computeMonthlyFundingPlan,
} from "../src/lib/emergency-fund/calculations.ts";
import { runEmergencySimulation } from "../src/lib/emergency-fund/simulator.ts";
import { computeEmergencyFundPlan } from "../src/lib/emergency-fund-plan.ts";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";

function budget({
  id,
  name = id,
  category,
  period,
  amountNpr,
  monthlyBudgetNpr,
}) {
  const monthly =
    monthlyBudgetNpr ?? (period === "Yearly" ? Math.round(amountNpr / 12) : amountNpr);
  return {
    id,
    name,
    icon: "💼",
    category,
    period,
    amountNpr,
    monthlyBudgetNpr: monthly,
    monthlySpentNpr: 0,
    daysRemaining: period === "Yearly" ? 365 : 30,
    gradient: "from-emerald-300 to-lime-300",
    notes: "",
    notificationSettings: {
      "50% used": true,
      "75% used": true,
      "90% used": true,
      "100% used": true,
      "Overspend Alert": true,
    },
    aiRecommendation: null,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function approx(actual, expected, tol = 0.02) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${expected}, got ${actual}`,
  );
}

describe("Audit Case A — independent yearly obligations included exactly", () => {
  it("uses exact yearly/12 for a 119000 monthly + 275109 yearly fixture", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", name: "Monthly total", category: "Other", period: "Monthly", amountNpr: 119_000 }),
      budget({ id: "y1", name: "Annual obligations", category: "Insurance", period: "Yearly", amountNpr: 275_109 }),
    ]);

    approx(breakdown.grossMonthlyBudgetNpr, 119_000);
    approx(breakdown.yearlyBudgetTotalNpr, 275_109);
    approx(breakdown.annualMonthlyEquivalentNpr, 275_109 / 12);
    approx(breakdown.additionalAnnualMonthlyAllocationsNpr, 275_109 / 12);
    approx(breakdown.totalNormalizedBudgetNpr, 141_925.75);
    approx(breakdown.effectiveMonthlyBudgetNpr, 141_925.75);
    assert.equal(breakdown.annualAllocationsAlreadyIncludedNpr, 0);
    assert.equal(breakdown.isProvisional, false);

    // Budget Planner stores Math.round(amount/12) per yearly row.
    // Summing per-row rounds can drift ~NPR 1 vs exact total/12 (and vs a single rounded total).
    assert.equal(breakdown.roundedAnnualMonthlyEquivalentNpr, Math.round(275_109 / 12)); // 22,926
    approx(119_000 + breakdown.roundedAnnualMonthlyEquivalentNpr, 141_926);

    const splitYearly = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Other", period: "Monthly", amountNpr: 119_000 }),
      budget({ id: "y-a", category: "Insurance", period: "Yearly", amountNpr: 126_000 }),
      budget({ id: "y-b", category: "Education", period: "Yearly", amountNpr: 149_109 }),
    ]);
    // 126000/12 exact = 10500; 149109/12 exact = 12425.75; sum = 22925.75
    approx(splitYearly.annualMonthlyEquivalentNpr, 22_925.75);
    approx(splitYearly.totalNormalizedBudgetNpr, 141_925.75);
    // Per-row rounded: round(126000/12)+round(149109/12) = 10500+12426 = 22926
    // Some Budget Planner displays historically showed 141,927 when additional
    // category-level rounding paths differed; exact EF math stays at 141,925.75.
    assert.equal(splitYearly.roundedAnnualMonthlyEquivalentNpr, 10_500 + 12_426);
  });
});

describe("Audit Case B — Emergency contribution excluded from Full Lifestyle", () => {
  it("excludes NPR 10,000 Emergency category from protection basis", () => {
    const records = [
      budget({ id: "m-live", name: "Living", category: "Rent", period: "Monthly", amountNpr: 109_000 }),
      budget({
        id: "m-ef",
        name: "Emergency Fund",
        category: "Emergency",
        period: "Monthly",
        amountNpr: 10_000,
      }),
      budget({ id: "y1", name: "Annual obligations", category: "Insurance", period: "Yearly", amountNpr: 275_109 }),
    ];
    const breakdown = normalizeBudgetForEmergencyFund(records);
    approx(breakdown.grossMonthlyBudgetNpr, 119_000);
    approx(breakdown.emergencyFundContributionExcludedNpr, 10_000);
    approx(breakdown.totalNormalizedBudgetNpr, 131_925.75);
    assert.equal(plannedEmergencyContributionFromBudget(breakdown), 10_000);

    const full = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    approx(full.finalMonthlyProtectionBasisNpr, 131_925.75);

    const reserve = 120_000;
    const three = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      protectionMonths: 3,
      designatedReserveNpr: reserve,
    });
    const six = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      protectionMonths: 6,
      designatedReserveNpr: reserve,
    });
    const nine = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      protectionMonths: 9,
      designatedReserveNpr: reserve,
    });
    const twelve = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      protectionMonths: 12,
      designatedReserveNpr: reserve,
    });

    approx(three.emergencyFundTargetNpr, 395_777.25);
    approx(six.emergencyFundTargetNpr, 791_554.5);
    approx(nine.emergencyFundTargetNpr, 1_187_331.75);
    approx(twelve.emergencyFundTargetNpr, 1_583_109);
    approx(six.remainingShortfallNpr, 671_554.5);
    approx(six.fundingProgressPct ?? 0, 15.16, 0.02);
    approx(six.safetyRunwayMonths ?? 0, 0.91, 0.01);

    // Importing planned contribution must not change reserve or protection basis.
    assert.equal(plannedEmergencyContributionFromBudget(breakdown), 10_000);
    const afterImport = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    approx(afterImport.finalMonthlyProtectionBasisNpr, 131_925.75);
  });
});

describe("Audit Case C — Essential Only exact basis", () => {
  it("sums only selected essential lines from the same normalized dataset", () => {
    const records = [
      budget({ id: "rent", name: "Home Rent", category: "Rent", period: "Monthly", amountNpr: 14_000 }),
      budget({ id: "school", name: "School Fee", category: "Education", period: "Monthly", amountNpr: 10_000 }),
      budget({ id: "home", name: "Home Expenses", category: "Utilities", period: "Monthly", amountNpr: 20_000 }),
      budget({
        id: "life",
        name: "Life Insurance",
        category: "Insurance",
        period: "Yearly",
        amountNpr: 126_000,
      }),
      budget({ id: "fun", name: "Entertainment", category: "Entertainment", period: "Monthly", amountNpr: 50_000 }),
      budget({
        id: "ef",
        name: "Emergency Fund",
        category: "Emergency",
        period: "Monthly",
        amountNpr: 10_000,
      }),
    ];
    const breakdown = normalizeBudgetForEmergencyFund(records);
    // Life insurance monthly exact = 10500; eligible and selectable.
    const life = breakdown.protectionEligibleLines.find((l) => l.id === "life");
    assert.ok(life);
    assert.equal(life.inclusion, "included");
    approx(life.monthlyEquivalentNpr, 10_500);

    // Emergency contribution never enters essential selectable set.
    assert.ok(!breakdown.protectionEligibleLines.some((l) => l.id === "ef"));

    const essential = resolveMonthlyProtectionBasis(breakdown, "essential_survival", [
      "rent",
      "school",
      "home",
      "life",
    ]);
    approx(essential.finalMonthlyProtectionBasisNpr, 54_500);

    const three = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 54_500,
      protectionMonths: 3,
      designatedReserveNpr: 120_000,
    });
    const six = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 54_500,
      protectionMonths: 6,
      designatedReserveNpr: 120_000,
    });
    const nine = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 54_500,
      protectionMonths: 9,
      designatedReserveNpr: 120_000,
    });
    const twelve = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 54_500,
      protectionMonths: 12,
      designatedReserveNpr: 120_000,
    });

    assert.equal(three.emergencyFundTargetNpr, 163_500);
    assert.equal(six.emergencyFundTargetNpr, 327_000);
    assert.equal(nine.emergencyFundTargetNpr, 490_500);
    assert.equal(twelve.emergencyFundTargetNpr, 654_000);
  });
});

describe("Audit Case D — already included annual allocations", () => {
  it("does not re-add yearly premium when monthly allocation matches yearly/12", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m-ins", category: "Insurance", period: "Monthly", amountNpr: 10_000 }),
      budget({ id: "m-rent", category: "Rent", period: "Monthly", amountNpr: 50_000 }),
      budget({ id: "y-ins", category: "Insurance", period: "Yearly", amountNpr: 120_000 }),
    ]);
    assert.equal(breakdown.annualAllocationsAlreadyIncludedNpr, 10_000);
    assert.equal(breakdown.additionalAnnualMonthlyAllocationsNpr, 0);
    assert.equal(breakdown.totalNormalizedBudgetNpr, 60_000);
  });
});

describe("Audit Case E — planned EF contribution never raises expense or reserve", () => {
  it("keeps protection basis and reserve unchanged when contribution is imported to funding plan", () => {
    const cashflow = { ...defaultCashflowState(), emergencyCashReserve: 120_000 };
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 100_000 }),
      budget({ id: "ef", category: "Emergency", period: "Monthly", amountNpr: 10_000 }),
    ]);
    const full = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    assert.equal(full.finalMonthlyProtectionBasisNpr, 100_000);

    const planBefore = computeEmergencyFundPlan(cashflow, {
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      plannedMonthlyContributionNpr: null,
    });
    const planAfter = computeEmergencyFundPlan(cashflow, {
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      plannedMonthlyContributionNpr: plannedEmergencyContributionFromBudget(breakdown),
    });

    assert.equal(planBefore.recommendedTarget, planAfter.recommendedTarget);
    assert.equal(planBefore.currentAmount, planAfter.currentAmount);
    assert.equal(planAfter.recommendedMonthlyContribution, 10_000);
  });
});

describe("Audit Case F — mode switch does not change reserve", () => {
  it("keeps current reserve identical across Full Lifestyle and Essential modes", () => {
    const cashflow = { ...defaultCashflowState(), emergencyCashReserve: 120_000 };
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "rent", category: "Rent", period: "Monthly", amountNpr: 40_000 }),
      budget({ id: "fun", category: "Entertainment", period: "Monthly", amountNpr: 20_000 }),
    ]);
    const full = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    const essential = resolveMonthlyProtectionBasis(breakdown, "essential_survival", ["rent"]);

    const planFull = computeEmergencyFundPlan(cashflow, {
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
    });
    const planEssential = computeEmergencyFundPlan(cashflow, {
      monthlyProtectionBasisNpr: essential.finalMonthlyProtectionBasisNpr,
    });

    assert.equal(planFull.currentAmount, 120_000);
    assert.equal(planEssential.currentAmount, 120_000);
    assert.notEqual(planFull.recommendedTarget, planEssential.recommendedTarget);
  });
});

describe("Provisional same-category yearly is included, not dropped", () => {
  it("includes mismatched same-category yearly and flags for review", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m-ins", name: "Monthly insurance buffer", category: "Insurance", period: "Monthly", amountNpr: 2_000 }),
      budget({ id: "y-ins", name: "Life Insurance", category: "Insurance", period: "Yearly", amountNpr: 126_000 }),
      budget({ id: "m-rent", name: "Rent", category: "Rent", period: "Monthly", amountNpr: 50_000 }),
    ]);

    approx(breakdown.additionalAnnualMonthlyAllocationsNpr, 10_500);
    approx(breakdown.totalNormalizedBudgetNpr, 62_500);
    assert.equal(breakdown.isProvisional, true);
    assert.equal(breakdown.provisionalLines.length, 1);

    const essential = resolveMonthlyProtectionBasis(breakdown, "essential_survival", ["y-ins", "m-rent"]);
    // Life insurance is selectable because it is included in the canonical dataset.
    approx(essential.finalMonthlyProtectionBasisNpr, 60_500);
  });

  it("persists user already_included decisions and clears provisional state", () => {
    const records = [
      budget({ id: "m-ins", category: "Insurance", period: "Monthly", amountNpr: 2_000 }),
      budget({ id: "y-ins", category: "Insurance", period: "Yearly", amountNpr: 126_000 }),
      budget({ id: "m-rent", category: "Rent", period: "Monthly", amountNpr: 50_000 }),
    ];
    const resolved = normalizeBudgetForEmergencyFund(records, {
      yearlyAllocationDecisions: {
        "y-ins": {
          resolution: "already_included",
          linkedMonthlyRecordId: "m-ins",
          updatedAt: "2026-11-26T00:00:00.000Z",
        },
      },
    });
    assert.equal(resolved.additionalAnnualMonthlyAllocationsNpr, 0);
    assert.equal(resolved.annualAllocationsAlreadyIncludedNpr, 10_500);
    assert.equal(resolved.isProvisional, false);
    approx(resolved.totalNormalizedBudgetNpr, 52_000);
  });

  it("persists explicit separate decision without provisional flag", () => {
    const resolved = normalizeBudgetForEmergencyFund(
      [
        budget({ id: "m-ins", category: "Insurance", period: "Monthly", amountNpr: 2_000 }),
        budget({ id: "y-ins", category: "Insurance", period: "Yearly", amountNpr: 126_000 }),
      ],
      {
        yearlyAllocationDecisions: {
          "y-ins": {
            resolution: "separate",
            updatedAt: "2026-11-26T00:00:00.000Z",
          },
        },
      },
    );
    approx(resolved.additionalAnnualMonthlyAllocationsNpr, 10_500);
    assert.equal(resolved.isProvisional, false);
  });
});

describe("Production readiness — 140k reserve @ 3 months Full Lifestyle", () => {
  it("matches expected shortfall and runway after EF contribution exclusion", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m-live", category: "Rent", period: "Monthly", amountNpr: 109_000 }),
      budget({ id: "m-ef", category: "Emergency", period: "Monthly", amountNpr: 10_000 }),
      budget({ id: "y1", category: "Insurance", period: "Yearly", amountNpr: 275_109 }),
    ]);
    const full = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    approx(full.finalMonthlyProtectionBasisNpr, 131_925.75);

    const three = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: full.finalMonthlyProtectionBasisNpr,
      protectionMonths: 3,
      designatedReserveNpr: 140_000,
    });
    approx(three.emergencyFundTargetNpr, 395_777.25);
    approx(three.remainingShortfallNpr, 255_777.25);
    approx(three.fundingProgressPct ?? 0, 35.37, 0.02);
    approx(three.safetyRunwayMonths ?? 0, 1.06, 0.01);
    assert.equal(three.approximateProtectionDays, 32);
  });
});

describe("Annual payment due-date status", () => {
  it("labels Nov 8 as overdue by 18 days on Nov 26", () => {
    const now = new Date(2026, 10, 26); // Nov 26, 2026 local
    assert.equal(calendarDaysUntilDue("2026-11-08", now), -18);
    const status = resolveAnnualPaymentStatus({
      daysUntil: -18,
      amountNpr: 125_994,
      reservedNpr: 0,
    });
    assert.equal(status.status, "overdue");
    assert.equal(status.statusLabel, "Overdue by 18 days");

    const rows = buildUpcomingAnnualPayments(
      [
        {
          id: "pol-1",
          name: "Annual premium",
          dueDate: "2026-11-08",
          amountNpr: 125_994,
        },
        {
          id: "pol-1",
          name: "Annual premium duplicate",
          dueDate: "2026-11-08",
          amountNpr: 125_994,
        },
      ],
      now,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "overdue");
    assert.equal(rows[0].statusLabel, "Overdue by 18 days");
  });

  it("does not invent paid status without evidence", () => {
    const status = resolveAnnualPaymentStatus({
      daysUntil: 10,
      amountNpr: 100_000,
      reservedNpr: 0,
    });
    assert.equal(status.status, "upcoming");
  });
});

describe("Legacy regression fixtures", () => {
  it("TEST B separate annual obligations still add yearly monthly equivalents", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 141_927 }),
      budget({ id: "y1", category: "Education", period: "Yearly", amountNpr: 144_000 }),
    ]);
    assert.equal(breakdown.annualMonthlyEquivalentNpr, 12_000);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 153_927);
  });

  it("TEST D yearly projection duplication", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 60_000 }),
      budget({ id: "m2", category: "Food", period: "Monthly", amountNpr: 40_000 }),
      budget({ id: "y1", category: "Rent", period: "Yearly", amountNpr: 720_000 }),
      budget({ id: "y2", category: "Food", period: "Yearly", amountNpr: 480_000 }),
    ]);
    assert.equal(breakdown.originalMonthlyBudgetNpr, 100_000);
    assert.equal(breakdown.yearlyBudgetTotalNpr, 1_200_000);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 100_000);
  });

  it("TEST I / J funding plans", () => {
    const plan = computeMonthlyFundingPlan({
      remainingShortfallNpr: 731_562,
      plannedMonthlyContributionNpr: 50_000,
    });
    assert.equal(plan.estimatedMonthsRemaining, 15);

    const deadline = computeDeadlineFundingPlan({
      remainingShortfallNpr: 731_562,
      deadlineMonths: 12,
    });
    assert.equal(deadline.requiredMonthlyContributionNpr, 60_963.5);
  });

  it("TEST K simulator", () => {
    const result = runEmergencySimulation({
      currentReserveNpr: 120_000,
      simulatedMonthlyBudgetNpr: 100_000,
      oneTimeEmergencyCostNpr: 20_000,
    });
    assert.equal(result.availableSimulatedReserveNpr, 100_000);
    assert.equal(result.simulatedSafetyRunwayMonths, 1);
    assert.equal(result.approximateProtectionDays, 30);
  });

  it("TEST L fully funded", () => {
    const core = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 100_000,
      protectionMonths: 6,
      designatedReserveNpr: 700_000,
    });
    assert.equal(core.emergencyFundTargetNpr, 600_000);
    approx(core.fundingProgressPct ?? 0, 116.666, 0.01);
    assert.equal(core.visualFundingProgressPct, 100);
    assert.equal(core.remainingShortfallNpr, 0);
    assert.equal(core.excessReserveNpr, 100_000);
  });

  it("TEST M no budget", () => {
    const breakdown = normalizeBudgetForEmergencyFund([]);
    assert.equal(breakdown.hasBudgetData, false);
    const plan = computeEmergencyFundPlan(
      { ...defaultCashflowState(), emergencyCashReserve: 50_000 },
      { monthlyProtectionBasisNpr: null },
    );
    assert.equal(plan.hasSufficientData, false);
    assert.equal(plan.progressPct, null);
  });
});
