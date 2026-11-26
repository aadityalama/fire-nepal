#!/usr/bin/env node
/**
 * Intelligent Emergency Fund calculation engine tests.
 * Run: npx tsx --test scripts/intelligent-emergency-fund.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeIntelligentEmergencyFund,
  resolveExpenseBasis,
  classifyFinancialSafety,
  computeLedgerReserve,
} from "../src/lib/emergency-fund/intelligent-engine.ts";
import {
  averageEssentialFromSlices,
  buildEmergencyFinancialInputs,
  buildMonthlyEssentialSlices,
  sumPlannedEssentialBudget,
} from "../src/lib/emergency-fund/financial-inputs.ts";
import {
  appendEmergencyTransaction,
  ensureEmergencyFundLedger,
  sanitizeEmergencyFundLedger,
} from "../src/lib/emergency-fund/ledger.ts";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import { computeEmergencyFundPlan } from "../src/lib/emergency-fund-plan.ts";

describe("required calculation scenario", () => {
  it("matches the NPR 250k / 110k basis / 6mo / 30% allocation fixture", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 250_000,
      actualMonthlyTotalExpensesNpr: 100_000,
      actualEssentialMonthlyAvgNpr: 100_000,
      plannedEssentialMonthlyNpr: 110_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 400_000,
      protectionMonths: 6,
      allocationPct: 30,
      now: new Date("2026-11-26T00:00:00Z"),
    });

    assert.equal(result.recommendedExpenseBasisNpr, 110_000);
    assert.equal(result.emergencyFundTargetNpr, 660_000);
    assert.equal(result.currentReserveNpr, 400_000);
    assert.equal(result.remainingShortfallNpr, 260_000);
    assert.equal(result.fundingProgressPct, 60.61);
    assert.equal(result.safetyRunwayMonths, 3.64);
    assert.equal(result.actualMonthlySavingsNpr, 150_000);
    assert.equal(result.conservativeMonthlySpendingNpr, 110_000);
    assert.equal(result.availableContributionCapacityNpr, 140_000);
    assert.equal(result.recommendedMonthlyContributionNpr, 42_000);
    assert.equal(result.estimatedMonthsRemaining, 7);
    assert.equal(result.safetyStatus, "building_safety");
    assert.equal(result.dataSource, "actual_and_budget");
  });
});

describe("expense basis hierarchy", () => {
  it("uses MAX(actual, planned) when both exist", () => {
    const a = resolveExpenseBasis({
      actualEssentialMonthlyAvgNpr: 100_000,
      plannedEssentialMonthlyNpr: 110_000,
      cashflowEssentialMonthlyNpr: 90_000,
      manualMonthlyExpenseNpr: null,
    });
    assert.equal(a.basisNpr, 110_000);
    assert.equal(a.dataSource, "actual_and_budget");

    const b = resolveExpenseBasis({
      actualEssentialMonthlyAvgNpr: 120_000,
      plannedEssentialMonthlyNpr: 110_000,
      cashflowEssentialMonthlyNpr: null,
      manualMonthlyExpenseNpr: null,
    });
    assert.equal(b.basisNpr, 120_000);
  });

  it("falls back through actual → budget → cashflow → manual → insufficient", () => {
    assert.equal(
      resolveExpenseBasis({
        actualEssentialMonthlyAvgNpr: 80_000,
        plannedEssentialMonthlyNpr: null,
        cashflowEssentialMonthlyNpr: 70_000,
        manualMonthlyExpenseNpr: 60_000,
      }).dataSource,
      "actual_history",
    );
    assert.equal(
      resolveExpenseBasis({
        actualEssentialMonthlyAvgNpr: null,
        plannedEssentialMonthlyNpr: 75_000,
        cashflowEssentialMonthlyNpr: 70_000,
        manualMonthlyExpenseNpr: null,
      }).dataSource,
      "budget_estimate",
    );
    assert.equal(
      resolveExpenseBasis({
        actualEssentialMonthlyAvgNpr: null,
        plannedEssentialMonthlyNpr: null,
        cashflowEssentialMonthlyNpr: 70_000,
        manualMonthlyExpenseNpr: null,
      }).dataSource,
      "cashflow_estimate",
    );
    assert.equal(
      resolveExpenseBasis({
        actualEssentialMonthlyAvgNpr: null,
        plannedEssentialMonthlyNpr: null,
        cashflowEssentialMonthlyNpr: null,
        manualMonthlyExpenseNpr: 55_000,
      }).dataSource,
      "manual_estimate",
    );
    assert.equal(
      resolveExpenseBasis({
        actualEssentialMonthlyAvgNpr: null,
        plannedEssentialMonthlyNpr: null,
        cashflowEssentialMonthlyNpr: null,
        manualMonthlyExpenseNpr: null,
      }).dataSource,
      "insufficient_data",
    );
  });

  it("never treats missing data as zero for the recommended basis", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 100_000,
      actualMonthlyTotalExpensesNpr: null,
      actualEssentialMonthlyAvgNpr: null,
      plannedEssentialMonthlyNpr: null,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 10_000,
    });
    assert.equal(result.hasSufficientData, false);
    assert.equal(result.recommendedExpenseBasisNpr, null);
    assert.equal(result.emergencyFundTargetNpr, null);
    assert.equal(result.fundingProgressPct, null);
    assert.equal(result.safetyRunwayMonths, null);
  });
});

describe("income zero and negative cashflow", () => {
  it("handles zero income without NaN", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 0,
      actualMonthlyTotalExpensesNpr: 50_000,
      actualEssentialMonthlyAvgNpr: 50_000,
      plannedEssentialMonthlyNpr: null,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 20_000,
      protectionMonths: 6,
      allocationPct: 30,
    });
    assert.equal(result.actualMonthlySavingsNpr, -50_000);
    assert.equal(result.availableContributionCapacityNpr, 0);
    assert.equal(result.recommendedMonthlyContributionNpr, 0);
    assert.equal(result.negativeCashflow, true);
    assert.ok(!Number.isNaN(result.fundingProgressPct));
  });

  it("prioritizes cashflow recovery when expenses exceed income", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 80_000,
      actualMonthlyTotalExpensesNpr: 100_000,
      actualEssentialMonthlyAvgNpr: 90_000,
      plannedEssentialMonthlyNpr: 90_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 50_000,
      allocationPct: 100,
    });
    assert.equal(result.negativeCashflow, true);
    assert.equal(result.recommendedMonthlyContributionNpr, 0);
    assert.ok(result.insights.some((i) => i.id === "negative-cashflow"));
  });
});

describe("fully funded and over-target", () => {
  it("marks fully funded and allows progress above 100% with ring capped", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 200_000,
      actualMonthlyTotalExpensesNpr: 80_000,
      actualEssentialMonthlyAvgNpr: 80_000,
      plannedEssentialMonthlyNpr: 80_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 600_000,
      protectionMonths: 6,
      allocationPct: 30,
    });
    assert.equal(result.emergencyFundTargetNpr, 480_000);
    assert.equal(result.fullyFunded, true);
    assert.equal(result.remainingShortfallNpr, 0);
    assert.equal(result.fundingProgressPct, 125);
    assert.equal(result.fundingProgressRingPct, 100);
    assert.equal(result.estimatedCompletionLabel, "Emergency Fund Fully Funded");
    assert.equal(result.recommendedMonthlyContributionNpr, 0);
  });
});

describe("protection period changes", () => {
  it("recalculates target when protection months change", () => {
    const base = {
      monthlyNetIncomeNpr: 250_000,
      actualMonthlyTotalExpensesNpr: 100_000,
      actualEssentialMonthlyAvgNpr: 100_000,
      plannedEssentialMonthlyNpr: 100_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 200_000,
      allocationPct: 30,
    };
    assert.equal(computeIntelligentEmergencyFund({ ...base, protectionMonths: 3 }).emergencyFundTargetNpr, 300_000);
    assert.equal(computeIntelligentEmergencyFund({ ...base, protectionMonths: 12 }).emergencyFundTargetNpr, 1_200_000);
  });
});

describe("ledger contributions and withdrawals", () => {
  it("computes reserve as opening + contributions − withdrawals", () => {
    let ledger = ensureEmergencyFundLedger(null, 100_000);
    ledger = appendEmergencyTransaction(ledger, {
      type: "contribution",
      amountNpr: 50_000,
      date: "2026-01-15",
      note: "January top-up",
    });
    ledger = appendEmergencyTransaction(ledger, {
      type: "withdrawal",
      amountNpr: 20_000,
      date: "2026-02-01",
      note: "Medical",
    });
    assert.equal(
      computeLedgerReserve({
        openingBalanceNpr: ledger.settings.openingBalanceNpr,
        transactions: ledger.transactions,
      }),
      130_000,
    );
  });

  it("does not double-count linked mode vs ledger", () => {
    const linked = computeLedgerReserve({
      openingBalanceNpr: 100_000,
      transactions: [
        {
          id: "1",
          type: "contribution",
          amountNpr: 50_000,
          date: "2026-01-01",
          createdAt: "2026-01-01T00:00:00Z",
          confirmed: true,
        },
      ],
      linkedSavingsBalanceNpr: 150_000,
      reserveMode: "linked",
    });
    assert.equal(linked, 150_000);

    const hybrid = computeLedgerReserve({
      openingBalanceNpr: 100_000,
      transactions: [],
      linkedSavingsBalanceNpr: 50_000,
      reserveMode: "hybrid",
    });
    assert.equal(hybrid, 150_000);
  });
});

describe("safety classification", () => {
  it("maps runway months to status bands", () => {
    assert.equal(classifyFinancialSafety(0.5), "critical");
    assert.equal(classifyFinancialSafety(2), "high_risk");
    assert.equal(classifyFinancialSafety(4), "building_safety");
    assert.equal(classifyFinancialSafety(8), "strong_protection");
    assert.equal(classifyFinancialSafety(12), "extended_protection");
    assert.equal(classifyFinancialSafety(null), null);
  });
});

describe("multi-currency conversion", () => {
  it("treats stored expense amounts as NPR and does not convert again", () => {
    const { slices, hasNonNprEntryMetadata } = buildMonthlyEssentialSlices(
      [
        // amount already NPR; amountCurrency is entry metadata only
        { amount: 100_000, date: "2026-09-10", category: "Rent", amountCurrency: "KRW" },
        { amount: 20_000, date: "2026-09-12", category: "Food", amountCurrency: "NPR" },
      ],
      { now: new Date("2026-11-15"), monthKeys: ["2026-09"] },
    );
    assert.equal(hasNonNprEntryMetadata, true);
    const sep = slices.find((s) => s.monthKey === "2026-09");
    assert.equal(sep?.essentialTotalNpr, 120_000);
  });

  it("does not invent 1:1 FX when aggregating NPR-stored amounts", () => {
    const { slices } = buildMonthlyEssentialSlices(
      [{ amount: 10_000, date: "2026-08-05", category: "Rent", amountCurrency: "KRW" }],
      { now: new Date("2026-11-15"), monthKeys: ["2026-08"] },
    );
    const aug = slices.find((s) => s.monthKey === "2026-08");
    assert.equal(aug?.essentialTotalNpr, 10_000);
  });
});

describe("budget vs actual without double counting", () => {
  it("does not add planned budget on top of actual spending for capacity", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: 250_000,
      actualMonthlyTotalExpensesNpr: 100_000,
      actualEssentialMonthlyAvgNpr: 100_000,
      plannedEssentialMonthlyNpr: 110_000,
      cashflowEssentialMonthlyNpr: null,
      currentReserveNpr: 0,
      allocationPct: 30,
    });
    // Conservative spending is MAX(actual total, planned essential) — not sum.
    assert.equal(result.conservativeMonthlySpendingNpr, 110_000);
    assert.notEqual(result.conservativeMonthlySpendingNpr, 210_000);
  });

  it("sums only essential budget categories", () => {
    const planned = sumPlannedEssentialBudget([
      {
        id: "1",
        name: "Rent",
        icon: "🏠",
        category: "Rent",
        period: "Monthly",
        amountNpr: 40_000,
        monthlyBudgetNpr: 40_000,
        monthlySpentNpr: 0,
        daysRemaining: 10,
        gradient: "",
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
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        name: "Travel",
        icon: "✈️",
        category: "Travel",
        period: "Monthly",
        amountNpr: 20_000,
        monthlyBudgetNpr: 20_000,
        monthlySpentNpr: 0,
        daysRemaining: 10,
        gradient: "",
        notes: "",
        notificationSettings: {
          "50% used": true,
          "75% used": true,
          "90% used": true,
          "100% used": true,
          "Overspend Alert": true,
        },
        aiRecommendation: null,
        sortOrder: 1,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    assert.equal(planned, 40_000);
  });
});

describe("partial-month and history averaging", () => {
  it("excludes current partial month from the 3-month average when completed months exist", () => {
    const now = new Date("2026-11-15");
    const { slices } = buildMonthlyEssentialSlices(
      [
        { amount: 90_000, date: "2026-08-10", category: "Rent" },
        { amount: 100_000, date: "2026-09-10", category: "Rent" },
        { amount: 110_000, date: "2026-10-10", category: "Rent" },
        { amount: 999_000, date: "2026-11-02", category: "Rent" },
      ],
      { now },
    );
    const avg = averageEssentialFromSlices(slices, { preferMonths: 3 });
    assert.equal(avg.monthsUsed, 3);
    assert.equal(avg.averageNpr, 100_000);
  });
});

describe("financial inputs integration", () => {
  it("builds inputs from cashflow + expenses + budgets", () => {
    const cashflow = {
      ...defaultCashflowState(),
      income: { ...defaultCashflowState().income, salary: 200_000 },
      expenses: { ...defaultCashflowState().expenses, rent: 50_000, food: 20_000 },
    };
    const inputs = buildEmergencyFinancialInputs({
      cashflow,
      expenses: [
        { amount: 50_000, date: "2026-09-01", category: "Rent" },
        { amount: 20_000, date: "2026-09-05", category: "Food" },
        { amount: 50_000, date: "2026-10-01", category: "Rent" },
        { amount: 25_000, date: "2026-10-05", category: "Food" },
        { amount: 50_000, date: "2026-08-01", category: "Rent" },
        { amount: 15_000, date: "2026-08-05", category: "Food" },
      ],
      budgets: [
        {
          id: "b1",
          name: "Housing",
          icon: "🏠",
          category: "Rent",
          period: "Monthly",
          amountNpr: 55_000,
          monthlyBudgetNpr: 55_000,
          monthlySpentNpr: 0,
          daysRemaining: 5,
          gradient: "",
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
          createdAt: "",
          updatedAt: "",
        },
      ],
      now: new Date("2026-11-20"),
    });
    assert.ok(inputs.actualEssentialMonthlyAvgNpr != null);
    assert.equal(inputs.plannedEssentialMonthlyNpr, 55_000);
    assert.equal(inputs.monthlyNetIncomeNpr, 200_000);
    assert.ok(inputs.cashflowEssentialMonthlyNpr != null);
  });
});

describe("ledger sanitize and plan SoT", () => {
  it("sanitizes ledger and keeps FIRE plan reserve aligned", () => {
    const ledger = sanitizeEmergencyFundLedger({
      version: 1,
      settings: { openingBalanceNpr: 200_000, protectionMonths: 6, allocationPct: 30 },
      transactions: [
        {
          id: "c1",
          type: "contribution",
          amountNpr: 50_000,
          date: "2026-01-01",
          createdAt: "2026-01-01T00:00:00Z",
          confirmed: true,
        },
      ],
    });
    const cashflow = {
      ...defaultCashflowState(),
      expenses: { ...defaultCashflowState().expenses, rent: 50_000 },
      emergencyCashReserve: 999_999,
      emergencyFund: ledger,
    };
    const plan = computeEmergencyFundPlan(cashflow);
    assert.equal(plan.currentAmount, 250_000);
  });
});

describe("safe denominators", () => {
  it("never returns NaN or Infinity for progress/runway", () => {
    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: null,
      actualMonthlyTotalExpensesNpr: null,
      actualEssentialMonthlyAvgNpr: 0,
      plannedEssentialMonthlyNpr: 0,
      cashflowEssentialMonthlyNpr: 0,
      currentReserveNpr: 100,
      protectionMonths: 6,
    });
    assert.equal(result.hasSufficientData, false);
    assert.equal(result.fundingProgressPct, null);
    assert.equal(result.safetyRunwayMonths, null);
    assert.ok(result.estimatedMonthsRemaining === null || Number.isFinite(result.estimatedMonthsRemaining));
  });
});
