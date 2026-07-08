import type { CashflowDashboardState, IncomeEntry } from "@/components/cashflow/types";
import { currentMonthKey, entryAppliesToMonth } from "@/components/cashflow/cashflow-metrics";
import type { CashflowLiveMetrics } from "@/lib/cashflow/cashflow-live-metrics";
import { previousMonthKey, readMonthlyExpenseFromModule } from "@/lib/cashflow/cashflow-live-metrics";
import { sumIncome } from "@/components/cashflow/cashflow-metrics";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";

export type CashflowWorkspaceInsight = {
  id: string;
  message: string;
  tone: "positive" | "warning" | "neutral" | "info";
};

export function formatShortDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getIncomeEntriesForMonth(state: CashflowDashboardState, monthKey = currentMonthKey()): IncomeEntry[] {
  return (state.incomeEntries ?? []).filter((entry) => entryAppliesToMonth(entry, monthKey));
}

export function sortIncomeEntriesByDateDesc(entries: IncomeEntry[]): IncomeEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function buildCashflowInsights(args: {
  live: CashflowLiveMetrics;
  state: CashflowDashboardState;
}): CashflowWorkspaceInsight[] {
  const { live, state } = args;
  const insights: CashflowWorkspaceInsight[] = [];

  if (live.savingsRatePct !== null && live.monthlyIncome > 0) {
    insights.push({
      id: "savings-rate",
      message: `You saved ${live.savingsRatePct.toFixed(0)}% this month.`,
      tone: live.savingsRatePct >= 25 ? "positive" : "neutral",
    });
  }

  const prevKey = previousMonthKey();
  const prevExpense = readMonthlyExpenseFromModule(prevKey);
  if (prevExpense > 0 && live.monthlyExpense > 0) {
    const expenseChangePct = Math.round(((live.monthlyExpense - prevExpense) / prevExpense) * 100);
    if (expenseChangePct > 0) {
      insights.push({
        id: "expense-up",
        message: `Expenses increased ${expenseChangePct}%.`,
        tone: expenseChangePct > 10 ? "warning" : "neutral",
      });
    } else if (expenseChangePct < 0) {
      insights.push({
        id: "expense-down",
        message: `Expenses decreased ${Math.abs(expenseChangePct)}%.`,
        tone: "positive",
      });
    }
  }

  const potentialSave = live.monthlyIncome - live.monthlyExpense;
  if (potentialSave > 0 && live.totalSavings < potentialSave) {
    const gap = Math.max(0, potentialSave - (live.totalSavings % Math.max(live.monthlyIncome, 1)));
    if (gap >= 1000) {
      insights.push({
        id: "save-more",
        message: `You can save ${formatNpr(Math.min(gap, potentialSave))} more.`,
        tone: "info",
      });
    }
  }

  if (live.savingsRatePct !== null && live.savingsRatePct >= 30 && live.netCashflow >= 0) {
    insights.push({
      id: "health",
      message: "Excellent financial health.",
      tone: "positive",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "start",
      message: live.monthlyIncome <= 0 ? "Add income to unlock cashflow insights." : "Keep tracking income to build your FIRE picture.",
      tone: "neutral",
    });
  }

  return insights.slice(0, 4);
}

export function monthlyComparisonLabel(live: CashflowLiveMetrics): string {
  if (live.netCashflowChangePct === null) return "First month tracking";
  const sign = live.netCashflowChangePct >= 0 ? "+" : "";
  return `${sign}${live.netCashflowChangePct.toFixed(0)}% vs last month`;
}

export function heroStatusMessage(live: CashflowLiveMetrics): string {
  if (live.monthlyIncome <= 0) return "Add income to see your financial status.";
  if (live.savingsRatePct === null) return "Connect savings to unlock your savings rate.";
  return `You saved ${live.savingsRatePct.toFixed(0)}% of your income this month.`;
}
