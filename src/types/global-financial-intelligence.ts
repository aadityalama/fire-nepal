import type { MarketSnapshot } from "@/types/market";

export type GlobalForexCode = "KRW" | "USD" | "EUR" | "GBP" | "JPY" | "AED" | "QAR" | "SAR";

export type GlobalForexQuote = {
  code: GlobalForexCode;
  name: string;
  nprRate: number;
  buyRate: number;
  sellRate: number;
  changePct: number;
  sparkline: number[];
};

export type KoreaEquityQuote = {
  symbol: string;
  name: string;
  lastKrw: number;
  changePct: number;
  peRatio: number;
  epsKrw: number;
  marketCapKrwT: number;
  dividendYieldPct: number;
  sparkline: number[];
};

export type MacroIndicator = {
  region: "Nepal" | "Korea" | "United States";
  inflationPct: number;
  policyRatePct: number;
  costPressurePct: number;
  source: string;
};

export type FearGreedSnapshot = {
  score: number;
  label: string;
};

export type GlobalFinancialIntelligenceSnapshot = {
  fetchedAt: string;
  sourceStatus: Record<string, "ok" | "error" | "skipped">;
  forex: GlobalForexQuote[];
  market: MarketSnapshot;
  koreaEquities: KoreaEquityQuote[];
  macro: MacroIndicator[];
  fearGreed: FearGreedSnapshot;
};
