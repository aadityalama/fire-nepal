/**
 * Regression: Cashflow Total Income must equal Income Sources for the current month.
 * Reproduces July Salary 400k + Bonuses 70k yearly + Home Income 100k monthly.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import {
  entryAppliesToMonth,
  entryMonthlyAmount,
  sumVisibleIncomeSourcesForMonth,
} from "../src/components/cashflow/cashflow-metrics.ts";
import { computeCashflowLiveMetrics } from "../src/lib/cashflow/cashflow-live-metrics.ts";
import { getIncomeEntriesForMonth } from "../src/components/cashflow-workspace/cashflow-workspace-utils.ts";

const NOW = new Date(2026, 6, 15); // July 2026 — anniversary month for yearly bonus dated July
const MONTH_KEY = "2026-07";

function makeState(entries) {
  const state = defaultCashflowState();
  state.incomeEntries = entries;
  // Ensure legacy buckets do not inflate totals for this case
  for (const key of Object.keys(state.income)) {
    state.income[key] = 0;
  }
  return state;
}

const CASE_ENTRIES = [
  {
    id: "salary-1",
    name: "July Salary",
    amount: 400000,
    incomeType: "salary",
    frequency: "monthly",
    date: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "bonus-1",
    name: "Bonuses",
    amount: 70000,
    incomeType: "bonus",
    frequency: "yearly",
    date: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "home-1",
    name: "Home Income",
    amount: 100000,
    incomeType: "rental",
    frequency: "monthly",
    date: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

test("yearly bonus applies only in anniversary month with full recorded amount (not /12)", () => {
  const bonus = CASE_ENTRIES[1];
  assert.equal(entryAppliesToMonth(bonus, "2026-07"), true);
  assert.equal(entryAppliesToMonth(bonus, "2026-08"), false);
  assert.equal(entryMonthlyAmount(bonus, "2026-07"), 70000);
  assert.equal(entryMonthlyAmount(bonus, "2026-08"), 0);
  // Historical bug: Math.round(70000/12) === 5833 produced Total Income 505833
  assert.notEqual(entryMonthlyAmount(bonus, "2026-07"), Math.round(70000 / 12));
});

test("Income Sources list and Total Income both equal 570000 for the reported case", () => {
  const state = makeState(CASE_ENTRIES);
  const visible = getIncomeEntriesForMonth(state, MONTH_KEY);
  assert.equal(visible.length, 3);

  const sourcesSum = visible.reduce((sum, entry) => sum + entryMonthlyAmount(entry, MONTH_KEY), 0);
  assert.equal(sourcesSum, 570000);

  const totalIncome = sumVisibleIncomeSourcesForMonth(state, MONTH_KEY);
  assert.equal(totalIncome, sourcesSum);
  assert.equal(totalIncome, 400000 + 70000 + 100000);

  // Must not reproduce the amortized bug total
  assert.notEqual(totalIncome, 505833);
});

test("Net Cashflow = corrected Total Income − Total Expenses", () => {
  const state = makeState(CASE_ENTRIES);
  // Stub expense module via direct live metrics math (expense read needs window);
  // verify income side + net identity: remainingCash === monthlyIncome − monthlyExpense
  const income = sumVisibleIncomeSourcesForMonth(state, MONTH_KEY);
  const expenses = 65000;
  const net = income - expenses;
  assert.equal(income, 570000);
  assert.equal(net, 505000);

  const live = computeCashflowLiveMetrics(state, NOW);
  assert.equal(live.monthKey, MONTH_KEY);
  assert.equal(live.monthlyIncome, 570000);
  // Without a browser expense cache, expense is 0 in this unit environment
  assert.equal(live.netCashflow, live.monthlyIncome - live.monthlyExpense);
  assert.equal(live.remainingCash, live.netCashflow);
});

test("displayed Income Source period amounts equal Total Income (weekly uses monthly equiv)", () => {
  const state = makeState([
    {
      id: "w1",
      name: "Weekly gig",
      amount: 10000,
      incomeType: "freelance",
      frequency: "weekly",
      date: "2026-07-01",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "m1",
      name: "Salary",
      amount: 200000,
      incomeType: "salary",
      frequency: "monthly",
      date: "2026-07-01",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ]);
  const visible = getIncomeEntriesForMonth(state, MONTH_KEY);
  const cardTotal = visible.reduce((sum, entry) => sum + entryMonthlyAmount(entry, MONTH_KEY), 0);
  assert.equal(cardTotal, 10000 * 4 + 200000);
  assert.equal(sumVisibleIncomeSourcesForMonth(state, MONTH_KEY), cardTotal);
});
