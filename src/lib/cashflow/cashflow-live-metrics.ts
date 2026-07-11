import type { CashflowDashboardState } from "@/components/cashflow/types";
import { currentMonthKey, sumIncome } from "@/components/cashflow/cashflow-metrics";
import { loadPersonalExpenseState } from "@/lib/personal-expense-storage";
import { sumExpensesForMonth } from "@/components/cashflow/cashflow-metrics";
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

export function computeCashflowLiveMetrics(state: CashflowDashboardState, now = new Date()): CashflowLiveMetrics {
  const monthKey = currentMonthKey(now);
  const prevKey = previousMonthKey(now);
  const monthlyIncome = sumIncome(state, monthKey);
  const monthlyExpense = readMonthlyExpenseFromModule(monthKey);
  const totalSavings = readTotalSavingsFromModule();
  const remainingCash = monthlyIncome - monthlyExpense;
  const netCashflow = remainingCash;
  const savingsRatePct = monthlyIncome > 0 ? (totalSavings / monthlyIncome) * 100 : null;
  const days = daysInCurrentMonth(now);
  const burnRateDaily = days > 0 ? monthlyExpense / days : 0;

  const prevIncome = sumIncome(state, prevKey);
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
    points.push({ month: monthLabel, income: sumIncome(state, monthKey) });
  }
  return points;
}

export function hasIncomeChartData(data: Array<{ income: number }>) {
  return data.some((point) => point.income > 0);
}
