import type { WealthTotals } from "@/components/portfolio/calculations";
import type { MarketSnapshot } from "@/types/market";

/** Client-side market + portfolio fusion (non-persisted). */
export type LivePortfolioOverlay = {
  snapshot: MarketSnapshot;
  /** Totals with investments + metals marked-to-market from `snapshot`. */
  totalsLive: WealthTotals;
  /** Baseline totals without live overlay (same as `computeWealthTotals` without live). */
  totalsBase: WealthTotals;
  deltaNetWorthNpr: number;
  deltaInvestmentsPnlNpr: number;
};

export type FireProgressLive = {
  /** 0–1 rough probability heuristic from diversification + debt + runway (rule-based, not ML). */
  fireAchievementProbability: number;
  /** Suggested next milestone in NPR (rounded). */
  nextWealthMilestoneNpr: number;
};

export type AiLiveInsight = {
  id: string;
  severity: "info" | "watch" | "positive";
  title: string;
  detail: string;
};

export type LiveIntelligenceBundle = {
  insights: AiLiveInsight[];
  savingsTips: string[];
  riskNotes: string[];
  diversificationNotes: string[];
  fire: FireProgressLive;
};
