#!/usr/bin/env node
/**
 * Cashflow → Return Planner passive income sync tests.
 * Run: npx tsx --test scripts/passive-income-cashflow-sync.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCashflowPassiveIncomeSnapshot,
  defaultIncomeStreamClass,
  normalizeRecurringMonthlyAmount,
  resolveIncomeStreamClass,
} from "../src/lib/cashflow/passive-income-from-cashflow.ts";
import { computeReturnChecklist } from "../src/lib/return-to-nepal/return-checklist.ts";
import { DEFAULT_RETURN_PLANNER_STATE } from "../src/lib/return-to-nepal/default-planner-state.ts";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";

function baseInsuranceInputs(overrides = {}) {
  return {
    monthlyIncomeNpr: 200_000,
    monthlyExpenseNpr: 100_000,
    totalSavingsNpr: 500_000,
    investableNpr: 1_000_000,
    emergencyFundMonths: 3,
    fireGoalNpr: 0,
    fireProgressPct: 20,
    age: 32,
    adults: 2,
    children: 1,
    ssfMonthlyContributionNpr: 0,
    yearsToReturn: 5,
    returnReadinessPct: 40,
    ...overrides,
  };
}

function baseSources(overrides = {}) {
  return {
    state: { ...DEFAULT_RETURN_PLANNER_STATE },
    emergencyCashReserveNpr: null,
    emergencyMonthlyBurnNpr: 100_000,
    emergencyMonthsTarget: 12,
    monthlySsfContributionNpr: 0,
    ssfContributionTargetNpr: 20_000,
    totalInvestmentNpr: 0,
    investmentGoalTargetNpr: null,
    modeledPassiveMonthlyNpr: 0,
    actualPassiveMonthlyNpr: 0,
    passiveTargetMonthlyNpr: 80_000,
    insurancePolicies: [],
    insuranceInputs: baseInsuranceInputs(),
    houseProgressPct: 0,
    houseGoalConfigured: false,
    housePlanStatus: "unknown",
    adults: 2,
    children: 1,
    householdConfigured: false,
    schoolFeesMonthlyNpr: 0,
    healthcareMonthlyNpr: 0,
    familyCostSignalsConfigured: false,
    settlementChecklistLength: 0,
    businessCapitalNpr: 0,
    businessGoalConfigured: false,
    businessCapitalTargetNpr: 0,
    liabilitiesNpr: 0,
    liabilitiesConfigured: false,
    ...overrides,
  };
}

describe("Income classification defaults", () => {
  it("classifies rental and dividend as passive; salary as active; bonus as one-time", () => {
    assert.equal(defaultIncomeStreamClass("rental", "monthly"), "passive");
    assert.equal(defaultIncomeStreamClass("dividend", "monthly"), "passive");
    assert.equal(defaultIncomeStreamClass("salary", "monthly"), "active");
    assert.equal(defaultIncomeStreamClass("freelance", "monthly"), "active");
    assert.equal(defaultIncomeStreamClass("bonus", "once"), "one_time");
    assert.equal(defaultIncomeStreamClass("business", "monthly"), "active");
    assert.equal(resolveIncomeStreamClass("business", "monthly", "passive"), "passive");
  });
});

describe("Monthly normalization", () => {
  it("normalizes monthly, annual, weekly, quarterly; one-time → 0 recurring", () => {
    assert.equal(normalizeRecurringMonthlyAmount(500_000, "monthly"), 500_000);
    assert.equal(normalizeRecurringMonthlyAmount(1_200_000, "yearly"), 100_000);
    assert.equal(normalizeRecurringMonthlyAmount(10_000, "weekly"), Math.round((10_000 * 52) / 12));
    assert.equal(normalizeRecurringMonthlyAmount(90_000, "quarterly"), 30_000);
    assert.equal(normalizeRecurringMonthlyAmount(500_000, "once"), 0);
  });
});

describe("Cashflow passive snapshot", () => {
  it("adds NPR 500,000 monthly rental to recurring passive", () => {
    const state = {
      ...defaultCashflowState(),
      incomeEntries: [
        {
          id: "r1",
          name: "KTM HOME REY",
          amount: 500_000,
          incomeType: "rental",
          frequency: "monthly",
          date: "2026-11-28",
          createdAt: "2026-11-28T00:00:00.000Z",
        },
      ],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 500_000);
    assert.equal(snap.periodActualPassiveNpr, 500_000);
    assert.equal(snap.cashflowRentalMonthlyNpr, 500_000);
    assert.equal(snap.hasIncomeRecords, true);
  });

  it("does not count salary as passive", () => {
    const state = {
      ...defaultCashflowState(),
      incomeEntries: [
        {
          id: "s1",
          name: "Korea Salary",
          amount: 300_000,
          incomeType: "salary",
          frequency: "monthly",
          date: "2026-11-01",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 0);
    assert.equal(snap.breakdown[0].streamClass, "active");
  });

  it("does not inflate recurring passive with one-time bonus", () => {
    const state = {
      ...defaultCashflowState(),
      incomeEntries: [
        {
          id: "b1",
          name: "Festival Bonus",
          amount: 200_000,
          incomeType: "bonus",
          frequency: "once",
          date: "2026-11-15",
          createdAt: "2026-11-15T00:00:00.000Z",
        },
      ],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 0);
    assert.equal(snap.breakdown[0].streamClass, "one_time");
  });

  it("respects explicit passive classification for business", () => {
    const state = {
      ...defaultCashflowState(),
      incomeEntries: [
        {
          id: "biz1",
          name: "Passive Biz Dist",
          amount: 40_000,
          incomeType: "business",
          frequency: "monthly",
          incomeClass: "passive",
          date: "2026-11-01",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 40_000);
  });

  it("does not double-count legacy keys when incomeEntries exist", () => {
    const state = {
      ...defaultCashflowState(),
      income: {
        ...defaultCashflowState().income,
        rentalIncome: 500_000,
      },
      incomeEntries: [
        {
          id: "r1",
          name: "KTM HOME REY",
          amount: 500_000,
          incomeType: "rental",
          frequency: "monthly",
          date: "2026-11-28",
          createdAt: "2026-11-28T00:00:00.000Z",
        },
      ],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 500_000);
  });

  it("uses legacy rentalIncome when no entries", () => {
    const state = {
      ...defaultCashflowState(),
      income: {
        ...defaultCashflowState().income,
        rentalIncome: 120_000,
      },
      incomeEntries: [],
    };
    const snap = computeCashflowPassiveIncomeSnapshot(state, "2026-11");
    assert.equal(snap.recurringPassiveMonthlyNpr, 120_000);
  });
});

describe("Return Checklist — Passive Income Goal", () => {
  it("marks COMPLETED when recurring passive meets expense target", () => {
    const passive = computeReturnChecklist(
      baseSources({
        actualPassiveMonthlyNpr: 500_000,
        periodActualPassiveNpr: 500_000,
        modeledPassiveMonthlyNpr: 7_026,
        passiveTargetMonthlyNpr: 80_000,
      }),
    ).find((row) => row.id === "passive");
    assert.ok(passive);
    assert.equal(passive.status, "completed");
    assert.match(passive.detail, /500,000/);
    assert.match(passive.detail, /7,026/);
    assert.equal(passive.actionLabel, "Manage Passive Income");
  });

  it("keeps modeled-only as IN PROGRESS (not COMPLETED)", () => {
    const passive = computeReturnChecklist(
      baseSources({
        actualPassiveMonthlyNpr: 0,
        modeledPassiveMonthlyNpr: 7_026,
        passiveTargetMonthlyNpr: 80_000,
      }),
    ).find((row) => row.id === "passive");
    assert.ok(passive);
    assert.equal(passive.status, "in_progress");
    assert.notEqual(passive.status, "completed");
  });

  it("does not treat failed cashflow as zero MISSING", () => {
    const passive = computeReturnChecklist(
      baseSources({
        cashflowUnavailable: true,
        actualPassiveMonthlyNpr: 0,
        modeledPassiveMonthlyNpr: 0,
        passiveTargetMonthlyNpr: 80_000,
      }),
    ).find((row) => row.id === "passive");
    assert.ok(passive);
    assert.equal(passive.status, "data_unavailable");
  });

  it("TARGET NOT SET when expense target missing", () => {
    const passive = computeReturnChecklist(
      baseSources({
        actualPassiveMonthlyNpr: 50_000,
        modeledPassiveMonthlyNpr: 0,
        passiveTargetMonthlyNpr: null,
      }),
    ).find((row) => row.id === "passive");
    assert.ok(passive);
    assert.equal(passive.status, "target_not_set");
  });

  it("readiness uses actual Cashflow passive (not modeled alone)", async () => {
    const { computeReturnReadinessScores, clampFundingPct } = await import(
      "../src/lib/return-to-nepal/return-readiness-scores.ts"
    );
    const scores = computeReturnReadinessScores(
      { ...DEFAULT_RETURN_PLANNER_STATE },
      {
        nowYear: 2026,
        estimatedReturnYear: 2030,
        monthlyDeficitNpr: 0,
        requiredExtraCorpusNpr: 0,
        monthlyNepalLivingNpr: 80_000,
        emergencyReserveMonths: 0,
        passiveMonthlyNpr: 7_026,
        houseTotalBudgetNpr: 0,
        totalReturnFundNpr: 0,
        familyRelocationScore: 0,
        returnReadinessPct: 0,
      },
      baseInsuranceInputs(),
      0,
      0,
      baseSources({
        actualPassiveMonthlyNpr: 500_000,
        modeledPassiveMonthlyNpr: 7_026,
        passiveTargetMonthlyNpr: 80_000,
      }),
    );
    const passive = scores.find((s) => s.id === "passiveIncome");
    assert.ok(passive);
    assert.equal(passive.pct, clampFundingPct(100));
    assert.ok(passive.pct >= 100);
    // Readiness pillar uses pct bands (strong/excellent) — not checklist COMPLETED labels.
    assert.notEqual(passive.status, "missing");
    assert.notEqual(passive.status, "in_progress");
  });
});
