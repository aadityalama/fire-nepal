import { generateAiInsights } from "@/lib/expense-ai-insights";
import type { DashboardPersistedState } from "@/lib/expense-storage";
import { currentMonthKey } from "@/lib/expense-utils";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import type { FireAiTodayInsight } from "@/lib/fire-nepal-ai/types";

const PLACEHOLDER: FireAiTodayInsight = {
  available: false,
  text: "Add your cashflow, portfolio, or expenses to unlock personalized insights.",
};

export function buildTodayInsight(
  summary: UnifiedFireSummary,
  expenseState: DashboardPersistedState,
): FireAiTodayInsight {
  const candidates: string[] = [];

  if (summary.savingsRatePct !== null && summary.monthlyIncome > 0) {
    candidates.push(`You are saving ${Math.round(summary.savingsRatePct)}% of your income.`);
  }

  if (summary.emergencyFundCoverageMonths !== null && summary.monthlyExpenses > 0) {
    if (summary.emergencyFundCoverageMonths < 3) {
      candidates.push("Your emergency fund is below the recommended target.");
    } else if (summary.emergencyFundCoverageMonths >= 6) {
      candidates.push(
        `Your emergency fund covers ${summary.emergencyFundCoverageMonths.toFixed(1)} months of expenses.`,
      );
    }
  }

  if (summary.fireProgressPct !== null && summary.fireNumber25xAnnualSpendNpr > 0) {
  const gap = summary.fireNumber25xAnnualSpendNpr - summary.totalNetWorthNpr;
    if (gap > 0 && summary.monthlyIncome > 0) {
      const extraMonthly = Math.min(50_000, Math.max(5_000, Math.round(gap / 120 / 5000) * 5000));
      const monthsSaved = Math.max(1, Math.round(extraMonthly / Math.max(1, summary.monthlyIncome - summary.monthlyExpenses) * 6));
      if (extraMonthly >= 5000 && monthsSaved >= 3) {
        candidates.push(
          `You can reach your FIRE goal about ${monthsSaved} months earlier if you increase monthly savings by NPR ${formatNprInteger(extraMonthly)}.`,
        );
      }
    }
  }

  const monthKey = currentMonthKey();
  const currency = expenseState.displayCurrency ?? "NPR";
  const expenseInsights = generateAiInsights(
    expenseState.expenses,
    expenseState.members,
    monthKey,
    currency,
    expenseState.profiles,
  );

  for (const insight of expenseInsights) {
    if (insight.id === "food-trend" && insight.message.includes("%")) {
      const match = insight.message.match(/(\d+)%/);
      if (match) {
        const pct = Number(match[1]);
        if (insight.message.includes("decreased") || insight.message.includes("dropped")) {
          candidates.push(`You spent ${pct}% less on food than last month.`);
        } else if (insight.message.includes("increased")) {
          candidates.push(`Food spending increased ${pct}% compared to last month.`);
        }
      }
    }
    if (insight.id === "monthly-total" && insight.message.includes("decreased")) {
      const match = insight.message.match(/(\d+)%/);
      if (match) candidates.push(`Group spending decreased ${match[1]}% vs last month.`);
    }
  }

  if (candidates.length === 0) return PLACEHOLDER;
  return { available: true, text: candidates[0]! };
}
