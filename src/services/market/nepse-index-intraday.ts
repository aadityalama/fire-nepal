/**
 * Official NEPSE intraday index graph + multi-day market summary history.
 *
 * Graph source: POST `/api/nots/graph/index/{id}` on nepalstock.com.np
 * Summary history: yonepse mirror of official market-summary history (turnover / volume / trades).
 */

import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { fetchJson } from "@/lib/api/fetch-json";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";

const NEPSE_ROOT = "https://www.nepalstock.com.np";
const NEPSE_INDEX_ID = 58;
const YONEPSE_SUMMARY_HISTORY =
  "https://shubhamnpk.github.io/yonepse/data/market_summary_history.json";

const cache = createMemoryTtlCache();
const GRAPH_TTL_MS = 20_000;
const HISTORY_TTL_MS = 5 * 60_000;

export type NepseIntradayPoint = {
  /** Unix epoch milliseconds (UTC). */
  t: number;
  value: number;
};

export type NepseSummaryHistoryPoint = {
  businessDate: string;
  totalTurnoverNpr: number;
  totalVolume: number;
  totalTransactions: number;
  tradedScrips: number | null;
};

export type NepseIndexIntradayPayload = {
  fetchedAt: string;
  indexId: number;
  points: NepseIntradayPoint[];
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  summaryHistory: NepseSummaryHistoryPoint[];
};

function parseGraphPoint(row: unknown): NepseIntradayPoint | null {
  if (Array.isArray(row) && row.length >= 2) {
    const ts = Number(row[0]);
    const value = Number(row[1]);
    if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
    // Official index graph timestamps are Unix seconds.
    const t = ts > 1e12 ? ts : ts * 1000;
    return { t, value };
  }
  if (row && typeof row === "object") {
    const o = row as Record<string, unknown>;
    const ts = Number(o.time ?? o.timestamp ?? o.t);
    const value = Number(o.value ?? o.index ?? o.close);
    if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
    const t = ts > 1e12 ? ts : ts * 1000;
    return { t, value };
  }
  return null;
}

async function fetchOfficialIndexGraph(): Promise<NepseIntradayPoint[]> {
  const { authorization, indexGraphPayloadId } = await authenticateNepsePublicApi();
  const response = await fetch(`${NEPSE_ROOT}/api/nots/graph/index/${NEPSE_INDEX_ID}`, {
    method: "POST",
    headers: {
      authorization,
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "FIRENepal-IndexIntraday/1.0 (+https://firenepal.com)",
    },
    body: JSON.stringify({ id: indexGraphPayloadId }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`NEPSE index graph HTTP ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const rows = Array.isArray(payload) ? payload : [];
  const points: NepseIntradayPoint[] = [];
  for (const row of rows) {
    const point = parseGraphPoint(row);
    if (point) points.push(point);
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}

async function fetchSummaryHistory(limit = 24): Promise<NepseSummaryHistoryPoint[]> {
  const raw = await fetchJson<unknown>(YONEPSE_SUMMARY_HISTORY, { timeoutMs: 12_000, retries: 1 });
  if (!Array.isArray(raw)) return [];
  const out: NepseSummaryHistoryPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const businessDate = typeof o.businessDate === "string" ? o.businessDate : null;
    const totalTurnoverNpr = Number(o.totalTurnover);
    const totalVolume = Number(o.totalTradedShares);
    const totalTransactions = Number(o.totalTransactions);
    const tradedScrips = Number(o.tradedScrips);
    if (!businessDate || !Number.isFinite(totalTurnoverNpr)) continue;
    out.push({
      businessDate,
      totalTurnoverNpr,
      totalVolume: Number.isFinite(totalVolume) ? totalVolume : 0,
      totalTransactions: Number.isFinite(totalTransactions) ? totalTransactions : 0,
      tradedScrips: Number.isFinite(tradedScrips) ? tradedScrips : null,
    });
  }
  // Newest first upstream — return oldest→newest for sparkline drawing, capped.
  return out.slice(0, limit).reverse();
}

export async function loadNepseIndexIntraday(): Promise<NepseIndexIntradayPayload> {
  const cacheKey = "nepse-index-intraday-v1";
  const hit = cache.get<NepseIndexIntradayPayload>(cacheKey);
  if (hit) return hit;

  const [pointsResult, historyResult] = await Promise.allSettled([
    fetchOfficialIndexGraph(),
    fetchSummaryHistory(18),
  ]);

  const points = pointsResult.status === "fulfilled" ? pointsResult.value : [];
  const summaryHistory = historyResult.status === "fulfilled" ? historyResult.value : [];

  if (pointsResult.status === "rejected" && historyResult.status === "rejected") {
    throw pointsResult.reason instanceof Error
      ? pointsResult.reason
      : new Error("Failed to load NEPSE intraday payload");
  }

  const values = points.map((point) => point.value);
  const payload: NepseIndexIntradayPayload = {
    fetchedAt: new Date().toISOString(),
    indexId: NEPSE_INDEX_ID,
    points,
    open: values.length ? values[0]! : null,
    high: values.length ? Math.max(...values) : null,
    low: values.length ? Math.min(...values) : null,
    last: values.length ? values[values.length - 1]! : null,
    summaryHistory,
  };

  cache.set(cacheKey, payload, GRAPH_TTL_MS);
  // Keep summary history warm separately so a graph miss still serves history next tick.
  if (summaryHistory.length) {
    cache.set("nepse-summary-history-v1", summaryHistory, HISTORY_TTL_MS);
  }
  return payload;
}
