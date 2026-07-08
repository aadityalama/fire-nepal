import type { CashflowDerivedMetrics } from "@/components/cashflow/hooks/useCashflowPersistedState";
import type { FinancialIntelMonthRollup } from "@/components/financial-intelligence/monthly-rollup-storage";
import type { FinancialIntelligenceModel } from "@/components/financial-intelligence";
import {
  formatNpr,
  getDueDate,
  getExpenseStatus,
  parseIsoDate,
  sortByDueDate,
  upcomingPaymentsTotal,
} from "@/components/expense-workspace/expense-workspace-utils";
import { loadPayslipHistoryState } from "@/components/payslip-import/payslip-history-storage";
import type { ExpenseWorkspaceMeta } from "@/lib/expense-workspace-ui";
import type { Expense } from "@/lib/expense-utils";

export type CashflowWorkspaceInsight = {
  id: string;
  message: string;
  tone: "positive" | "warning" | "neutral" | "info";
};

export type CashflowTodaySummary = {
  incomeTodayNpr: number;
  expenseTodayNpr: number;
  netTodayNpr: number;
  transactionsToday: number;
};

export type CashflowUpcomingPayment = {
  expense: Expense;
  meta?: ExpenseWorkspaceMeta;
  expenseDateLabel: string;
  dueDateLabel: string;
  remainingLabel: string;
  statusLabel: string;
  tone: ReturnType<typeof getExpenseStatus>["tone"];
};

export function formatShortDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export function formatShortDayMonth(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function incomeFromPayslipOnDate(iso: string) {
  const entries = loadPayslipHistoryState().entries;
  return entries.reduce((sum, entry) => {
    if (entry.parsed.payDate !== iso || !entry.applied) return sum;
    return sum + (entry.appliedSalaryNpr ?? 0) + (entry.appliedOvertimeNpr ?? 0);
  }, 0);
}

export function buildTodaySummary(expenses: Expense[], todayIso: string): CashflowTodaySummary {
  const todayExpenses = expenses.filter((expense) => expense.date === todayIso);
  const expenseTodayNpr = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const incomeTodayNpr = incomeFromPayslipOnDate(todayIso);
  const payslipCount = loadPayslipHistoryState().entries.filter(
    (entry) => entry.applied && entry.parsed.payDate === todayIso,
  ).length;

  return {
    incomeTodayNpr,
    expenseTodayNpr,
    netTodayNpr: incomeTodayNpr - expenseTodayNpr,
    transactionsToday: todayExpenses.length + payslipCount,
  };
}

export function buildUpcomingPayments(
  expenses: Expense[],
  metaMap: Record<number, ExpenseWorkspaceMeta>,
  today = new Date(),
  limit = 8,
): CashflowUpcomingPayment[] {
  return sortByDueDate(expenses, metaMap)
    .filter((expense) => {
      const meta = metaMap[expense.id];
      if (meta?.paidAt || meta?.cancelled) return false;
      const status = getExpenseStatus(expense, meta, today);
      return status.tone !== "completed" && status.tone !== "cancelled";
    })
    .slice(0, limit)
    .map((expense) => {
      const meta = metaMap[expense.id];
      const status = getExpenseStatus(expense, meta, today);
      const dueDate = getDueDate(expense, meta);
      return {
        expense,
        meta,
        expenseDateLabel: formatShortDayMonth(expense.date),
        dueDateLabel: formatShortDayMonth(dueDate),
        remainingLabel: status.remainingLabel,
        statusLabel: status.label,
        tone: status.tone,
      };
    });
}

export function buildCashflowTrendData(intelRollups: FinancialIntelMonthRollup[]) {
  const sorted = [...intelRollups].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  if (sorted.length === 0) return [];

  return sorted.map((rollup) => {
    const monthLabel = new Date(`${rollup.month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short" });
    return {
      month: monthLabel,
      net: rollup.incomeNpr - rollup.burnNpr,
      income: rollup.incomeNpr,
      expense: rollup.burnNpr,
    };
  });
}

export function buildCashflowWorkspaceInsights(args: {
  metrics: CashflowDerivedMetrics;
  intelModel: FinancialIntelligenceModel;
  intelRollups: FinancialIntelMonthRollup[];
  expenses: Expense[];
  metaMap: Record<number, ExpenseWorkspaceMeta>;
}): CashflowWorkspaceInsight[] {
  const { metrics, intelModel, intelRollups, expenses, metaMap } = args;
  const insights: CashflowWorkspaceInsight[] = [];
  const today = new Date();

  const sortedRollups = [...intelRollups].sort((a, b) => b.month.localeCompare(a.month));
  const current = sortedRollups[0];
  const previous = sortedRollups[1];
  if (current && previous && previous.burnNpr > 0) {
    const changePct = Math.round(((current.burnNpr - previous.burnNpr) / previous.burnNpr) * 100);
    if (changePct < 0) {
      insights.push({
        id: "spend-down",
        message: `You spent ${Math.abs(changePct)}% less than last month.`,
        tone: "positive",
      });
    } else if (changePct > 0) {
      insights.push({
        id: "spend-up",
        message: `You spent ${changePct}% more than last month.`,
        tone: changePct > 12 ? "warning" : "neutral",
      });
    }
  } else if (intelModel.monthlyReport.savingsRateTrend === "up") {
    insights.push({
      id: "savings-trend",
      message: "Your savings trajectory is improving this month.",
      tone: "positive",
    });
  }

  const dueTomorrow = expenses.find((expense) => {
    const meta = metaMap[expense.id];
    if (meta?.paidAt || meta?.cancelled) return false;
    return getExpenseStatus(expense, meta, today).tone === "tomorrow";
  });
  if (dueTomorrow) {
    insights.push({
      id: "due-tomorrow",
      message: `Your ${dueTomorrow.title.toLowerCase()} is due tomorrow.`,
      tone: "warning",
    });
  }

  const dueNext7 = upcomingPaymentsTotal(expenses, metaMap, 7, today);
  if (dueNext7 > 0) {
    insights.push({
      id: "due-7-days",
      message: `You have ${formatNpr(dueNext7)} due within the next 7 days.`,
      tone: "info",
    });
  }

  if (metrics.totalIncome > 0 && metrics.savingsRatePct !== null) {
    const utilization = Math.max(0, Math.min(100, 100 - metrics.savingsRatePct));
    insights.push({
      id: "budget-utilization",
      message: `Your budget utilization reached ${utilization.toFixed(0)}%.`,
      tone: utilization > 85 ? "warning" : "neutral",
    });
  }

  const overdueCount = expenses.filter((expense) => {
    const meta = metaMap[expense.id];
    if (meta?.paidAt || meta?.cancelled) return false;
    return getExpenseStatus(expense, meta, today).tone === "overdue";
  }).length;
  if (overdueCount > 0) {
    insights.push({
      id: "overdue",
      message: `${overdueCount} expense${overdueCount === 1 ? "" : "s"} ${overdueCount === 1 ? "is" : "are"} overdue.`,
      tone: "warning",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "getting-started",
      message: "Add expenses and income to unlock personalized cashflow insights.",
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}

export function monthlyProgressPercent(now = new Date()) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((now.getDate() / daysInMonth) * 100);
}
