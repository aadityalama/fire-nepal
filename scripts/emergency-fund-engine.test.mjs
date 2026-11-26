#!/usr/bin/env node
/**
 * Emergency Fund 3.0 calculation fixtures (TEST A–M).
 * Run: npx tsx --test scripts/emergency-fund-engine.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeBudgetForEmergencyFund,
  resolveMonthlyProtectionBasis,
} from "../src/lib/emergency-fund/budget-integration.ts";
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

describe("TEST A — Full Lifestyle Protection", () => {
  it("sizes targets from effective monthly budget already including annual allocations", () => {
    // Monthly total 141,927 with annual allocations already included → yearly empty.
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 141_927 }),
    ]);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 141_927);

    const reserve = 120_000;
    const six = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 6,
      designatedReserveNpr: reserve,
    });
    const twelve = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 12,
      designatedReserveNpr: reserve,
    });

    assert.equal(six.emergencyFundTargetNpr, 851_562);
    assert.equal(twelve.emergencyFundTargetNpr, 1_703_124);
    assert.equal(computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 1,
      designatedReserveNpr: reserve,
    }).emergencyFundTargetNpr, 141_927);
    assert.equal(computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 3,
      designatedReserveNpr: reserve,
    }).emergencyFundTargetNpr, 425_781);
    assert.equal(computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 9,
      designatedReserveNpr: reserve,
    }).emergencyFundTargetNpr, 1_277_343);

    assert.equal(six.remainingShortfallNpr, 731_562);
    assert.equal(twelve.remainingShortfallNpr, 1_583_124);
    assert.ok(Math.abs((six.fundingProgressPct ?? 0) - 14.09) < 0.02);
    assert.ok(Math.abs((twelve.fundingProgressPct ?? 0) - 7.05) < 0.02);
    assert.ok(Math.abs((six.safetyRunwayMonths ?? 0) - 0.845) < 0.01);
    assert.equal(six.approximateProtectionDays, 25);
  });
});

describe("TEST B — Separate annual obligations", () => {
  it("adds yearly monthly equivalents not already included", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 141_927 }),
      budget({ id: "y1", category: "Education", period: "Yearly", amountNpr: 144_000 }),
    ]);
    assert.equal(breakdown.annualMonthlyEquivalentNpr, 12_000);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 153_927);

    assert.equal(
      computeEmergencyFundCore({
        monthlyProtectionBasisNpr: breakdown.effectiveMonthlyBudgetNpr,
        protectionMonths: 3,
        designatedReserveNpr: 0,
      }).emergencyFundTargetNpr,
      461_781,
    );
    assert.equal(
      computeEmergencyFundCore({
        monthlyProtectionBasisNpr: breakdown.effectiveMonthlyBudgetNpr,
        protectionMonths: 6,
        designatedReserveNpr: 0,
      }).emergencyFundTargetNpr,
      923_562,
    );
    assert.equal(
      computeEmergencyFundCore({
        monthlyProtectionBasisNpr: breakdown.effectiveMonthlyBudgetNpr,
        protectionMonths: 9,
        designatedReserveNpr: 0,
      }).emergencyFundTargetNpr,
      1_385_343,
    );
    assert.equal(
      computeEmergencyFundCore({
        monthlyProtectionBasisNpr: breakdown.effectiveMonthlyBudgetNpr,
        protectionMonths: 12,
        designatedReserveNpr: 0,
      }).emergencyFundTargetNpr,
      1_847_124,
    );
  });
});

describe("TEST C — Annual insurance double counting", () => {
  it("does not re-add yearly premium when monthly allocation already matches yearly/12", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m-ins", category: "Insurance", period: "Monthly", amountNpr: 10_000 }),
      budget({ id: "m-rent", category: "Rent", period: "Monthly", amountNpr: 50_000 }),
      budget({ id: "y-ins", category: "Insurance", period: "Yearly", amountNpr: 120_000 }),
    ]);
    assert.equal(breakdown.annualAllocationsAlreadyIncludedNpr, 10_000);
    assert.equal(breakdown.additionalAnnualMonthlyAllocationsNpr, 0);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 60_000);
  });
});

describe("TEST D — Yearly projection duplication", () => {
  it("keeps effective monthly at monthly total when yearly is a 12× projection", () => {
    const breakdown = normalizeBudgetForEmergencyFund([
      budget({ id: "m1", category: "Rent", period: "Monthly", amountNpr: 60_000 }),
      budget({ id: "m2", category: "Food", period: "Monthly", amountNpr: 40_000 }),
      budget({ id: "y1", category: "Rent", period: "Yearly", amountNpr: 720_000 }),
      budget({ id: "y2", category: "Food", period: "Yearly", amountNpr: 480_000 }),
    ]);
    assert.equal(breakdown.originalMonthlyBudgetNpr, 100_000);
    assert.equal(breakdown.yearlyBudgetTotalNpr, 1_200_000);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 100_000);
    assert.ok(breakdown.yearlyProjectionDuplicateNpr > 0);
  });
});

describe("TEST E — Essential Survival mode", () => {
  it("uses only selected essential categories", () => {
    const records = [
      budget({ id: "rent", category: "Rent", period: "Monthly", amountNpr: 60_000 }),
      budget({ id: "food", category: "Food", period: "Monthly", amountNpr: 40_000 }),
      budget({ id: "fun", category: "Entertainment", period: "Monthly", amountNpr: 50_000 }),
    ];
    const breakdown = normalizeBudgetForEmergencyFund(records);
    assert.equal(breakdown.effectiveMonthlyBudgetNpr, 150_000);

    const full = resolveMonthlyProtectionBasis(breakdown, "full_lifestyle", []);
    assert.equal(full.monthlyProtectionBasisNpr, 150_000);

    const essential = resolveMonthlyProtectionBasis(breakdown, "essential_survival", [
      "rent",
      "food",
    ]);
    assert.equal(essential.monthlyProtectionBasisNpr, 100_000);

    const fullCore = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 150_000,
      protectionMonths: 6,
      designatedReserveNpr: 120_000,
    });
    const essentialCore = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 100_000,
      protectionMonths: 6,
      designatedReserveNpr: 120_000,
    });
    assert.equal(fullCore.emergencyFundTargetNpr, 900_000);
    assert.equal(essentialCore.emergencyFundTargetNpr, 600_000);
    assert.equal(essentialCore.fundingProgressPct, 20);
    assert.equal(essentialCore.safetyRunwayMonths, 1.2);
  });
});

describe("TEST F/G — Income and expense independence", () => {
  it("does not change Emergency Fund when cashflow income/expenses change", () => {
    const basis = 141_927;
    const cashflowA = {
      ...defaultCashflowState(),
      emergencyCashReserve: 120_000,
      income: { ...defaultCashflowState().income, salary: 100_000 },
      expenses: { ...defaultCashflowState().expenses, rent: 50_000 },
    };
    const cashflowB = {
      ...cashflowA,
      income: { ...cashflowA.income, salary: 500_000 },
      expenses: { ...cashflowA.expenses, rent: 5_000, food: 80_000 },
    };
    const planA = computeEmergencyFundPlan(cashflowA, {
      monthlyProtectionBasisNpr: basis,
      recommendedMonths: 6,
    });
    const planB = computeEmergencyFundPlan(cashflowB, {
      monthlyProtectionBasisNpr: basis,
      recommendedMonths: 6,
    });
    assert.equal(planA.recommendedTarget, planB.recommendedTarget);
    assert.equal(planA.progressPct, planB.progressPct);
    assert.equal(planA.coverageMonths, planB.coverageMonths);
    assert.equal(planA.monthlyIncome, 0);
    assert.equal(planA.monthlySurplus, 0);
  });
});

describe("TEST H — Automatic budget update", () => {
  it("increases 6-month target by 60,000 when monthly basis rises by 10,000", () => {
    const before = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 141_927,
      protectionMonths: 6,
      designatedReserveNpr: 0,
    });
    const after = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 151_927,
      protectionMonths: 6,
      designatedReserveNpr: 0,
    });
    assert.equal(after.emergencyFundTargetNpr - before.emergencyFundTargetNpr, 60_000);
  });
});

describe("TEST I — Personal funding plan", () => {
  it("ceils shortfall / contribution to months remaining", () => {
    const plan = computeMonthlyFundingPlan({
      remainingShortfallNpr: 731_562,
      plannedMonthlyContributionNpr: 50_000,
    });
    assert.ok(plan);
    assert.equal(plan.estimatedMonthsRemaining, 15);
  });
});

describe("TEST J — Deadline-based funding", () => {
  it("computes required monthly contribution for a 12-month deadline", () => {
    const plan = computeDeadlineFundingPlan({
      remainingShortfallNpr: 731_562,
      deadlineMonths: 12,
    });
    assert.ok(plan);
    assert.equal(plan.requiredMonthlyContributionNpr, 60_963.5);
  });
});

describe("TEST K — Emergency simulator", () => {
  it("applies one-time cost then runway from remaining reserve", () => {
    const result = runEmergencySimulation({
      currentReserveNpr: 120_000,
      simulatedMonthlyBudgetNpr: 100_000,
      oneTimeEmergencyCostNpr: 20_000,
    });
    assert.equal(result.availableSimulatedReserveNpr, 100_000);
    assert.equal(result.simulatedSafetyRunwayMonths, 1);
    assert.equal(result.approximateProtectionDays, 30);
  });
});

describe("TEST L — Fully funded reserve", () => {
  it("caps visual progress, zeros shortfall, and reports excess", () => {
    const core = computeEmergencyFundCore({
      monthlyProtectionBasisNpr: 100_000,
      protectionMonths: 6,
      designatedReserveNpr: 700_000,
    });
    assert.equal(core.emergencyFundTargetNpr, 600_000);
    assert.ok(Math.abs((core.fundingProgressPct ?? 0) - 116.666) < 0.01);
    assert.equal(core.visualFundingProgressPct, 100);
    assert.equal(core.remainingShortfallNpr, 0);
    assert.equal(core.excessReserveNpr, 100_000);
  });
});

describe("TEST M — No budget data", () => {
  it("marks plan insufficient and does not invent a zero-funded status", () => {
    const breakdown = normalizeBudgetForEmergencyFund([]);
    assert.equal(breakdown.hasBudgetData, false);

    const plan = computeEmergencyFundPlan(
      { ...defaultCashflowState(), emergencyCashReserve: 50_000 },
      { monthlyProtectionBasisNpr: null, recommendedMonths: 6 },
    );
    assert.equal(plan.hasSufficientData, false);
    assert.equal(plan.recommendedTarget, 0);
    assert.equal(plan.progressPct, null);
    assert.equal(plan.coverageMonths, null);
    assert.equal(plan.currentAmount, 50_000);
  });
});
