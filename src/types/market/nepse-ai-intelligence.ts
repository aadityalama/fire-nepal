/**
 * AI Company Intelligence contracts (Phase 4).
 * Scores and narratives are derived only from real filings, ratios, dividends,
 * live quotes and EOD technicals. Missing inputs stay null / "Data unavailable"
 * — never hallucinated projections.
 */

import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";

export type AiRecommendation = "Strong Buy" | "Buy" | "Hold" | "Reduce" | "Sell" | typeof DATA_UNAVAILABLE;

export type FairValueBadge = "Undervalued" | "Fairly Valued" | "Overvalued" | typeof DATA_UNAVAILABLE;

export type RiskLevel = "Low" | "Moderate" | "Elevated" | "High" | typeof DATA_UNAVAILABLE;

export type ChecklistStatus = "pass" | "fail" | "unknown";

export type AiScoreCard = {
  label: string;
  score: number | null;
  detail: string;
};

export type AiInvestmentSummary = {
  overall: string;
  businessQuality: string;
  financialHealth: string;
  valuation: string;
  growthOutlook: string;
  dividendOutlook: string;
  risk: string;
  limitedData: boolean;
};

export type AiFairValueAnalysis = {
  fairValueNpr: number | null;
  currentPriceNpr: number | null;
  discountPremiumPct: number | null;
  marginOfSafetyPct: number | null;
  badge: FairValueBadge;
  method: string | null;
  detail: string;
};

export type AiRiskFactor = {
  label: string;
  level: RiskLevel;
  detail: string;
};

export type AiGrowthAnalysis = {
  historical: string;
  futureOutlook: string;
  revenueTrend: string;
  epsTrend: string;
  netWorthTrend: string;
  epsCagr5yPct: number | null;
  profitCagr5yPct: number | null;
  netWorthCagr5yPct: number | null;
};

export type AiRecommendationBlock = {
  recommendation: AiRecommendation;
  confidence: "High" | "Medium" | "Low" | typeof DATA_UNAVAILABLE;
  rationale: string[];
};

export type AiChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
};

export type NepseAiIntelligencePayload = {
  symbol: string;
  summary: AiInvestmentSummary;
  scores: {
    financialHealth: number | null;
    growth: number | null;
    valuation: number | null;
    dividend: number | null;
    momentum: number | null;
    quality: number | null;
    overall: number | null;
    cards: AiScoreCard[];
  };
  fairValue: AiFairValueAnalysis;
  risk: {
    factors: AiRiskFactor[];
    overall: RiskLevel;
    detail: string;
  };
  growth: AiGrowthAnalysis;
  recommendation: AiRecommendationBlock;
  checklist: AiChecklistItem[];
  dataCoverage: {
    hasFilings: boolean;
    hasDividends: boolean;
    hasTechnicals: boolean;
    hasLivePrice: boolean;
    annualPeriods: number;
    quarterlyPeriods: number;
    ohlcBars: number;
  };
  sources: string[];
  loadedAt: string;
};
