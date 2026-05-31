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
};
