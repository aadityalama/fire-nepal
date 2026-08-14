/**
 * Unit tests for historical finance analytics aggregation.
 * Pure helpers only — no fabricated historical data, no network.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import {
  buildHistoricalSummary,
  buildMonthlySeries,
  buildPeriodDetail,
  buildYearlySeries,
  expenseCategoryBreakdownForMonths,
  historicalIncomeForMonth,
  incomeEntryStartMonth,
  listMonthKeysInclusive,
  resolveHistoricalRange,
} from "../src/lib/finance/historical-analytics.ts";

const NOW = new Date(2026, 7, 14); // 2026-08

function makeCashflow(entries) {
  const state = defaultCashflowState();
  state.incomeEntries = entries;
  return state;
}

function makeExpenseRow(partial) {
  return {
    id: partial.id ?? "tx-1",
    workspace_id: "ws-1",
    user_id: "user-1",
    local_expense_id: 1,
    transaction_type: partial.transaction_type ?? "expense",
    description: partial.description ?? "Expense",
    category: partial.category ?? "Food",
    amount: partial.amount ?? 0,
    currency: "NPR",
    member_id: "personal-user",
    member_name: "Me",
    transaction_date: partial.transaction_date,
    metadata: {},
    created_by_name: "Me",
    deleted_at: partial.deleted_at ?? null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

test("1Y resolves to exactly 12 months ending at current month", () => {
  const range = resolveHistoricalRange("1y", { now: NOW });
  assert.equal(range.monthKeys.length, 12);
  assert.equal(range.endMonth, "2026-08");
  assert.equal(range.startMonth, "2025-09");
  assert.equal(range.monthKeys[0], "2025-09");
  assert.equal(range.monthKeys[11], "2026-08");
});

test("2Y resolves to exactly 24 months", () => {
  const range = resolveHistoricalRange("2y", { now: NOW });
  assert.equal(range.monthKeys.length, 24);
  assert.equal(range.startMonth, "2024-09");
  assert.equal(range.endMonth, "2026-08");
});

test("5Y resolves to exactly 60 months", () => {
  const range = resolveHistoricalRange("5y", { now: NOW });
  assert.equal(range.monthKeys.length, 60);
  assert.equal(range.startMonth, "2021-09");
  assert.equal(range.endMonth, "2026-08");
});

test("monthly filter shows months in selected year only (up to now)", () => {
  const range = resolveHistoricalRange("monthly", { now: NOW, selectedYear: 2026 });
  assert.equal(range.startMonth, "2026-01");
  assert.equal(range.endMonth, "2026-08");
  assert.equal(range.monthKeys.length, 8);
});

test("yearly filter spans multiple years as monthly buckets", () => {
  const range = resolveHistoricalRange("yearly", { now: NOW });
  assert.equal(range.startMonth, "2017-01");
  assert.ok(range.monthKeys.length >= 12);
  assert.equal(range.endMonth, "2026-08");
});

test("current and previous month/year shortcuts", () => {
  assert.deepEqual(resolveHistoricalRange("current_month", { now: NOW }).monthKeys, ["2026-08"]);
  assert.deepEqual(resolveHistoricalRange("previous_month", { now: NOW }).monthKeys, ["2026-07"]);
  const cy = resolveHistoricalRange("current_year", { now: NOW });
  assert.equal(cy.startMonth, "2026-01");
  assert.equal(cy.endMonth, "2026-08");
  const py = resolveHistoricalRange("previous_year", { now: NOW });
  assert.equal(py.startMonth, "2025-01");
  assert.equal(py.endMonth, "2025-12");
  assert.equal(py.monthKeys.length, 12);
});

test("custom range respects from/to month bounds", () => {
  const range = resolveHistoricalRange("custom", {
    now: NOW,
    customFrom: "2026-03",
    customTo: "2026-05",
  });
  assert.deepEqual(range.monthKeys, ["2026-03", "2026-04", "2026-05"]);
});

test("listMonthKeysInclusive is inclusive and ordered", () => {
  assert.deepEqual(listMonthKeysInclusive("2026-01", "2026-03"), ["2026-01", "2026-02", "2026-03"]);
});

test("monthly recurring income does not apply before entry start month (no fake history)", () => {
  const state = makeCashflow([
    {
      id: "i1",
      name: "Salary",
      amount: 100000,
      incomeType: "salary",
      frequency: "monthly",
      date: "2026-06-01",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ]);
  assert.equal(incomeEntryStartMonth(state.incomeEntries[0]), "2026-06");
  assert.equal(historicalIncomeForMonth(state, "2026-05", NOW), 0);
  assert.equal(historicalIncomeForMonth(state, "2026-06", NOW), 100000);
  assert.equal(historicalIncomeForMonth(state, "2026-07", NOW), 100000);
});

test("once income only counts its own month", () => {
  const state = makeCashflow([
    {
      id: "i2",
      name: "Bonus",
      amount: 50000,
      incomeType: "bonus",
      frequency: "once",
      date: "2026-03-15",
      createdAt: "2026-03-15T00:00:00.000Z",
    },
  ]);
  assert.equal(historicalIncomeForMonth(state, "2026-03", NOW), 50000);
  assert.equal(historicalIncomeForMonth(state, "2026-04", NOW), 0);
});

test("buildMonthlySeries marks empty months as no data with zero totals", () => {
  const state = makeCashflow([
    {
      id: "i1",
      name: "Salary",
      amount: 80000,
      incomeType: "salary",
      frequency: "monthly",
      date: "2026-06-01",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
  ]);
  const rows = [
    makeExpenseRow({ id: "e1", amount: 20000, category: "Food", transaction_date: "2026-06-10" }),
    makeExpenseRow({ id: "e2", amount: 15000, category: "Transport", transaction_date: "2026-07-05" }),
  ];
  const keys = listMonthKeysInclusive("2026-03", "2026-08");
  const series = buildMonthlySeries(state, rows, keys, NOW);
  assert.equal(series.length, 6);

  const mar = series.find((m) => m.key === "2026-03");
  assert.equal(mar.income, 0);
  assert.equal(mar.expense, 0);
  assert.equal(mar.hasData, false);

  const jun = series.find((m) => m.key === "2026-06");
  assert.equal(jun.income, 80000);
  assert.equal(jun.expense, 20000);
  assert.equal(jun.netCashflow, 60000);
  assert.equal(jun.savings, 60000);
  assert.equal(jun.hasData, true);
});

test("summary averages only months with recorded data", () => {
  const state = makeCashflow([
    {
      id: "i1",
      name: "Salary",
      amount: 100000,
      incomeType: "salary",
      frequency: "once",
      date: "2026-07-01",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ]);
  const rows = [makeExpenseRow({ amount: 40000, category: "Rent", transaction_date: "2026-07-02" })];
  const series = buildMonthlySeries(state, rows, listMonthKeysInclusive("2026-01", "2026-08"), NOW);
  const summary = buildHistoricalSummary(series);
  assert.equal(summary.monthsInRange, 8);
  assert.equal(summary.monthsWithData, 1);
  assert.equal(summary.totalIncome, 100000);
  assert.equal(summary.totalExpenses, 40000);
  assert.equal(summary.netCashflow, 60000);
  assert.equal(summary.averageMonthlyIncome, 100000);
  assert.equal(summary.averageMonthlyExpenses, 40000);
  assert.equal(summary.highestIncomeMonth.key, "2026-07");
  assert.equal(summary.highestExpenseMonth.key, "2026-07");
  assert.ok(Math.abs((summary.savingsRate ?? 0) - 60) < 0.001);
});

test("yearly aggregation rolls months into years", () => {
  const state = makeCashflow([
    {
      id: "i1",
      name: "Salary",
      amount: 10000,
      incomeType: "salary",
      frequency: "monthly",
      date: "2025-11-01",
      createdAt: "2025-11-01T00:00:00.000Z",
    },
  ]);
  const rows = [
    makeExpenseRow({ amount: 3000, transaction_date: "2025-11-10", category: "Food" }),
    makeExpenseRow({ amount: 4000, transaction_date: "2026-01-10", category: "Food" }),
  ];
  const series = buildMonthlySeries(state, rows, listMonthKeysInclusive("2025-11", "2026-02"), NOW);
  const years = buildYearlySeries(series);
  assert.equal(years.length, 2);
  const y2025 = years.find((y) => y.key === "2025");
  const y2026 = years.find((y) => y.key === "2026");
  assert.equal(y2025.income, 20000); // Nov+Dec
  assert.equal(y2025.expense, 3000);
  assert.equal(y2026.income, 20000); // Jan+Feb
  assert.equal(y2026.expense, 4000);
});

test("expense category breakdown uses FireNepal categories", () => {
  const rows = [
    makeExpenseRow({ amount: 5000, category: "Food", transaction_date: "2026-08-01" }),
    makeExpenseRow({ amount: 12000, category: "Housing", transaction_date: "2026-08-02" }),
    makeExpenseRow({ amount: 2000, category: "Transport", transaction_date: "2026-08-03" }),
    makeExpenseRow({ amount: 1000, category: "Insurance", transaction_date: "2026-08-04" }),
    makeExpenseRow({ amount: 8000, category: "Investment", transaction_date: "2026-08-05" }),
    makeExpenseRow({ amount: 500, category: "SomethingWeird", transaction_date: "2026-08-06" }),
  ];
  const breakdown = expenseCategoryBreakdownForMonths(rows, ["2026-08"]);
  const byId = Object.fromEntries(breakdown.map((b) => [b.category, b.amount]));
  assert.equal(byId.Food, 5000);
  assert.equal(byId.Rent, 12000); // Housing → Rent
  assert.equal(byId.Transport, 2000);
  assert.equal(byId.Insurance, 1000);
  assert.equal(byId.Investment, 8000);
  assert.equal(byId.Other, 500);
});

test("period detail includes counts and largest items", () => {
  const state = makeCashflow([
    {
      id: "i1",
      name: "Salary",
      amount: 90000,
      incomeType: "salary",
      frequency: "once",
      date: "2026-08-01",
      createdAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  const rows = [
    makeExpenseRow({
      id: "e1",
      amount: 3000,
      description: "Groceries",
      category: "Food",
      transaction_date: "2026-08-05",
    }),
    makeExpenseRow({
      id: "e2",
      amount: 25000,
      description: "Rent payment",
      category: "Rent",
      transaction_date: "2026-08-01",
    }),
  ];
  const detail = buildPeriodDetail(state, rows, ["2026-08"], "August 2026", "2026-08", NOW);
  assert.equal(detail.totalIncome, 90000);
  assert.equal(detail.totalExpenses, 28000);
  assert.equal(detail.netCashflow, 62000);
  assert.equal(detail.largestExpense.description, "Rent payment");
  assert.equal(detail.largestIncome.description, "Salary");
  assert.ok(detail.expenseCategories.some((c) => c.category === "Rent"));
  assert.ok(detail.incomeSources.some((s) => s.source === "salary"));
});

test("soft-deleted expense rows are ignored", () => {
  const state = makeCashflow([]);
  const rows = [
    makeExpenseRow({
      amount: 9999,
      transaction_date: "2026-08-01",
      deleted_at: "2026-08-02T00:00:00.000Z",
    }),
  ];
  const series = buildMonthlySeries(state, rows, ["2026-08"], NOW);
  assert.equal(series[0].expense, 0);
  assert.equal(series[0].hasData, false);
});

test("empty period summary reports no data without inventing values", () => {
  const series = buildMonthlySeries(makeCashflow([]), [], listMonthKeysInclusive("2026-01", "2026-06"), NOW);
  const summary = buildHistoricalSummary(series);
  assert.equal(summary.hasAnyData, false);
  assert.equal(summary.totalIncome, 0);
  assert.equal(summary.totalExpenses, 0);
  assert.equal(summary.highestIncomeMonth, null);
  assert.equal(summary.highestExpenseMonth, null);
});
