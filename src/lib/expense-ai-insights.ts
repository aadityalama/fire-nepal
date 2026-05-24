import {
  EXPENSE_CATEGORIES,
  categoryTotalsForMonth,
  highestSpenderForMonth,
  normalizeCategory,
} from "@/lib/expense-analytics";
import type { Expense } from "@/lib/expense-utils";
import { expenseMonthKey, formatMoney, getSettlement } from "@/lib/expense-utils";
import { formatMonthLabel, listMonthKeys } from "@/lib/expense-storage";
import type { Currency } from "@/lib/expense-utils";

export type InsightTone = "positive" | "warning" | "neutral" | "info";

export type AiInsight = {
  id: string;
  title: string;
  message: string;
  tone: InsightTone;
  metric?: string;
};

function categoryTotal(expenses: Expense[], category: string) {
  return expenses
    .filter((expense) => normalizeCategory(expense.category) === category)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function generateAiInsights(
  expenses: Expense[],
  members: string[],
  selectedMonthKey: string,
  currency: Currency,
): AiInsight[] {
  const insights: AiInsight[] = [];
  const monthKeys = listMonthKeys(expenses);
  const previousMonthKey = monthKeys[monthKeys.indexOf(selectedMonthKey) + 1];
  const currentMonth = expenses.filter((expense) => expenseMonthKey(expense.date) === selectedMonthKey);
  const previousMonth = previousMonthKey
    ? expenses.filter((expense) => expenseMonthKey(expense.date) === previousMonthKey)
    : [];

  const currentTotal = currentMonth.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotal = previousMonth.reduce((sum, expense) => sum + expense.amount, 0);
  const totalChange = percentChange(currentTotal, previousTotal);

  if (previousMonth.length) {
    insights.push({
      id: "monthly-total",
      title: "Monthly spending trend",
      message:
        totalChange >= 0
          ? `Group spending increased ${totalChange}% vs ${formatMonthLabel(previousMonthKey)}. Review high categories before salary week.`
          : `Great control — spending decreased ${Math.abs(totalChange)}% compared to last month.`,
      tone: totalChange > 12 ? "warning" : totalChange < 0 ? "positive" : "neutral",
      metric: formatMoney(currentTotal, currency),
    });
  }

  const foodNow = categoryTotal(currentMonth, "Food/Mart");
  const foodPrev = categoryTotal(previousMonth, "Food/Mart");
  const foodChange = percentChange(foodNow, foodPrev);
  if (foodNow > 0) {
    insights.push({
      id: "food-trend",
      title: "Food / Mart intelligence",
      message:
        foodPrev > 0 && foodChange > 5
          ? `Food expenses increased ${foodChange}% this month — mart runs are trending higher.`
          : foodPrev > 0 && foodChange < -5
            ? `Food spending dropped ${Math.abs(foodChange)}% — strong discipline on groceries.`
            : "Mart spending trend is stable this month.",
      tone: foodChange > 15 ? "warning" : "info",
      metric: formatMoney(foodNow, currency),
    });
  }

  const electricityNow = categoryTotal(currentMonth, "Electricity");
  const electricityPrev = categoryTotal(previousMonth, "Electricity");
  const avgElectricity =
    monthKeys.length > 1
      ? expenses
          .filter((expense) => normalizeCategory(expense.category) === "Electricity")
          .reduce((sum, expense) => sum + expense.amount, 0) / Math.max(monthKeys.length, 1)
      : electricityNow;

  if (electricityNow > avgElectricity * 1.08 && electricityNow > 0) {
    insights.push({
      id: "electricity-warning",
      title: "Utility alert",
      message: "Electricity spending is higher than your recent average — check heater usage or billing cycle.",
      tone: "warning",
      metric: formatMoney(electricityNow, currency),
    });
  } else if (electricityPrev > 0) {
    const elecChange = percentChange(electricityNow, electricityPrev);
    insights.push({
      id: "electricity-compare",
      title: "Electricity comparison",
      message:
        elecChange > 10
          ? `Electricity is up ${elecChange}% vs last month.`
          : `Electricity costs are ${elecChange <= 0 ? "under control" : "slightly elevated"} this month.`,
      tone: elecChange > 10 ? "warning" : "neutral",
    });
  }

  const { paidByMember, totalExpense } = getSettlement(members, currentMonth);
  const top = highestSpenderForMonth(currentMonth, members);
  if (totalExpense > 0 && top.total > 0) {
    const share = Math.round((top.total / totalExpense) * 100);
    insights.push({
      id: "top-contributor",
      title: "Contribution leaderboard",
      message: `${top.name} contributed ${share}% of all expenses this month — highest group contribution.`,
      tone: share > 45 ? "info" : "neutral",
      metric: formatMoney(top.total, currency),
    });
  }

  const categoryTotals = categoryTotalsForMonth(currentMonth);
  const highestCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];
  if (highestCategory?.total > 0) {
    insights.push({
      id: "top-category",
      title: "Highest expense category",
      message: `${highestCategory.category} leads spending at ${formatMoney(highestCategory.total, currency)}. Consider a shared budget cap.`,
      tone: "info",
    });
  }

  const pending = getSettlement(members, currentMonth).transfers.length;
  if (pending === 0 && currentMonth.length > 0) {
    insights.push({
      id: "settled",
      title: "Settlement status",
      message: "All roommate balances are clear this month — no pending transfers.",
      tone: "positive",
    });
  } else if (pending > 0) {
    insights.push({
      id: "pending-settlement",
      title: "Smart settlement warning",
      message: `${pending} transfer${pending === 1 ? "" : "s"} still pending. Settle before month-end to avoid confusion.`,
      tone: "warning",
    });
  }

  const suggestions: string[] = [];
  if (foodChange > 12) suggestions.push("Batch mart shopping weekly to reduce impulse buys.");
  if (categoryTotal(currentMonth, "Remittance") > currentTotal * 0.2) {
    suggestions.push("Remittance fees are heavy — compare transfer apps for lower FX cost.");
  }
  if (totalChange > 10) suggestions.push("Enable receipt uploads for every large expense to audit spikes.");

  if (suggestions.length) {
    insights.push({
      id: "suggestions",
      title: "AI savings suggestions",
      message: suggestions.join(" "),
      tone: "positive",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "empty",
      title: "Getting started",
      message: "Add expenses with receipts to unlock AI-powered spending insights and trends.",
      tone: "neutral",
    });
  }

  return insights;
}

export function contributionLeaderboard(expenses: Expense[], members: string[], monthKey: string) {
  const monthExpenses = expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
  const { paidByMember, totalExpense } = getSettlement(members, monthExpenses);
  return members
    .map((name) => ({
      name,
      total: paidByMember[name] ?? 0,
      share: totalExpense > 0 ? Math.round(((paidByMember[name] ?? 0) / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
