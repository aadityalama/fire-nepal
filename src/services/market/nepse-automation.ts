/**
 * Provider-neutral contracts for the scheduled NEPSE ingestion pipeline.
 *
 * These deliberately contain no scraping implementation or credentials. A licensed/configured
 * provider can implement the adapters while the dashboard continues consuming the existing
 * normalized MarketSnapshot contract.
 */

export type NepsePipelineStage =
  | "fetch"
  | "validate"
  | "deduplicate"
  | "persist"
  | "indicators"
  | "analysis"
  | "publish";

export type NepseAutomationRun = {
  id: string;
  tradingDate: string;
  source: string;
  status: "queued" | "running" | "completed" | "failed" | "partial";
  stage: NepsePipelineStage;
  startedAt: string;
  completedAt?: string;
  recordsFetched: number;
  recordsAccepted: number;
  recordsRejected: number;
  error?: string;
};

export type NepseOhlcvCandle = {
  symbol: string;
  interval: "1d";
  timestamp: string;
  openNpr: number;
  highNpr: number;
  lowNpr: number;
  closeNpr: number;
  volume: number;
  turnoverNpr?: number;
};

export type NepseFundamentalSnapshot = {
  symbol: string;
  period: string;
  sourceUrl: string;
  publishedAt: string;
  eps?: number;
  pe?: number;
  pb?: number;
  roePct?: number;
  roaPct?: number;
  bookValueNpr?: number;
  revenueNpr?: number;
  netProfitNpr?: number;
  operatingCashFlowNpr?: number;
  marketCapNpr?: number;
};

export type NepseNewsRecord = {
  id: string;
  headline: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category:
    | "Banking"
    | "Hydropower"
    | "Insurance"
    | "Finance"
    | "Manufacturing"
    | "Hotels"
    | "IPO"
    | "Economy";
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  deduplicationKey: string;
};

export interface NepseMarketDataAdapter {
  readonly name: string;
  fetchTradingDay(date: string): Promise<unknown>;
  normalize(payload: unknown): Promise<NepseOhlcvCandle[]>;
}

export interface NepseNewsAdapter {
  readonly name: string;
  fetchSince(isoTimestamp: string): Promise<unknown>;
  normalize(payload: unknown): Promise<NepseNewsRecord[]>;
}

export type NepsePipelineJob = {
  schedule: "after-market-close";
  timezone: "Asia/Kathmandu";
  stages: readonly NepsePipelineStage[];
  retry: { attempts: number; backoffSeconds: number };
};

export const DEFAULT_NEPSE_PIPELINE_JOB: NepsePipelineJob = {
  schedule: "after-market-close",
  timezone: "Asia/Kathmandu",
  stages: ["fetch", "validate", "deduplicate", "persist", "indicators", "analysis", "publish"],
  retry: { attempts: 3, backoffSeconds: 60 },
};
