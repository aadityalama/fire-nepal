#!/usr/bin/env node
/**
 * Emergency Fund finance plan + FIRE Progress SoT tests.
 * Run: npx tsx --test scripts/emergency-fund-plan.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import {
  computeEmergencyFundPlan,
  DEFAULT_EMERGENCY_FUND_MONTHS,
} from "../src/lib/emergency-fund-plan.ts";
import { computeUnifiedFireSummary } from "../src/lib/fire-nepal/unified-fire-summary.ts";
import { defaultWealthState } from "../src/components/portfolio/storage.ts";

function cashflowWith(overrides = {}) {
  const base = defaultCashflowState();
  return {
    ...base,
    ...overrides,
    income: { ...base.income, ...(overrides.income ?? {}) },
    expenses: { ...base.expenses, ...(overrides.expenses ?? {}) },
  };
}

describe("computeEmergencyFundPlan", () => {
  it("sizes a 6-month target from essential monthly expenses", () => {
    const plan = computeEmergencyFundPlan(
      cashflowWith({
        expenses: { rent: 20_000, food: 15_000, transportation: 10_000 },
        emergencyCashReserve: 90_000,
        income: { salary: 120_000 },
      }),
    );

    assert.equal(plan.hasSufficientData, true);
    assert.equal(plan.monthlyEssentialExpenses, 45_000);
    assert.equal(plan.recommendedMonths, DEFAULT_EMERGENCY_FUND_MONTHS);
    assert.equal(plan.recommendedTarget, 270_000);
    assert.equal(plan.currentAmount, 90_000);
    assert.equal(plan.remainingAmount, 180_000);
    assert.ok(Math.abs((plan.progressPct ?? 0) - (90_000 / 270_000) * 100) < 1e-9);
    assert.equal(plan.monthlySurplus, 75_000);
    assert.equal(plan.recommendedMonthlyContribution, 75_000);
    assert.equal(plan.estimatedMonthsRemaining, 3);
  });

  it("shows setup-insufficient state when expenses are missing", () => {
    const plan = computeEmergencyFundPlan(
      cashflowWith({
        income: { salary: 100_000 },
        emergencyCashReserve: 50_000,
      }),
    );

    assert.equal(plan.hasSufficientData, false);
    assert.equal(plan.recommendedTarget, 0);
    assert.equal(plan.progressPct, null);
    assert.equal(plan.coverageMonths, null);
    assert.equal(plan.estimatedMonthsRemaining, null);
    assert.equal(plan.currentAmount, 50_000);
  });

  it("marks funded plans as ready with zero remaining months", () => {
    const plan = computeEmergencyFundPlan(
      cashflowWith({
        expenses: { rent: 45_000 },
        emergencyCashReserve: 270_000,
        income: { salary: 80_000 },
      }),
    );

    assert.equal(plan.remainingAmount, 0);
    assert.equal(plan.progressPct, 100);
    assert.equal(plan.recommendedMonthlyContribution, 0);
    assert.equal(plan.estimatedMonthsRemaining, 0);
  });

  it("does not invent a contribution when surplus is zero or negative", () => {
    const plan = computeEmergencyFundPlan(
      cashflowWith({
        expenses: { rent: 50_000 },
        income: { salary: 40_000 },
        emergencyCashReserve: 10_000,
      }),
    );

    assert.equal(plan.monthlySurplus, -10_000);
    assert.equal(plan.recommendedMonthlyContribution, 0);
    assert.equal(plan.estimatedMonthsRemaining, null);
  });

  it("respects monthlyExpensesOverride as essential burn", () => {
    const plan = computeEmergencyFundPlan(
      cashflowWith({
        expenses: { rent: 10_000 },
        monthlyExpensesOverride: 45_000,
        emergencyCashReserve: 0,
        income: { salary: 100_000 },
      }),
    );

    assert.equal(plan.monthlyEssentialExpenses, 45_000);
    assert.equal(plan.recommendedTarget, 270_000);
  });
});

describe("FIRE Progress emergency fund SoT", () => {
  it("exposes the same current/target/remaining/progress as Emergency Fund plan", () => {
    const cashflow = cashflowWith({
      expenses: { rent: 20_000, food: 15_000, transportation: 10_000 },
      emergencyCashReserve: 90_000,
      income: { salary: 120_000 },
    });
    const plan = computeEmergencyFundPlan(cashflow);
    const summary = computeUnifiedFireSummary(defaultWealthState(), cashflow, 10, 0.0075);

    assert.equal(summary.emergencyFundHasSufficientData, true);
    assert.equal(summary.emergencyFundCurrentAmount, plan.currentAmount);
    assert.equal(summary.emergencyFundTargetAmount, plan.recommendedTarget);
    assert.equal(summary.emergencyFundRemainingAmount, plan.remainingAmount);
    assert.equal(summary.emergencyFundSixMoProgressPct, plan.progressPct);
    assert.ok(summary.emergencyFundCoverageMonths != null);
    assert.ok(Math.abs((summary.emergencyFundCoverageMonths ?? 0) - 2) < 1e-9);
  });

  it("keeps emergency fields empty-safe when burn is missing", () => {
    const cashflow = cashflowWith({ emergencyCashReserve: 12_000 });
    const summary = computeUnifiedFireSummary(defaultWealthState(), cashflow, 10, 0.0075);

    assert.equal(summary.emergencyFundHasSufficientData, false);
    assert.equal(summary.emergencyFundTargetAmount, 0);
    assert.equal(summary.emergencyFundSixMoProgressPct, null);
    assert.equal(summary.emergencyFundCoverageMonths, null);
    assert.equal(summary.emergencyFundCurrentAmount, 12_000);
  });
});
