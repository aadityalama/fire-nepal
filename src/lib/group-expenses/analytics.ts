import type { Currency, Expense } from "@/lib/expense-utils";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { currencyMeta, expenseMonthKey, formatMoney, getSettlement } from "@/lib/expense-utils";
import { formatGroupMonthLabel, listGroupMonthKeys } from "@/lib/group-expenses/storage";
import {
  GROUP_EXPENSE_CATEGORY_IDS,
  normalizeGroupCategory,
  type GroupExpenseCategoryId,
} from "@/lib/group-expenses/categories";

export const GROUP_EXPENSE_CATEGORIES = GROUP_EXPENSE_CATEGORY_IDS;

export function normalizeGroupExpenseCategory(category: string): GroupExpenseCategoryId {
  return normalizeGroupCategory(category);
}

export function groupCategoryTotalsForMonth(expenses: Expense[]) {
  return GROUP_EXPENSE_CATEGORY_IDS.map((category) => ({
    category,
    total: expenses
      .filter((expense) => normalizeGroupCategory(expense.category) === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
}

export function groupMonthlyComparisonData(
  expenses: Expense[],
  currency: Currency,
  limit = 6,
  krwPerNpr = FALLBACK_KRW_PER_NPR,
) {
  const rates = {
    ...currencyMeta,
    KRW: { symbol: "₩", rate: krwPerNpr },
  };
  const monthKeys = listGroupMonthKeys(expenses).slice(0, limit).reverse();
  const labels = monthKeys.map((key) => formatGroupMonthLabel(key).split(" ")[0]);
  const data = monthKeys.map((key) => {
    const monthTotal = expenses
      .filter((expense) => expenseMonthKey(expense.date) === key)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return monthTotal * rates[currency].rate;
  });

  return { labels, data, monthKeys };
}

export function highestGroupSpenderForMonth(expenses: Expense[], members: string[]) {
  const { paidByMember } = getSettlement(members, expenses);
  const ranked = members
    .map((id) => ({ id, total: paidByMember[id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  return ranked[0] ?? { id: "N/A", total: 0 };
}

export type GroupMonthlyStatement = {
  monthKey: string;
  monthLabel: string;
  expenses: Expense[];
  totalExpense: number;
  equalSplitAmount: number;
  memberExpectedShare: Record<string, number>;
  paidByMember: Record<string, number>;
  balances: Record<string, number>;
  transfers: Array<{ from: string; to: string; amount: number }>;
  settlementStatus: "Settled" | "Pending";
  highestSpender: { id: string; total: number };
  categoryTotals: ReturnType<typeof groupCategoryTotalsForMonth>;
};

export function buildGroupMonthlyStatement(
  monthKey: string,
  expenses: Expense[],
  members: string[],
): GroupMonthlyStatement {
  const monthExpenses = expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
  const { balances, equalSplitAmount, memberExpectedShare, paidByMember, totalExpense, transfers } = getSettlement(
    members,
    monthExpenses,
  );

  return {
    monthKey,
    monthLabel: formatGroupMonthLabel(monthKey),
    expenses: monthExpenses,
    totalExpense,
    equalSplitAmount,
    memberExpectedShare,
    paidByMember,
    balances,
    transfers,
    settlementStatus: transfers.length === 0 ? "Settled" : "Pending",
    highestSpender: highestGroupSpenderForMonth(monthExpenses, members),
    categoryTotals: groupCategoryTotalsForMonth(monthExpenses),
  };
}
