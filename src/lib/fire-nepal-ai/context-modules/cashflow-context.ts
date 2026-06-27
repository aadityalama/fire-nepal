import "server-only";

import { EXPENSE_CATEGORY_META, INCOME_SOURCE_META } from "@/components/cashflow/cashflow-constants";
import {
  coverageMonths,
  investableCashflow,
  monthlyBurn,
  savingsRatePct,
  sumExpenseCategories,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";
import { compactLines, formatNpr, formatPct } from "@/lib/fire-nepal-ai/context-modules/format";
import { getFireAiFinancialSnapshot } from "@/services/fire-ai-financial-snapshot";

function positiveLines<T extends string>(
  items: { key: T; label: string }[],
  values: Record<T, number | undefined>,
): string {
  return items
    .map((item) => ({ label: item.label, value: values[item.key] ?? 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => `- ${item.label}: ${formatNpr(item.value)}`)
    .join("\n");
}

export async function buildCashflowContext(userId: string): Promise<string | null> {
  const snapshot = await getFireAiFinancialSnapshot(userId);
  const cashflow = snapshot.wealth.cashflow;

  if (!snapshot.wealth.cashflowSynced) {
    return compactLines([
      "Cashflow Intelligence: no synced cashflow snapshot found.",
      "If the user asks about monthly income, expenses, savings, cashflow trend, surplus/deficit, or recurring categories, explain that Cashflow Dashboard data is missing and ask them to add it.",
    ]);
  }

  const income = sumIncome(cashflow);
  const categoryExpenses = sumExpenseCategories(cashflow);
  const burn = monthlyBurn(cashflow);
  const monthlySavings = investableCashflow(cashflow);
  const savingsRate = savingsRatePct(cashflow);
  const expenseRatio = income > 0 ? (burn / income) * 100 : null;
  const coverage = coverageMonths(cashflow);
  const status = monthlySavings > 0 ? "monthly surplus" : monthlySavings < 0 ? "monthly deficit" : "balanced";

  return compactLines([
    `Cashflow snapshot updated: ${snapshot.wealth.cashflowUpdatedAt ?? "unknown"}.`,
    `Monthly income: ${formatNpr(income)}.`,
    `Monthly expenses / burn: ${formatNpr(burn)}${cashflow.monthlyExpensesOverride ? " (uses user override)" : ""}.`,
    `Monthly savings / surplus-deficit: ${formatNpr(monthlySavings)} (${status}).`,
    `Savings rate: ${savingsRate == null ? "unavailable because income is missing" : formatPct(savingsRate)}.`,
    `Expense ratio: ${expenseRatio == null ? "unavailable because income is missing" : formatPct(expenseRatio)}.`,
    `Emergency fund coverage: ${coverage == null ? "unavailable because monthly expenses are missing" : `${coverage.toFixed(1)} months`}.`,
    `Recurring income sources:\n${positiveLines(INCOME_SOURCE_META, cashflow.income) || "- No positive recurring income categories entered."}`,
    `Recurring expense categories:\n${positiveLines(EXPENSE_CATEGORY_META, cashflow.expenses) || "- No positive recurring expense categories entered."}`,
    `Cashflow trend: one synced monthly snapshot is available; do not claim a multi-month trend unless the user provides history. Current observation is ${status}.`,
    "Recommendation rule: base savings, budget, expense-ratio, and FIRE acceleration advice only on the numbers above.",
  ]);
}
