import type { CashflowDashboardState, ExpenseCategoryKey, IncomeEntry, IncomeSourceKey } from "@/components/cashflow/types";
import type { Expense } from "@/lib/expense-utils";

import type { IncomeFrequency } from "@/lib/cashflow/income-types";

function finiteNonNeg(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function entryAppliesToMonth(entry: IncomeEntry, monthKey: string): boolean {
  const frequency: IncomeFrequency = entry.frequency ?? (entry.repeatMonthly ? "monthly" : "once");
  if (frequency === "monthly" || frequency === "weekly") return true;
  if (frequency === "yearly") {
    const [, month] = monthKey.split("-");
    return entry.date.slice(5, 7) === month;
  }
  return entry.date.startsWith(monthKey);
}

export function entryMonthlyAmount(entry: IncomeEntry, monthKey: string): number {
  if (!entryAppliesToMonth(entry, monthKey)) return 0;
  const frequency: IncomeFrequency = entry.frequency ?? (entry.repeatMonthly ? "monthly" : "once");
  const amount = finiteNonNeg(entry.amount);
  if (frequency === "weekly") return Math.round(amount * 4);
  if (frequency === "yearly") return Math.round(amount / 12);
  return amount;
}

export function sumIncomeEntriesForMonth(state: CashflowDashboardState, monthKey = currentMonthKey()): number {
  const entries = state.incomeEntries ?? [];
  return entries.reduce((acc, entry) => acc + entryMonthlyAmount(entry, monthKey), 0);
}

export function sumLegacyIncome(state: CashflowDashboardState): number {
  const keys: IncomeSourceKey[] = [
    "salary",
    "overtime",
    "rentalIncome",
    "dividendIncome",
    "depositInterestIncome",
    "freelanceIncome",
    "businessIncome",
    "socialMediaIncome",
  ];
  return keys.reduce((acc, k) => acc + finiteNonNeg(state.income[k]), 0);
}

export function sumIncome(state: CashflowDashboardState, monthKey = currentMonthKey()): number {
  return sumIncomeEntriesForMonth(state, monthKey) + sumLegacyIncome(state);
}

/** Sum expense transactions recorded in the Expense module for a calendar month. */
export function sumExpensesForMonth(expenses: Expense[], monthKey = currentMonthKey()): number {
  return expenses.reduce((acc, expense) => {
    if (!expense.date.startsWith(monthKey)) return acc;
    return acc + finiteNonNeg(expense.amount);
  }, 0);
}

export function sumExpenseCategories(state: CashflowDashboardState): number {
  const keys: ExpenseCategoryKey[] = [
    "rent",
    "food",
    "transportation",
    "familySupport",
    "emiLoans",
    "entertainment",
    "insurance",
  ];
  return keys.reduce((acc, k) => acc + finiteNonNeg(state.expenses[k]), 0);
}

/** Monthly outflows used for savings rate, runway, and investable cashflow. */
export function monthlyBurn(state: CashflowDashboardState, autoExpenseTotal?: number): number {
  if (typeof autoExpenseTotal === "number" && autoExpenseTotal > 0) return autoExpenseTotal;
  const o = finiteNonNeg(state.monthlyExpensesOverride);
  if (o > 0) return o;
  return sumExpenseCategories(state);
}

export function coverageMonths(state: CashflowDashboardState): number | null {
  const reserve = finiteNonNeg(state.emergencyCashReserve);
  const burn = monthlyBurn(state);
  if (burn <= 0) return null;
  return reserve / burn;
}

export function savingsRatePct(state: CashflowDashboardState, autoExpenseTotal?: number, monthKey = currentMonthKey()): number | null {
  const inc = sumIncome(state, monthKey);
  if (inc <= 0) return null;
  const burn = monthlyBurn(state, autoExpenseTotal);
  return ((inc - burn) / inc) * 100;
}

export function investableCashflow(state: CashflowDashboardState, autoExpenseTotal?: number, monthKey = currentMonthKey()): number {
  return sumIncome(state, monthKey) - monthlyBurn(state, autoExpenseTotal);
}

/**
 * Composite 0–100: mostly savings rate, with a boost for emergency runway (up to ~6 months fully reflected).
 * Not net-worth–based; pairs with the cashflow module only.
 */
export function fireSpeedScore(state: CashflowDashboardState): number | null {
  const sr = savingsRatePct(state);
  if (sr === null) return null;
  const cov = coverageMonths(state);
  const runwayPts =
    cov === null ? 0 : Math.min(25, (Math.min(cov, 12) / 12) * 25);
  const savingsPts = Math.min(75, Math.max(0, sr) * 0.75);
  return Math.round(Math.min(100, savingsPts + runwayPts));
}
