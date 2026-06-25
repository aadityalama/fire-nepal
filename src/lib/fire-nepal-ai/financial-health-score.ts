import { fireReadinessScore } from "@/components/portfolio/calculations";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import type { FireAiHealthScore } from "@/lib/fire-nepal-ai/types";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

function hasCashflowData(summary: UnifiedFireSummary): boolean {
  return summary.monthlyIncome > 0 || summary.monthlyExpenses > 0;
}

function hasPortfolioData(summary: UnifiedFireSummary): boolean {
  return summary.totalNetWorthNpr !== 0 || summary.totalInvestableAssetsNpr > 0;
}

/**
 * Composite financial health score from existing portfolio + cashflow metrics only.
 */
export function computeFinancialHealthScore(summary: UnifiedFireSummary): FireAiHealthScore {
  const portfolioReady = hasPortfolioData(summary);
  const cashflowReady = hasCashflowData(summary);

  if (!portfolioReady && !cashflowReady) {
    return {
      score: null,
      maxScore: 100,
      status: "unavailable",
      statusLabel: "Add portfolio or cashflow data to see your score",
    };
  }

  const parts: { weight: number; value: number }[] = [];

  if (portfolioReady) {
    const fireScore = fireReadinessScore(summary.wealthTotals);
    parts.push({ weight: 0.45, value: fireScore });
  }

  if (summary.savingsRatePct !== null && cashflowReady) {
    parts.push({ weight: 0.3, value: clamp(summary.savingsRatePct) });
  }

  if (summary.emergencyFundSixMoProgressPct !== null) {
    parts.push({ weight: 0.15, value: clamp(summary.emergencyFundSixMoProgressPct) });
  }

  if (summary.fireProgressPct !== null) {
    parts.push({ weight: 0.1, value: clamp(summary.fireProgressPct) });
  }

  if (parts.length === 0) {
    return {
      score: null,
      maxScore: 100,
      status: "unavailable",
      statusLabel: "Add portfolio or cashflow data to see your score",
    };
  }

  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  const score = Math.round(parts.reduce((s, p) => s + p.value * (p.weight / weightSum), 0));

  const status = score >= 70 ? "excellent" : "needs_attention";
  const statusLabel = score >= 70 ? "Excellent progress" : "Needs attention";

  return { score, maxScore: 100, status, statusLabel };
}
