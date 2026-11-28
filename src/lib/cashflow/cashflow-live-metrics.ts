import type { CashflowDashboardState } from "@/components/cashflow/types";
import {
  currentMonthKey,
  sumEligibleLivingExpensesForMonth,
  sumExpensesForMonth,
  sumVisibleIncomeSourcesForMonth,
} from "@/components/cashflow/cashflow-metrics";
import { isEligibleLivingExpenseCategory } from "@/lib/finance/categories";
import { loadPersonalExpenseState } from "@/lib/personal-expense-storage";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { computeDashboardSummary } from "@/lib/savings/savings-utils";

export function previousMonthKey(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return currentMonthKey(d);
}

export function daysInCurrentMonth(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export type CashflowLiveMetrics = {
  monthKey: string;
  monthlyIncome: number;
  monthlyExpense: number;
  /** Living spend only — excludes Investment / Savings / Emergency contribution categories. */
  monthlyLivingExpense: number;
  totalSavings: number;
  remainingCash: number;
  netCashflow: number;
  savingsRatePct: number | null;
  burnRateDaily: number;
  previousMonthNetCashflow: number;
  netCashflowChangePct: number | null;
};

export function readTotalSavingsFromModule(): number {
  if (typeof window === "undefined") return 0;
  const savingsState = loadSavingsWorkspaceState();
  return computeDashboardSummary(savingsState.goals, savingsState.transactions).totalSavingsNpr;
}

export function readMonthlyExpenseFromModule(monthKey = currentMonthKey()): number {
  if (typeof window === "undefined") return 0;
  const expenseState = loadPersonalExpenseState();
  return sumExpensesForMonth(expenseState?.expenses ?? [], monthKey);
}

/** Eligible living expenses only (excludes investment/savings/EF contribution categories). */
export function readMonthlyLivingExpenseFromModule(monthKey = currentMonthKey()): number {
  if (typeof window === "undefined") return 0;
  const expenseState = loadPersonalExpenseState();
  return sumEligibleLivingExpensesForMonth(
    expenseState?.expenses ?? [],
    monthKey,
    isEligibleLivingExpenseCategory,
  );
}

export function computeCashflowLiveMetrics(state: CashflowDashboardState, now = new Date()): CashflowLiveMetrics {
  const monthKey = currentMonthKey(now);
  const prevKey = previousMonthKey(now);
  // Total Income must equal the sum of Income Sources cards for this month
  // (same filter + period amounts — do not amortize yearly as amount/12).
  const monthlyIncome = sumVisibleIncomeSourcesForMonth(state, monthKey);
  const monthlyExpense = readMonthlyExpenseFromModule(monthKey);
  const monthlyLivingExpense = readMonthlyLivingExpenseFromModule(monthKey);
  const totalSavings = readTotalSavingsFromModule();
  const remainingCash = monthlyIncome - monthlyExpense;
  const netCashflow = remainingCash;
  const savingsRatePct = monthlyIncome > 0 ? (totalSavings / monthlyIncome) * 100 : null;
  const days = daysInCurrentMonth(now);
  const burnRateDaily = days > 0 ? monthlyExpense / days : 0;

  const prevIncome = sumVisibleIncomeSourcesForMonth(state, prevKey);
  const prevExpense = readMonthlyExpenseFromModule(prevKey);
  const previousMonthNetCashflow = prevIncome - prevExpense;
  const netCashflowChangePct =
    previousMonthNetCashflow !== 0
      ? ((netCashflow - previousMonthNetCashflow) / Math.abs(previousMonthNetCashflow)) * 100
      : null;

  return {
    monthKey,
    monthlyIncome,
    monthlyExpense,
    monthlyLivingExpense,
    totalSavings,
    remainingCash,
    netCashflow,
    savingsRatePct,
    burnRateDaily,
    previousMonthNetCashflow,
    netCashflowChangePct,
  };
}

export function buildIncomeHistoryChartData(state: CashflowDashboardState, months = 6, now = new Date()) {
  const points: Array<{ month: string; income: number }> = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = currentMonthKey(date);
    const monthLabel = date.toLocaleDateString("en-GB", { month: "short" });
    points.push({ month: monthLabel, income: sumVisibleIncomeSourcesForMonth(state, monthKey) });
  }
  return points;
}

export function hasIncomeChartData(data: Array<{ income: number }>) {
  return data.some((point) => point.income > 0);
}
