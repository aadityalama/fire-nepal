import type { LiveIntelligenceBundle, LivePortfolioOverlay } from "@/types/portfolio/live";
import type { WealthTotals } from "@/components/portfolio/calculations";

function debtRatio(t: WealthTotals): number {
  return t.totalAssetsNpr > 0 ? Math.min(1, t.liabilitiesNpr / t.totalAssetsNpr) : t.liabilitiesNpr > 0 ? 1 : 0;
}

function topConcentrationPct(allocation: { label: string; value: number }[]): number {
  const sorted = [...allocation].sort((a, b) => b.value - a.value);
  return sorted[0]?.value ?? 0;
}

/**
 * Deterministic, on-device “AI” layer (no external LLM) — safe for production without API keys.
 */
export function buildLiveIntelligenceBundle(args: {
  overlay: LivePortfolioOverlay;
  allocation: { label: string; value: number; npr: number }[];
  fireScore: number;
}): LiveIntelligenceBundle {
  const { overlay, allocation, fireScore } = args;
  const { totalsLive, deltaNetWorthNpr } = overlay;
  const dr = debtRatio(totalsLive);
  const topPct = topConcentrationPct(allocation);

  const insights: LiveIntelligenceBundle["insights"] = [];
  if (Math.abs(deltaNetWorthNpr) >= 500) {
    insights.push({
      id: "live-nw-drift",
      severity: deltaNetWorthNpr >= 0 ? "positive" : "watch",
      title: "Live mark-to-market",
      detail: `Quotes moved your net worth by about ${deltaNetWorthNpr >= 0 ? "+" : ""}${Math.round(deltaNetWorthNpr).toLocaleString()} NPR vs the offline baseline.`,
    });
  }
  if (dr > 0.35) {
    insights.push({
      id: "debt-drag",
      severity: "watch",
      title: "Debt concentration",
      detail: "Liabilities are a large share of gross assets — prioritize high-interest paydown to stabilize FIRE runway.",
    });
  }
  if (topPct > 45) {
    insights.push({
      id: "concentration",
      severity: "info",
      title: "Allocation concentration",
      detail: `Your largest bucket is roughly ${topPct.toFixed(0)}% of assets — consider rebalancing toward your target policy over time.`,
    });
  }
  if (!insights.length) {
    insights.push({
      id: "steady",
      severity: "positive",
      title: "Engines nominal",
      detail: "Live feeds are connected; no major risk flags from the heuristic pass-through layer.",
    });
  }

  const savingsTips = [
    dr > 0.25
      ? "Route any bonus cash to the highest APR liability first — it’s the highest risk-adjusted return."
      : "Maintain 3–6 months expenses in NPR liquid, then sweep excess into your investment policy.",
    fireScore < 55
      ? "Increase recurring investments before discretionary upgrades — small % lifts compound materially."
      : "You’re ahead of the median trajectory — keep automating contributions and tax-aware placement.",
  ];

  const riskNotes = [
    dr > 0.4 ? "Leverage-sensitive: a rates shock hits both cashflow and collateral valuations." : "Debt load looks moderate vs assets.",
    topPct > 50 ? "Single-bucket dominance increases path dependency on one macro regime." : "Bucket mix is within a normal tactical band.",
  ];

  const diversificationNotes = [
    allocation.length > 4
      ? "Multiple sleeves detected — good foundation for cross-border macro diversification."
      : "Consider adding uncorrelated sleeves (global equities, metals, NPR cash buffers) over time.",
  ];

  const fireAchievementProbability = Math.max(
    0.08,
    Math.min(
      0.92,
      fireScore / 120 + (1 - dr) * 0.12 + (topPct < 40 ? 0.08 : 0),
    ),
  );

  const nextWealthMilestoneNpr = Math.max(250_000, Math.ceil(totalsLive.netWorthNpr / 500_000) * 500_000);

  return {
    insights,
    savingsTips,
    riskNotes,
    diversificationNotes,
    fire: { fireAchievementProbability, nextWealthMilestoneNpr },
  };
}
