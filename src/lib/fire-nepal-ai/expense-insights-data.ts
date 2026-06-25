import { generateAiInsights } from "@/lib/expense-ai-insights";
import {
  buildMonthlyStatement,
  categoryTotalsForMonth,
  highestSpenderForMonth,
  monthlyComparisonData,
} from "@/lib/expense-analytics";
import type { DashboardPersistedState } from "@/lib/expense-storage";
import { currentMonthKey, expenseMonthKey, formatMoney } from "@/lib/expense-utils";
import { memberDisplayName } from "@/lib/expense-members";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import type { FireAiExpenseMetric } from "@/lib/fire-nepal-ai/types";

export function buildExpenseInsightMetrics(
  expenseState: DashboardPersistedState,
  summary: UnifiedFireSummary,
): { metrics: FireAiExpenseMetric[]; hasData: boolean } {
  const metrics: FireAiExpenseMetric[] = [];
  const monthKey = currentMonthKey();
  const currency = expenseState.displayCurrency ?? "NPR";
  const expenses = expenseState.expenses;
  const monthExpenses = expenses.filter((e) => expenseMonthKey(e.date) === monthKey);

  if (expenses.length === 0 && summary.monthlyExpenses <= 0) {
    return { metrics: [], hasData: false };
  }

  if (monthExpenses.length > 0) {
    const categoryTotals = categoryTotalsForMonth(monthExpenses)
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
    const top = categoryTotals[0];
    if (top) {
      metrics.push({
        id: "highest-category",
        label: "Highest category",
        value: top.category,
        detail: formatMoney(top.total, currency),
      });
    }

    const comparison = monthlyComparisonData(expenses, currency);
    const currentIdx = comparison.monthKeys.indexOf(monthKey);
    if (currentIdx >= 0 && currentIdx < comparison.monthKeys.length - 1) {
      const prevKey = comparison.monthKeys[currentIdx + 1]!;
      const currentTotal = comparison.data[currentIdx] ?? 0;
      const prevTotal = comparison.data[currentIdx + 1] ?? 0;
      if (prevTotal > 0) {
        const change = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
        metrics.push({
          id: "monthly-trend",
          label: "Monthly trend",
          value: change >= 0 ? `+${change}%` : `${change}%`,
          detail: `vs ${comparison.labels[currentIdx + 1] ?? "prior month"}`,
        });
      }
    }

    const foodNow = monthExpenses
      .filter((e) => e.category === "Food/Mart")
      .reduce((s, e) => s + e.amount, 0);
    const prevMonthKey = comparison.monthKeys[currentIdx + 1];
    const foodPrev = prevMonthKey
      ? expenses
          .filter((e) => expenseMonthKey(e.date) === prevMonthKey && e.category === "Food/Mart")
          .reduce((s, e) => s + e.amount, 0)
      : 0;
    if (foodNow > 0 && foodPrev > 0) {
      const foodChange = Math.round(((foodNow - foodPrev) / foodPrev) * 100);
      if (foodChange !== 0) {
        metrics.push({
          id: "food-change",
          label: "Food / Mart",
          value: foodChange > 0 ? `+${foodChange}%` : `${foodChange}%`,
          detail: foodChange > 0 ? "Increased" : "Decreased",
        });
      }
    }

    const transportNow = monthExpenses
      .filter((e) => normalizeTransport(e.category))
      .reduce((s, e) => s + e.amount, 0);
    const transportPrev = prevMonthKey
      ? expenses
          .filter((e) => expenseMonthKey(e.date) === prevMonthKey && normalizeTransport(e.category))
          .reduce((s, e) => s + e.amount, 0)
      : 0;
    if (transportNow > 0 && transportPrev > 0) {
      const transportChange = Math.round(((transportNow - transportPrev) / transportPrev) * 100);
      if (transportChange !== 0) {
        metrics.push({
          id: "transport-change",
          label: "Transport",
          value: transportChange > 0 ? `+${transportChange}%` : `${transportChange}%`,
          detail: transportChange > 0 ? "Increased" : "Decreased",
        });
      }
    }

    const highest = highestSpenderForMonth(monthExpenses, expenseState.members);
    if (highest.total > 0) {
      metrics.push({
        id: "top-spender",
        label: "Top spender",
        value: memberDisplayName(highest.id, expenseState.profiles),
        detail: formatMoney(highest.total, currency),
      });
    }

    const statement = buildMonthlyStatement(monthKey, expenses, expenseState.members);
    if (statement.transfers.length > 0) {
      metrics.push({
        id: "settlement",
        label: "Settlement",
        value: `${statement.transfers.length} pending`,
        detail: statement.settlementStatus,
      });
    }
  }

  if (summary.savingsRatePct !== null && summary.monthlyIncome > 0) {
    metrics.push({
      id: "saving-rate",
      label: "Saving rate",
      value: `${Math.round(summary.savingsRatePct)}%`,
      detail: "From cashflow dashboard",
    });
  }

  return { metrics, hasData: metrics.length > 0 };
}

function normalizeTransport(category: string): boolean {
  return category === "Transport" || category === "Transportation";
}
