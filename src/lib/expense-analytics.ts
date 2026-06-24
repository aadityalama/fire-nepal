import type { Currency, Expense } from "@/lib/expense-utils";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { currencyMeta, expenseMonthKey, formatMoney, getSettlement } from "@/lib/expense-utils";
import { formatMonthLabel, listMonthKeys } from "@/lib/expense-storage";

export const EXPENSE_CATEGORIES = [
  "Food/Mart",
  "Rent",
  "Electricity",
  "Internet",
  "Remittance",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const categoryAliases: Record<string, ExpenseCategory> = {
  Mart: "Food/Mart",
  Food: "Food/Mart",
  Utilities: "Other",
  "Food/Mart": "Food/Mart",
  Rent: "Rent",
  Electricity: "Electricity",
  Internet: "Internet",
  Remittance: "Remittance",
  Other: "Other",
};

export function normalizeCategory(category: string): ExpenseCategory {
  return categoryAliases[category] ?? "Other";
}

export function categoryTotalsForMonth(expenses: Expense[]) {
  return EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: expenses
      .filter((expense) => normalizeCategory(expense.category) === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  }));
}

export function monthlyComparisonData(
  expenses: Expense[],
  currency: Currency,
  limit = 6,
  krwPerNpr = FALLBACK_KRW_PER_NPR,
) {
  const rates = {
    ...currencyMeta,
    KRW: { symbol: "₩", rate: krwPerNpr },
  };
  const monthKeys = listMonthKeys(expenses).slice(0, limit).reverse();
  const labels = monthKeys.map((key) => formatMonthLabel(key).split(" ")[0]);
  const data = monthKeys.map((key) => {
    const monthTotal = expenses
      .filter((expense) => expenseMonthKey(expense.date) === key)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return monthTotal * rates[currency].rate;
  });

  return { labels, data, monthKeys };
}

export function highestSpenderForMonth(expenses: Expense[], members: string[]) {
  const { paidByMember } = getSettlement(members, expenses);
  const ranked = members
    .map((id) => ({ id, total: paidByMember[id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  return ranked[0] ?? { id: "N/A", total: 0 };
}

export type MonthlyStatement = {
  monthKey: string;
  monthLabel: string;
  expenses: Expense[];
  totalExpense: number;
  /** Total ÷ member count — quick reference when everyone shares everything equally */
  equalSplitAmount: number;
  /** Sum of each member’s fair share from split rules (subset splits, custom %, etc.) */
  memberExpectedShare: Record<string, number>;
  paidByMember: Record<string, number>;
  balances: Record<string, number>;
  transfers: Array<{ from: string; to: string; amount: number }>;
  settlementStatus: "Settled" | "Pending";
  highestSpender: { id: string; total: number };
  categoryTotals: ReturnType<typeof categoryTotalsForMonth>;
};

export function buildMonthlyStatement(
  monthKey: string,
  expenses: Expense[],
  members: string[],
): MonthlyStatement {
  const monthExpenses = expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
  const { balances, equalSplitAmount, memberExpectedShare, paidByMember, totalExpense, transfers } = getSettlement(
    members,
    monthExpenses,
  );

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    expenses: monthExpenses,
    totalExpense,
    equalSplitAmount,
    memberExpectedShare,
    paidByMember,
    balances,
    transfers,
    settlementStatus: transfers.length === 0 ? "Settled" : "Pending",
    highestSpender: highestSpenderForMonth(monthExpenses, members),
    categoryTotals: categoryTotalsForMonth(monthExpenses),
  };
}

export function buildAllStatements(expenses: Expense[], members: string[]) {
  return listMonthKeys(expenses).map((monthKey) => buildMonthlyStatement(monthKey, expenses, members));
}

export function formatStatementSummary(statement: MonthlyStatement, currency: Currency) {
  return [
    `FIRE Nepal — ${statement.monthLabel} Statement`,
    `Total: ${formatMoney(statement.totalExpense, currency)}`,
    `Status: ${statement.settlementStatus}`,
    `Highest spender: ${statement.highestSpender.id} (${formatMoney(statement.highestSpender.total, currency)})`,
  ].join("\n");
}
