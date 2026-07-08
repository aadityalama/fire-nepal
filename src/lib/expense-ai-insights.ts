import {
  categoryTotalsForMonth,
  highestSpenderForMonth,
  normalizeCategory,
} from "@/lib/expense-analytics";
import { isInvestmentCategory } from "@/lib/finance/categories";
import type { Currency, Expense, RoommateProfile } from "@/lib/expense-utils";
import { expenseMonthKey, formatMoney, getSettlement } from "@/lib/expense-utils";
import { formatMonthLabel, listMonthKeys } from "@/lib/expense-storage";
import { memberDisplayName } from "@/lib/expense-members";

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

function livingExpenseTotal(expenses: Expense[]) {
  return expenses
    .filter((expense) => !isInvestmentCategory(expense.category))
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
  profiles: Record<string, RoommateProfile>,
): AiInsight[] {
  const insights: AiInsight[] = [];
  const monthKeys = listMonthKeys(expenses);
  const previousMonthKey = monthKeys[monthKeys.indexOf(selectedMonthKey) + 1];
  const currentMonth = expenses.filter((expense) => expenseMonthKey(expense.date) === selectedMonthKey);
  const previousMonth = previousMonthKey
    ? expenses.filter((expense) => expenseMonthKey(expense.date) === previousMonthKey)
    : [];

  const currentTotal = livingExpenseTotal(currentMonth);
  const previousTotal = livingExpenseTotal(previousMonth);
  const totalChange = percentChange(currentTotal, previousTotal);

  if (previousMonth.length) {
    insights.push({
      id: "monthly-total",
      title: "Monthly spending trend",
      message:
        totalChange >= 0
          ? `Living expenses increased ${totalChange}% vs ${formatMonthLabel(previousMonthKey)}. Review high categories before salary week.`
          : `Great control — living expenses decreased ${Math.abs(totalChange)}% compared to last month.`,
      tone: totalChange > 12 ? "warning" : totalChange < 0 ? "positive" : "neutral",
      metric: formatMoney(currentTotal, currency),
    });
  }

  const foodNow = categoryTotal(currentMonth, "Food");
  const foodPrev = categoryTotal(previousMonth, "Food");
  const foodChange = percentChange(foodNow, foodPrev);
  if (foodNow > 0) {
    insights.push({
      id: "food-trend",
      title: "Food intelligence",
      message:
        foodPrev > 0 && foodChange > 5
          ? `Food expenses increased ${foodChange}% this month — grocery runs are trending higher.`
          : foodPrev > 0 && foodChange < -5
            ? `Food spending dropped ${Math.abs(foodChange)}% — strong discipline on groceries.`
            : "Food spending trend is stable this month.",
      tone: foodChange > 15 ? "warning" : "info",
      metric: formatMoney(foodNow, currency),
    });
  }

  const utilitiesNow = categoryTotal(currentMonth, "Utilities");
  const utilitiesPrev = categoryTotal(previousMonth, "Utilities");
  const avgUtilities =
    monthKeys.length > 1
      ? expenses
          .filter((expense) => normalizeCategory(expense.category) === "Utilities")
          .reduce((sum, expense) => sum + expense.amount, 0) / Math.max(monthKeys.length, 1)
      : utilitiesNow;

  if (utilitiesNow > avgUtilities * 1.08 && utilitiesNow > 0) {
    insights.push({
      id: "utilities-warning",
      title: "Utilities alert",
      message: "Utilities spending is higher than your recent average — check electricity, internet, or billing cycle.",
      tone: "warning",
      metric: formatMoney(utilitiesNow, currency),
    });
  } else if (utilitiesPrev > 0) {
    const utilitiesChange = percentChange(utilitiesNow, utilitiesPrev);
    insights.push({
      id: "utilities-compare",
      title: "Utilities comparison",
      message:
        utilitiesChange > 10
          ? `Utilities are up ${utilitiesChange}% vs last month.`
          : `Utility costs are ${utilitiesChange <= 0 ? "under control" : "slightly elevated"} this month.`,
      tone: utilitiesChange > 10 ? "warning" : "neutral",
    });
  }

  const investmentNow = categoryTotal(currentMonth, "Investment");
  const investmentPrev = categoryTotal(previousMonth, "Investment");
  if (investmentNow > 0) {
    const investmentChange = percentChange(investmentNow, investmentPrev);
    insights.push({
      id: "investment-allocation",
      title: "Investment allocation",
      message:
        investmentPrev > 0 && investmentChange !== 0
          ? `Investment contributions are ${investmentChange > 0 ? "up" : "down"} ${Math.abs(investmentChange)}% vs last month — tracked separately from living expenses.`
          : "Investment contributions are tracked separately from everyday spending.",
      tone: "positive",
      metric: formatMoney(investmentNow, currency),
    });
  }

  const { paidByMember, totalExpense } = getSettlement(members, currentMonth);
  const top = highestSpenderForMonth(currentMonth, members);
  if (totalExpense > 0 && top.total > 0) {
    const share = Math.round((top.total / totalExpense) * 100);
    insights.push({
      id: "top-contributor",
      title: "Contribution leaderboard",
      message: `${memberDisplayName(top.id, profiles)} contributed ${share}% of all expenses this month — highest group contribution.`,
      tone: share > 45 ? "info" : "neutral",
      metric: formatMoney(top.total, currency),
    });
  }

  const categoryTotals = categoryTotalsForMonth(currentMonth).filter((entry) => !isInvestmentCategory(entry.category));
  const highestCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];
  if (highestCategory?.total > 0) {
    insights.push({
      id: "top-category",
      title: "Highest expense category",
      message: `${highestCategory.category} leads living expenses at ${formatMoney(highestCategory.total, currency)}. Consider a shared budget cap.`,
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
  if (foodChange > 12) suggestions.push("Batch grocery shopping weekly to reduce impulse buys.");
  if (categoryTotal(currentMonth, "Emergency") > currentTotal * 0.15) {
    suggestions.push("Emergency spending is elevated — review one-off costs and rebuild your buffer.");
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

export function contributionLeaderboard(
  expenses: Expense[],
  members: string[],
  monthKey: string,
  profiles: Record<string, RoommateProfile>,
) {
  const monthExpenses = expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
  const { paidByMember, totalExpense } = getSettlement(members, monthExpenses);
  return members
    .map((id) => ({
      id,
      name: memberDisplayName(id, profiles),
      total: paidByMember[id] ?? 0,
      share: totalExpense > 0 ? Math.round(((paidByMember[id] ?? 0) / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
