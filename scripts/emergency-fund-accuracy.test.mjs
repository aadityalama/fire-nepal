#!/usr/bin/env node
/**
 * Emergency Fund 2.0 accuracy + period + quality tests.
 * Run: npx tsx --test scripts/emergency-fund-accuracy.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import {
  buildEmergencyFinancialInputs,
  buildMonthlyEssentialSlices,
  sumIncomeForPeriod,
} from "../src/lib/emergency-fund/financial-inputs.ts";
import { computeIntelligentEmergencyFund } from "../src/lib/emergency-fund/intelligent-engine.ts";
import { buildFundingPlans } from "../src/lib/emergency-fund/funding-plans.ts";
import { runEmergencySimulator } from "../src/lib/emergency-fund/simulator.ts";
import { buildSafetyMilestones } from "../src/lib/emergency-fund/milestones.ts";
import { pluralMonths, resolvePeriodMonthKeys } from "../src/lib/emergency-fund/period.ts";

describe("accuracy: expense amounts are already NPR", () => {
  it("does not divide KRW-tagged amounts again", () => {
    const { slices } = buildMonthlyEssentialSlices(
      [
        // amount already NPR; amountCurrency is entry metadata only
        { amount: 50_000, date: "2026-09-10", category: "Rent", amountCurrency: "KRW" },
      ],
      { now: new Date("2026-11-15"), monthKeys: ["2026-09"] },
    );
    assert.equal(slices[0].essentialTotalNpr, 50_000);
  });
});

describe("accuracy: income period alignment", () => {
  it("averages income across selected months and prefers entries over legacy", () => {
    const cashflow = defaultCashflowState();
    cashflow.income.salary = 999_999; // must NOT be added when entries exist
    cashflow.incomeEntries = [
      {
        id: "s1",
        name: "Salary",
        amount: 200_000,
        incomeType: "salary",
        frequency: "monthly",
        date: "2026-09-01",
        createdAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s2",
        name: "Salary",
        amount: 200_000,
        incomeType: "salary",
        frequency: "monthly",
        date: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
      },
      {
        id: "b1",
        name: "Bonus",
        amount: 700_000,
        incomeType: "bonus",
        frequency: "once",
        date: "2026-10-15",
        createdAt: "2026-10-15T00:00:00Z",
      },
    ];

    const breakdown = sumIncomeForPeriod(cashflow, ["2026-10", "2026-09"]);
    assert.equal(breakdown.legacyIncomeMixedWithEntries, true);
    assert.equal(breakdown.usedEntriesOnly, true);
    // Deduped salary by name: Sept=200k, Oct=200k+700k bonus; avg total=550k
    assert.equal(breakdown.totalNpr, 550_000);
    assert.equal(breakdown.recurringNpr, 200_000);
  });

  it("does not use current-month-only income when period is latest completed", () => {
    const cashflow = defaultCashflowState();
    cashflow.incomeEntries = [
      {
        id: "nov",
        name: "Nov salary",
        amount: 1_095_000,
        incomeType: "salary",
        frequency: "monthly",
        date: "2026-11-01",
        createdAt: "2026-11-01T00:00:00Z",
      },
      {
        id: "oct",
        name: "Oct salary",
        amount: 250_000,
        incomeType: "salary",
        frequency: "monthly",
        date: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
      },
    ];
    const inputs = buildEmergencyFinancialInputs({
      cashflow,
      expenses: [
        { amount: 22_000, date: "2026-09-05", category: "Rent" },
        { amount: 22_000, date: "2026-10-05", category: "Rent" },
      ],
      budgets: [],
      now: new Date("2026-11-20"),
      periodMode: "latest_completed",
    });
    // Latest completed = Oct 2026 → income 250k, not Nov 1.095M
    assert.equal(inputs.monthlyNetIncomeNpr, 250_000);
    assert.match(inputs.incomePeriodLabel, /October 2026/);
  });
});

describe("screenshot fixture math with verified capacity", () => {
  it("matches target/progress/shortfall/runway and 6-mo plan", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 250_000,
      recurringMonthlyIncomeNpr: 250_000,
      actualMonthlyTotalExpensesNpr: 49_806,
      actualEssentialMonthlyAvgNpr: 22_000,
      plannedEssentialMonthlyNpr: 34_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 120_000,
      protectionMonths: 12,
      allocationPct: 30,
      dataQuality: {
        overall: "verified",
        income: "verified",
        expenses: "verified",
        budget: "verified",
        exchangeRate: "verified",
        periodConsistency: "verified",
        issues: [],
        suppressContributionRecommendations: false,
        suppressCompletionDates: false,
        capacityReliable: true,
      },
    });
    assert.equal(result.recommendedExpenseBasisNpr, 34_000);
    assert.equal(result.emergencyFundTargetNpr, 408_000);
    assert.equal(result.fundingProgressPct, 29.41);
    assert.equal(result.remainingShortfallNpr, 288_000);
    assert.equal(result.safetyRunwayMonths, 3.53);

    const plans = buildFundingPlans({
      remainingShortfallNpr: 288_000,
      availableContributionCapacityNpr: 200_194,
      capacityReliable: true,
    });
    const six = plans.find((p) => p.deadlineMonths === 6);
    assert.equal(six.requiredMonthlyContributionNpr, 48_000);
    assert.equal(six.affordability, "affordable");
  });

  it("suppresses contribution recommendations when income quality is unreliable", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 1_095_000,
      recurringMonthlyIncomeNpr: 250_000,
      actualMonthlyTotalExpensesNpr: 49_806,
      actualEssentialMonthlyAvgNpr: 22_000,
      plannedEssentialMonthlyNpr: 34_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 120_000,
      protectionMonths: 12,
      allocationPct: 30,
      dataQuality: {
        overall: "needs_review",
        income: "needs_review",
        expenses: "verified",
        budget: "verified",
        exchangeRate: "verified",
        periodConsistency: "verified",
        issues: [],
        suppressContributionRecommendations: true,
        suppressCompletionDates: true,
        capacityReliable: false,
      },
    });
    assert.equal(result.recommendedMonthlyContributionNpr, null);
    assert.equal(result.estimatedCompletionLabel, null);
  });
});

describe("period helpers and grammar", () => {
  it("defaults to latest completed month", () => {
    const period = resolvePeriodMonthKeys("latest_completed", { now: new Date("2026-11-20") });
    assert.deepEqual(period.monthKeys, ["2026-10"]);
    assert.equal(period.includesPartialCurrent, false);
  });

  it("pluralizes months correctly", () => {
    assert.equal(pluralMonths(1), "1 month");
    assert.equal(pluralMonths(3.53), "3.5 months");
  });
});

describe("simulator and milestones", () => {
  it("handles complete income loss runway", () => {
    const sim = runEmergencySimulator({
      currentReserveNpr: 120_000,
      essentialMonthlyNpr: 34_000,
      remainingMonthlyIncomeNpr: 0,
      oneTimeEmergencyCostNpr: 0,
    });
    assert.equal(sim.monthlyFundingGapNpr, 34_000);
    assert.equal(sim.safetyRunwayMonths, 3.53);
    assert.equal(sim.isSimulation, true);
  });

  it("builds independent milestones", () => {
    const ms = buildSafetyMilestones(34_000, 120_000);
    assert.equal(ms.find((m) => m.months === 3).achieved, true);
    assert.equal(ms.find((m) => m.months === 6).achieved, false);
    assert.equal(ms.find((m) => m.months === 1).requiredReserveNpr, 34_000);
  });
});
