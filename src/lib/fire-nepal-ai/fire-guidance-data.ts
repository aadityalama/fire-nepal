import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import type { FireAiGuidanceItem } from "@/lib/fire-nepal-ai/types";

export function buildFireGuidance(summary: UnifiedFireSummary): {
  items: FireAiGuidanceItem[];
  hasData: boolean;
  missingDataHint: string | null;
} {
  const items: FireAiGuidanceItem[] = [];
  const hasCashflow = summary.monthlyIncome > 0 || summary.monthlyExpenses > 0;
  const hasPortfolio = summary.totalNetWorthNpr !== 0 || summary.totalInvestableAssetsNpr > 0;

  if (!hasCashflow && !hasPortfolio) {
    return {
      items: [],
      hasData: false,
      missingDataHint:
        "Add your monthly income and expenses in Cashflow, or enter portfolio assets, to receive personalized FIRE guidance.",
    };
  }

  if (summary.savingsRatePct !== null) {
    if (summary.savingsRatePct < 20) {
      items.push({
        id: "increase-savings",
        title: "Increase savings",
        body: `Your savings rate is ${Math.round(summary.savingsRatePct)}%. Aim for at least 20–30% to accelerate your FIRE timeline.`,
        priority: "high",
      });
    } else if (summary.savingsRatePct >= 40) {
      items.push({
        id: "maintain-rate",
        title: "Maintain current saving rate",
        body: `Strong discipline — you're saving ${Math.round(summary.savingsRatePct)}% of income. Keep this momentum.`,
        priority: "low",
      });
    }
  }

  if (summary.emergencyFundCoverageMonths !== null) {
    if (summary.emergencyFundCoverageMonths < 3) {
      items.push({
        id: "emergency-fund",
        title: "Build emergency fund",
        body: `You have ${summary.emergencyFundCoverageMonths.toFixed(1)} months of coverage. Target 3–6 months before aggressive investing.`,
        priority: "high",
      });
    }
  } else if (hasCashflow && summary.monthlyExpenses > 0) {
    items.push({
      id: "emergency-fund-setup",
      title: "Build emergency fund",
      body: "Set your emergency cash reserve in Cashflow to track coverage against monthly burn.",
      priority: "medium",
    });
  }

  if (summary.monthlyExpenses > summary.monthlyIncome && summary.monthlyIncome > 0) {
    items.push({
      id: "reduce-expenses",
      title: "Reduce unnecessary expenses",
      body: "Monthly expenses exceed income. Review discretionary categories in Expense Dashboard.",
      priority: "high",
    });
  } else if (summary.monthlyExpenses > 0 && summary.savingsRatePct !== null && summary.savingsRatePct < 30) {
    items.push({
      id: "trim-expenses",
      title: "Reduce unnecessary expenses",
      body: "Small cuts in recurring expenses can meaningfully lift your savings rate.",
      priority: "medium",
    });
  }

  if (summary.fireProgressPct !== null && summary.fireProgressPct < 50 && summary.fireNumber25xAnnualSpendNpr > 0) {
    const gap = summary.fireNumber25xAnnualSpendNpr - summary.totalNetWorthNpr;
    if (gap > 0) {
      items.push({
        id: "reach-fire",
        title: "Reach FIRE earlier",
        body: `You're ${Math.round(summary.fireProgressPct)}% toward your 25× spend target. Gap: NPR ${formatNprInteger(gap)}.`,
        priority: "medium",
      });
    }
  }

  if (summary.liabilitiesNpr > 0 && summary.totalNetWorthNpr > 0) {
    const debtRatio = summary.liabilitiesNpr / (summary.totalNetWorthNpr + summary.liabilitiesNpr);
    if (debtRatio > 0.3) {
      items.push({
        id: "debt-focus",
        title: "Prioritize debt reduction",
        body: "Liabilities are a significant share of your balance sheet. Pay down high-interest debt to improve FIRE readiness.",
        priority: "high",
      });
    }
  }

  if (items.length === 0 && hasCashflow) {
    items.push({
      id: "on-track",
      title: "Stay on track",
      body: "Your financial inputs look balanced. Keep updating cashflow and portfolio for sharper guidance.",
      priority: "low",
    });
  }

  return { items, hasData: items.length > 0, missingDataHint: null };
}
