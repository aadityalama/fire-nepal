export type NepalEconomyCardId =
  | "inflation"
  | "gdp"
  | "policyRate"
  | "fdRates"
  | "usdNpr"
  | "krwNpr"
  | "gold"
  | "silver"
  | "remittance"
  | "nepse";

export type NepalEconomyTone = "up" | "down" | "neutral";
export type NepalEconomyDataMode = "live" | "cached" | "official";

export type NepalEconomyCard = {
  id: NepalEconomyCardId;
  label: string;
  value: string;
  detail: string;
  change: string | null;
  tone: NepalEconomyTone;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  dataMode: NepalEconomyDataMode;
  /** Official data period (e.g. mid-June 2026, CY 2025). Distinct from updatedAt. */
  period?: string | null;
  /** Source publication timestamp when known. */
  publishedAt?: string | null;
  /** True when verification window exceeded or fallback cache is shown. */
  stale?: boolean;
  staleReason?: string | null;
  numericValue?: number | null;
};

export type NepalEconomyMover = {
  name: string;
  symbol: string;
  price: string;
  change: string;
  tone: "up" | "down";
  source: string;
  updatedAt: string | null;
};

export type NepalEconomyChartPoint = {
  label: string;
  value: number;
};

export type NepalEconomyNewsItem = {
  title: string;
  href: string;
  source: string;
  publishedAt: string | null;
  tag: string;
};

export type NepalEconomyDashboardData = {
  fetchedAt: string;
  apiStatus: "ok" | "degraded" | "cached";
  networkStatus: "reachable" | "unreachable" | "partial" | "not_checked";
  cards: NepalEconomyCard[];
  topGainers: NepalEconomyMover[];
  topLosers: NepalEconomyMover[];
  charts: {
    gdpGrowth: NepalEconomyChartPoint[];
    fdRates: NepalEconomyChartPoint[];
  };
  news: NepalEconomyNewsItem[];
  newsMode: "live" | "official" | "cached";
  engineSource?: "database" | "live" | "mixed" | "empty";
};
