/**
 * Official NEPSE live market provider.
 *
 * Source of truth: https://www.nepalstock.com.np public NOTS APIs (same payloads the
 * exchange website renders). Hero fields come from ONE atomic validated snapshot —
 * never mixed across fetches or caches.
 */

import { createClient } from "@supabase/supabase-js";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import {
  OfficialIndexValidationError,
  validateOfficialIndexSnapshot,
} from "@/services/market/nepse-official-index-validation";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";
import type {
  NepseIndexRow,
  NepseBundle,
  NepseMarketFeedStatus,
  NepseMarketSummaryStats,
  NepseTopStocksBoard,
} from "@/services/market/nepse-yonepse";
import type { NepseIndexTick, NepseSecurityTick } from "@/types/market";

const ROOT = "https://www.nepalstock.com.np";
const UA = "FIRENepal-OfficialMarketSync/1.0 (+https://firenepal.com)";

/** Match official homepage polling cadence (index ~10s, summary ~30s). */
export const OFFICIAL_LIVE_TTL_MS = 15_000;

export type NepseOfficialBreadth = {
  advancing: number;
  declining: number;
  unchanged: number;
  upperCircuit: number;
  lowerCircuit: number;
};

export type NepseOfficialSyncMeta = {
  source: "official";
  syncedAt: string;
  generatedTime: string | null;
  marketAsOf: string | null;
  snapshotId: string;
};

export type NepseOfficialBundle = NepseBundle & {
  officialBreadth: NepseOfficialBreadth;
  syncMeta: NepseOfficialSyncMeta;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function nepseFetchJson<T>(path: string, authorization: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    ...init,
    headers: {
      "user-agent": UA,
      accept: "application/json",
      authorization,
      referer: `${ROOT}/`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`NEPSE ${response.status} ${path}`);
  return (await response.json()) as T;
}

function emptyTopBoard(): NepseTopStocksBoard {
  return { topGainers: [], topLosers: [], topTurnover: [], topVolume: [], topTransactions: [] };
}

function emptySummary(): NepseMarketSummaryStats {
  return {
    totalTurnoverNpr: null,
    totalVolume: null,
    totalTrades: null,
    scripsTraded: null,
  };
}

function emptyBreadth(): NepseOfficialBreadth {
  return { advancing: 0, declining: 0, unchanged: 0, upperCircuit: 0, lowerCircuit: 0 };
}

/** Parse + validate index row from a single official record (no cross-field invention). */
function parseAndValidateOfficialIndexRow(o: Record<string, unknown>): NepseIndexRow {
  const name = str(o.index) ?? str(o.indexName) ?? str(o.name);
  if (!name) throw new OfficialIndexValidationError("Official index row missing name");

  const validated = validateOfficialIndexSnapshot({
    name,
    currentValue: num(o.currentValue),
    close: num(o.close),
    previousClose: num(o.previousClose),
    change: num(o.change),
    perChange: num(o.perChange),
    high: num(o.high),
    low: num(o.low),
    generatedTime: str(o.generatedTime),
  });

  return {
    name: validated.name,
    value: validated.currentIndex,
    changePct: validated.percentageChange,
    changeNpr: validated.pointChange,
    high: validated.high,
    low: validated.low,
    previousClose: validated.previousClose,
  };
}

function parseMarketSummary(rows: unknown): NepseMarketSummaryStats {
  const summary = emptySummary();
  if (!Array.isArray(rows)) return summary;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const detail = (str(o.detail) ?? "").toLowerCase();
    const value = num(o.value);
    if (value == null) continue;
    if (detail.includes("turnover")) summary.totalTurnoverNpr = value;
    else if (detail.includes("traded share") || detail.includes("volume")) summary.totalVolume = value;
    else if (detail.includes("transaction")) summary.totalTrades = value;
    else if (detail.includes("scrip")) summary.scripsTraded = value;
  }
  return summary;
}

function parseMarketStatus(payload: unknown): NepseMarketFeedStatus {
  if (!payload || typeof payload !== "object") return { isOpen: null, checkedAt: null };
  const o = payload as Record<string, unknown>;
  const raw = o.isOpen;
  let isOpen: boolean | null = null;
  if (typeof raw === "boolean") isOpen = raw;
  else if (typeof raw === "string") {
    const upper = raw.trim().toUpperCase();
    if (upper === "OPEN" || upper === "HALT") isOpen = true;
    else if (upper === "CLOSE" || upper === "CLOSED") isOpen = false;
  }
  return {
    isOpen,
    checkedAt: str(o.asOf) ?? str(o.checkedAt) ?? str(o.updated_at) ?? null,
  };
}

function normalizeSymbol(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function boardRowToTick(
  o: Record<string, unknown>,
  masterBySymbol?: Map<string, { companyName: string; sector: string | null }>,
): NepseSecurityTick | null {
  const symRaw = str(o.symbol);
  const ltp =
    num(o.lastTradedPrice) ?? num(o.ltp) ?? num(o.closePrice) ?? num(o.closingPrice) ?? num(o.cp);
  if (!symRaw || ltp == null) return null;
  const symbol = normalizeSymbol(symRaw);
  const previousCloseNpr = num(o.previousClose) ?? num(o.cp) ?? undefined;
  const changePct = num(o.percentageChange) ?? num(o.perChange) ?? undefined;
  const changeNpr =
    num(o.pointChange) ??
    (previousCloseNpr != null && Number.isFinite(ltp) ? ltp - previousCloseNpr : undefined);
  const master = masterBySymbol?.get(symbol);
  return {
    symbol,
    companyName: master?.companyName ?? str(o.securityName) ?? str(o.companyName) ?? undefined,
    ltpNpr: ltp,
    changePct: changePct ?? undefined,
    changeNpr: changeNpr ?? undefined,
    previousCloseNpr: previousCloseNpr ?? undefined,
    volume: num(o.totalTradeQuantity) ?? num(o.shareTraded) ?? num(o.volume) ?? undefined,
    turnoverNpr: num(o.turnover) ?? num(o.totalTurnover) ?? undefined,
    trades: (() => {
      const t = num(o.totalTrades) ?? num(o.trades);
      return t != null ? Math.round(t) : undefined;
    })(),
    sector: master?.sector ?? str(o.sector) ?? undefined,
    lastUpdated: str(o.lastUpdatedDateTime) ?? str(o.lastUpdated) ?? undefined,
  };
}

function mergeTick(base: NepseSecurityTick | undefined, extra: NepseSecurityTick): NepseSecurityTick {
  if (!base) return extra;
  return {
    ...base,
    ...extra,
    ltpNpr: extra.ltpNpr > 0 ? extra.ltpNpr : base.ltpNpr,
    changePct: extra.changePct ?? base.changePct,
    changeNpr: extra.changeNpr ?? base.changeNpr,
    previousCloseNpr: extra.previousCloseNpr ?? base.previousCloseNpr,
    volume: extra.volume ?? base.volume,
    turnoverNpr: extra.turnoverNpr ?? base.turnoverNpr,
    trades: extra.trades ?? base.trades,
    companyName: extra.companyName ?? base.companyName,
    sector: extra.sector ?? base.sector,
    marketCap: extra.marketCap ?? base.marketCap,
  };
}

/** Official homepage breadth: percentageChange > 0 / < 0 / == 0. Circuits: ±9.9% band. */
export function computeOfficialBreadth(bySymbol: Record<string, NepseSecurityTick>): NepseOfficialBreadth {
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let upperCircuit = 0;
  let lowerCircuit = 0;
  for (const tick of Object.values(bySymbol)) {
    const pct = tick.changePct;
    if (pct == null || !Number.isFinite(pct)) continue;
    if (pct > 0) advancing += 1;
    else if (pct < 0) declining += 1;
    else unchanged += 1;
    if (pct >= 9.9) upperCircuit += 1;
    if (pct <= -9.9) lowerCircuit += 1;
  }
  return { advancing, declining, unchanged, upperCircuit, lowerCircuit };
}

function mapTopList(
  rows: unknown,
  enrich: Record<string, NepseSecurityTick>,
  masterBySymbol?: Map<string, { companyName: string; sector: string | null }>,
): NepseSecurityTick[] {
  if (!Array.isArray(rows)) return [];
  const out: NepseSecurityTick[] = [];
  for (const row of rows.slice(0, 40)) {
    if (!row || typeof row !== "object") continue;
    const tick = boardRowToTick(row as Record<string, unknown>, masterBySymbol);
    if (!tick) continue;
    out.push(mergeTick(enrich[tick.symbol], tick));
  }
  return out;
}

async function loadMasterBySymbol(): Promise<Map<string, { companyName: string; sector: string | null }>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return new Map();
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb
      .from("nepse_company_master")
      .select("symbol, company_name, sector")
      .limit(12_000);
    if (error || !data) return new Map();
    const map = new Map<string, { companyName: string; sector: string | null }>();
    for (const row of data as { symbol: string; company_name: string | null; sector: string | null }[]) {
      const symbol = String(row.symbol ?? "")
        .replace(/\s+/g, "")
        .toUpperCase();
      if (!symbol) continue;
      map.set(symbol, {
        companyName: row.company_name?.trim() || symbol,
        sector: row.sector?.trim() || null,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Fetch a complete official live market bundle from nepalstock.com.np.
 *
 * Critical hero fields (index / change / % / status / turnover / volume / transactions /
 * timestamp) are taken from endpoints fetched in the SAME cycle. If any critical endpoint
 * fails, or the NEPSE Index row fails validation, the whole snapshot is rejected.
 */
export async function fetchNepseOfficialBundle(): Promise<NepseOfficialBundle> {
  const { authorization } = await authenticateNepsePublicApi();
  const masterBySymbol = await loadMasterBySymbol();
  const syncedAt = new Date().toISOString();
  const snapshotId = `official:${syncedAt}`;

  // Atomic critical set — all must succeed together (no partial hero mixing).
  let indexRows: unknown[];
  let summaryRows: unknown[];
  let statusPayload: unknown;
  try {
    [indexRows, summaryRows, statusPayload] = await Promise.all([
      nepseFetchJson<unknown[]>("/api/nots/nepse-index", authorization),
      nepseFetchJson<unknown[]>("/api/nots/market-summary", authorization),
      nepseFetchJson<unknown>("/api/nots/nepse-data/market-open", authorization),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official NEPSE critical fetch failed";
    throw new Error(`Atomic official snapshot rejected: ${message}`);
  }

  if (!Array.isArray(indexRows) || indexRows.length === 0) {
    throw new OfficialIndexValidationError("Atomic official snapshot rejected: empty nepse-index");
  }

  const indices: NepseIndexRow[] = [];
  let generatedTime: string | null = null;
  let nepseValidated: NepseIndexRow | null = null;

  for (const row of indexRows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (!generatedTime) generatedTime = str(o.generatedTime);
    try {
      const parsed = parseAndValidateOfficialIndexRow(o);
      indices.push(parsed);
      if (/^nepse index$/i.test(parsed.name)) nepseValidated = parsed;
    } catch (error) {
      // Non-NEPSE sub-indices may be incomplete; only NEPSE Index is hard-required.
      const name = str(o.index) ?? str(o.indexName) ?? "";
      if (/^nepse index$/i.test(name)) throw error;
    }
  }

  if (!nepseValidated) {
    throw new OfficialIndexValidationError(
      "Atomic official snapshot rejected: NEPSE Index row missing or failed validation",
    );
  }

  const summaryStats = parseMarketSummary(summaryRows);
  if (
    summaryStats.totalTurnoverNpr == null &&
    summaryStats.totalVolume == null &&
    summaryStats.totalTrades == null
  ) {
    throw new Error("Atomic official snapshot rejected: market-summary missing turnover/volume/transactions");
  }

  const marketStatus = parseMarketStatus(statusPayload);
  if (marketStatus.isOpen == null) {
    throw new Error("Atomic official snapshot rejected: market-open status unavailable");
  }

  // Optional enrichment (board / movers) — never used to overwrite hero index/summary/status.
  const [subIndexRes, boardRes, liveRes, gainerRes, loserRes, turnoverRes, volumeRes, txnRes] =
    await Promise.allSettled([
      nepseFetchJson<unknown[]>("/api/nots", authorization),
      nepseFetchJson<unknown[]>("/api/nots/securityDailyTradeStat/58", authorization),
      nepseFetchJson<unknown[]>("/api/nots/lives-market", authorization),
      nepseFetchJson<unknown[]>("/api/nots/top-ten/top-gainer?all=true", authorization),
      nepseFetchJson<unknown[]>("/api/nots/top-ten/top-loser?all=true", authorization),
      nepseFetchJson<unknown[]>("/api/nots/top-ten/turnover?all=true", authorization),
      nepseFetchJson<unknown[]>("/api/nots/top-ten/trade?all=true", authorization),
      nepseFetchJson<unknown[]>("/api/nots/top-ten/transaction?all=true", authorization),
    ]);

  if (subIndexRes.status === "fulfilled" && Array.isArray(subIndexRes.value)) {
    for (const row of subIndexRes.value) {
      if (!row || typeof row !== "object") continue;
      try {
        const parsed = parseAndValidateOfficialIndexRow(row as Record<string, unknown>);
        if (indices.some((existing) => existing.name.toLowerCase() === parsed.name.toLowerCase())) continue;
        indices.push(parsed);
      } catch {
        // Skip invalid sub-index rows.
      }
    }
  }

  const index: NepseIndexTick = {
    name: "NEPSE Index",
    value: nepseValidated.value!,
    changePct: nepseValidated.changePct ?? undefined,
    changeNpr: nepseValidated.changeNpr ?? undefined,
    previousClose: nepseValidated.previousClose ?? undefined,
  };

  const bySymbol: Record<string, NepseSecurityTick> = {};
  const breadthBoard: Record<string, NepseSecurityTick> = {};
  const ingestBoard = (rows: unknown, target: Record<string, NepseSecurityTick>) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const tick = boardRowToTick(row as Record<string, unknown>, masterBySymbol);
      if (!tick) continue;
      target[tick.symbol] = mergeTick(target[tick.symbol], tick);
    }
  };

  if (boardRes.status === "fulfilled") {
    ingestBoard(boardRes.value, breadthBoard);
    ingestBoard(boardRes.value, bySymbol);
  }
  if (liveRes.status === "fulfilled") ingestBoard(liveRes.value, bySymbol);
  for (const res of [turnoverRes, volumeRes, txnRes, gainerRes, loserRes]) {
    if (res.status === "fulfilled") ingestBoard(res.value, bySymbol);
  }

  const topStocks: NepseTopStocksBoard = {
    topGainers:
      gainerRes.status === "fulfilled" ? mapTopList(gainerRes.value, bySymbol, masterBySymbol) : [],
    topLosers: loserRes.status === "fulfilled" ? mapTopList(loserRes.value, bySymbol, masterBySymbol) : [],
    topTurnover:
      turnoverRes.status === "fulfilled" ? mapTopList(turnoverRes.value, bySymbol, masterBySymbol) : [],
    topVolume: volumeRes.status === "fulfilled" ? mapTopList(volumeRes.value, bySymbol, masterBySymbol) : [],
    topTransactions:
      txnRes.status === "fulfilled" ? mapTopList(txnRes.value, bySymbol, masterBySymbol) : [],
  };

  const officialBreadth = Object.keys(breadthBoard).length
    ? computeOfficialBreadth(breadthBoard)
    : Object.keys(bySymbol).length
      ? computeOfficialBreadth(bySymbol)
      : emptyBreadth();

  return {
    index,
    indices,
    bySymbol,
    marketStatus: {
      isOpen: marketStatus.isOpen,
      // Prefer market-open asOf; fall back to index generatedTime from same cycle.
      checkedAt: marketStatus.checkedAt ?? generatedTime ?? syncedAt,
    },
    summaryStats,
    topStocks,
    officialBreadth,
    syncMeta: {
      source: "official",
      syncedAt,
      generatedTime,
      marketAsOf: marketStatus.checkedAt ?? generatedTime ?? syncedAt,
      snapshotId,
    },
  };
}

const liveCache = createMemoryTtlCache();
const LIVE_CACHE_KEY = "nepse-official-live-v1";

/**
 * Short TTL hold of the latest atomic official snapshot only.
 * Never merges with older payloads — cache miss always refetches a full validated set.
 */
export async function getCachedNepseOfficialBundle(ttlMs = OFFICIAL_LIVE_TTL_MS): Promise<NepseOfficialBundle> {
  const hit = liveCache.get<NepseOfficialBundle>(LIVE_CACHE_KEY);
  if (hit) return hit;
  const bundle = await fetchNepseOfficialBundle();
  liveCache.set(LIVE_CACHE_KEY, bundle, ttlMs);
  return bundle;
}

export function seedOfficialLiveCache(bundle: NepseOfficialBundle, ttlMs = OFFICIAL_LIVE_TTL_MS): void {
  liveCache.set(LIVE_CACHE_KEY, bundle, ttlMs);
}

export function invalidateOfficialLiveCache(): void {
  liveCache.delete(LIVE_CACHE_KEY);
}
