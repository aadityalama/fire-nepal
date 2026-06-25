import type { DashboardPersistedState } from "@/lib/expense-storage";
import { currentMonthKey, expenseMonthKey, formatMoney } from "@/lib/expense-utils";
import { buildMonthlyStatement } from "@/lib/expense-analytics";
import { memberDisplayName } from "@/lib/expense-members";
import { generateAiInsights } from "@/lib/expense-ai-insights";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { buildTodayInsight } from "@/lib/fire-nepal-ai/today-insight";

export const FIRE_AI_SUGGESTED_PROMPTS = [
  "How much did I save this month?",
  "Explain my settlement.",
  "How can I reach FIRE faster?",
  "Review my spending.",
  "Should I increase SIP?",
] as const;

function normalizePrompt(text: string): string {
  return text.trim().toLowerCase();
}

export function buildFireAiChatResponse(
  prompt: string,
  summary: UnifiedFireSummary,
  expenseState: DashboardPersistedState,
): string {
  const q = normalizePrompt(prompt);

  if (q.includes("save") && (q.includes("month") || q.includes("this"))) {
    if (summary.savingsRatePct !== null && summary.monthlyIncome > 0) {
      const saved = summary.monthlyIncome - summary.monthlyExpenses;
      return `Based on your cashflow, you're saving about NPR ${formatNprInteger(Math.max(0, saved))} per month (${Math.round(summary.savingsRatePct)}% savings rate). Update Cashflow Dashboard for the latest numbers.`;
    }
    return "I don't have enough cashflow data yet. Add your monthly income and expenses in Cashflow Dashboard to track savings.";
  }

  if (q.includes("settlement")) {
    const monthKey = currentMonthKey();
    const currency = expenseState.displayCurrency ?? "NPR";
    if (expenseState.expenses.length === 0) {
      return "No expense data found. Add shared expenses in Expense Dashboard to generate settlement reports.";
    }
    const statement = buildMonthlyStatement(monthKey, expenseState.expenses, expenseState.members);
    if (statement.transfers.length === 0) {
      return "Everyone is settled for this month — no outstanding balances.";
    }
    const lines = statement.transfers
      .slice(0, 4)
      .map(
        (t) =>
          `${memberDisplayName(t.from, expenseState.profiles)} → ${memberDisplayName(t.to, expenseState.profiles)}: ${formatMoney(t.amount, currency)}`,
      );
    return `Settlement summary for this month:\n${lines.join("\n")}\n\nOpen Expense Dashboard → Settlement for the full breakdown.`;
  }

  if (q.includes("fire") && (q.includes("faster") || q.includes("reach") || q.includes("sooner"))) {
    const insight = buildTodayInsight(summary, expenseState);
    if (insight.available) return `${insight.text} Open FIRE Guidance for more recommendations.`;
    if (summary.fireProgressPct !== null) {
      return `You're ${Math.round(summary.fireProgressPct)}% toward your 25× annual spend FIRE number. Increase savings rate or reduce monthly burn to accelerate.`;
    }
    return "Add portfolio and cashflow data to model your FIRE timeline. Try the FIRE Calculator for projections.";
  }

  if (q.includes("spending") || q.includes("expense") || q.includes("review")) {
    const monthKey = currentMonthKey();
    const currency = expenseState.displayCurrency ?? "NPR";
    const insights = generateAiInsights(
      expenseState.expenses,
      expenseState.members,
      monthKey,
      currency,
      expenseState.profiles,
    );
    if (insights.length === 0) {
      return "No expense insights yet. Log expenses in Expense Dashboard to unlock spending analysis.";
    }
    return insights
      .slice(0, 3)
      .map((i) => `• ${i.title}: ${i.message}`)
      .join("\n\n");
  }

  if (q.includes("sip") || q.includes("invest")) {
    if (summary.totalInvestableAssetsNpr > 0 && summary.savingsRatePct !== null) {
      const rec =
        summary.savingsRatePct >= 30
          ? "Your savings rate supports steady SIP increases. Consider raising SIP by 10–15% if cashflow allows."
          : "Build emergency fund and stabilize savings rate before increasing SIP. Aim for 20%+ savings first.";
      return rec;
    }
    return "Add portfolio investments and cashflow income to evaluate SIP capacity. Use the SIP Calculator to model scenarios.";
  }

  if (summary.savingsRatePct !== null) {
    return `Your current savings rate is ${Math.round(summary.savingsRatePct)}%. Ask about spending, settlement, FIRE timeline, or SIP for more detail.`;
  }

  return "I can help with savings, spending, settlement, FIRE progress, and SIP questions — all based on your FIRE Nepal data. Try a suggested prompt below.";
}
