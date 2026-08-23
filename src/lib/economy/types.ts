/**
 * FIRE Nepal Economic Data Engine — shared types.
 * Accuracy and source transparency over completeness.
 */

export type EconomyMetricKey =
  | "inflation"
  | "gdp"
  | "policy_rate"
  | "fd_rates"
  | "usd_npr"
  | "krw_npr"
  | "gold"
  | "silver"
  | "remittance"
  | "nepse";

export type EconomyFrequency =
  | "intraday"
  | "daily"
  | "monthly"
  | "quarterly"
  | "annual"
  | "irregular";

/** Presentation badge — never label stale cache as live. */
export type EconomyStatus = "live" | "official" | "cached" | "stale" | "unavailable";

export type EconomyTone = "up" | "down" | "neutral";
export type EconomyValueKind = "actual" | "estimate" | "forecast" | "provisional";

export type EconomyMetric = {
  key: EconomyMetricKey;
  name: string;
  value: number;
  displayValue: string;
  unit: string;
  currency: string | null;
  source: string;
  sourceUrl: string;
  period: string | null;
  publishedAt: string | null;
  updatedAt: string;
  lastAttemptAt: string | null;
  frequency: EconomyFrequency;
  status: EconomyStatus;
  valueKind: EconomyValueKind;
  change: number | null;
  changePercent: number | null;
  changeLabel: string | null;
  tone: EconomyTone;
  stale: boolean;
  staleReason: string | null;
  errorMessage: string | null;
  nextRefreshAt: string | null;
  raw: Record<string, unknown> | null;
};

export type EconomySourceResult = {
  key: EconomyMetricKey;
  value: number;
  displayValue?: string;
  unit: string;
  currency?: string | null;
  source: string;
  sourceUrl: string;
  period?: string | null;
  publishedAt?: string | null;
  frequency: EconomyFrequency;
  valueKind?: EconomyValueKind;
  change?: number | null;
  changePercent?: number | null;
  changeLabel?: string | null;
  tone?: EconomyTone;
  liveCapable?: boolean;
  raw?: Record<string, unknown> | null;
};

export type EconomyFetchOutcome =
  | { ok: true; via: "primary" | "secondary"; metric: EconomySourceResult }
  | { ok: false; via: "primary" | "secondary"; key: EconomyMetricKey; error: string };

export type EconomyRefreshItemResult = {
  key: EconomyMetricKey;
  status: "updated" | "unchanged" | "cached_fallback" | "failed" | "skipped";
  message: string;
  value?: number;
  sourceUrl?: string;
};

export type EconomyRefreshReport = {
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  items: EconomyRefreshItemResult[];
  errors: string[];
};

export type EconomyDebugSnapshot = {
  key: EconomyMetricKey;
  name: string;
  value: number | null;
  displayValue: string | null;
  source: string | null;
  sourceUrl: string | null;
  period: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  status: EconomyStatus | "missing";
  stale: boolean;
  staleReason: string | null;
  errorMessage: string | null;
  nextRefreshAt: string | null;
  frequency: EconomyFrequency | null;
  valueKind: EconomyValueKind | null;
};

export const ALL_ECONOMY_METRIC_KEYS: EconomyMetricKey[] = [
  "inflation",
  "gdp",
  "policy_rate",
  "fd_rates",
  "usd_npr",
  "krw_npr",
  "gold",
  "silver",
  "remittance",
  "nepse",
];
