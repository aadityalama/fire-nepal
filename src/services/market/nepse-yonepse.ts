import { fetchJson } from "@/lib/api/fetch-json";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { listCompanyMasterMap } from "@/services/market/nepse-company-master";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import type { NepseIndexTick, NepseSecurityTick } from "@/types/market";

function pickNum(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeNepseSymbol(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Public static mirror (community-maintained). */
const YONEPSE_INDICES = "https://shubhamnpk.github.io/yonepse/data/indices.json";
const YONEPSE_DATA = "https://shubhamnpk.github.io/yonepse/data/nepse_data.json";
const YONEPSE_TOP = "https://shubhamnpk.github.io/yonepse/data/top_stocks.json";
const YONEPSE_STATUS = "https://shubhamnpk.github.io/yonepse/data/market_status.json";
const YONEPSE_SUMMARY = "https://shubhamnpk.github.io/yonepse/data/market_summary.json";

export type NepseIndexRow = {
  name: string;
  value: number | null;
  changePct: number | null;
  changeNpr: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
};

export type NepseMarketFeedStatus = {
  isOpen: boolean | null;
  checkedAt: string | null;
};

export type NepseMarketSummaryStats = {
  totalTurnoverNpr: number | null;
  totalVolume: number | null;
  totalTrades: number | null;
  scripsTraded: number | null;
};

export type NepseTopStocksBoard = {
  topGainers: NepseSecurityTick[];
  topLosers: NepseSecurityTick[];
  topTurnover: NepseSecurityTick[];
  topVolume: NepseSecurityTick[];
  topTransactions: NepseSecurityTick[];
};

export type NepseBundle = {
  index?: NepseIndexTick;
  indices: NepseIndexRow[];
  bySymbol: Record<string, NepseSecurityTick>;
  marketStatus: NepseMarketFeedStatus;
  summaryStats: NepseMarketSummaryStats;
  topStocks: NepseTopStocksBoard;
};

function rowToTick(
  o: Record<string, unknown>,
  masterBySymbol?: Map<string, { companyName: string; sector: string | null }>,
): NepseSecurityTick | null {
  const symRaw = pickStr(o, ["symbol", "SYMBOL", "ticker", "stock_symbol", "security_symbol"]);
  const ltp = pickNum(o, ["ltp", "close", "last_price", "closing_price", "Close", "LTP", "last", "nav", "NAV", "closingPrice", "lastTradedPrice"]);
  if (!symRaw || ltp == null) return null;

  const symbol = normalizeNepseSymbol(symRaw);
  const companyName = pickStr(o, ["name", "company_name", "security_name", "securityName", "company", "Company"]);
  const previousCloseNpr = pickNum(o, ["previous_close", "prev_close", "yesterday_close", "prevClose", "cp"]);
  const openNpr = pickNum(o, ["open", "Open", "opening_price", "open_price"]);
  const changeNpr = pickNum(o, ["change", "point_change", "absolute_change", "pointChange"]);
  let changePct = pickNum(o, ["percent_change", "percentageChange", "change_percent", "pct_change", "perChange"]);
  if (changePct == null && changeNpr != null && previousCloseNpr != null && previousCloseNpr > 0) {
    changePct = (changeNpr / previousCloseNpr) * 100;
  }
  const highNpr = pickNum(o, ["high", "day_high", "High"]);
  const lowNpr = pickNum(o, ["low", "day_low", "Low"]);
  const volume = pickNum(o, ["volume", "total_volume", "Volume", "shareTraded"]);
  const turnoverNpr = pickNum(o, ["turnover", "total_turnover", "Turnover"]);
  const marketCap = pickNum(o, ["market_cap", "mkt_cap", "marketcap", "MarketCap"]);
  const trades = pickNum(o, ["trades", "total_trades", "Trades", "totalTrades"]);
  const lastUpdated = pickStr(o, ["last_updated", "updated_at", "timestamp"]);
  const sectorRaw = pickStr(o, ["sector", "Sector", "industry", "Industry"]);
  const master = masterBySymbol?.get(symbol);
  const sector = master?.sector ?? sectorRaw;

  let intradayRangePct: number | undefined;
  if (highNpr != null && lowNpr != null && previousCloseNpr != null && previousCloseNpr > 0) {
    intradayRangePct = ((highNpr - lowNpr) / previousCloseNpr) * 100;
  }

  return {
    symbol,
    companyName: master?.companyName ?? companyName,
    ltpNpr: ltp,
    changePct,
    changeNpr,
    previousCloseNpr,
    openNpr,
    highNpr,
    lowNpr,
    intradayRangePct,
    volume,
    turnoverNpr,
    marketCap,
    sector,
    trades: trades != null ? Math.round(trades) : undefined,
    lastUpdated,
  };
}

function parseIndexRow(o: Record<string, unknown>): NepseIndexRow | null {
  const name = pickStr(o, ["index_name", "indexName", "name", "index", "title", "Index"]);
  if (!name) return null;
  // Match official NEPSE website: publish currentValue + change/perChange as-is.
  // Do not swap in session `close` — that caused dashboard mismatches vs nepalstock.com.np.
  const currentValue = pickNum(o, [
    "currentValue",
    "current_index",
    "current_value",
    "value",
    "index_value",
    "last",
    "ltp",
  ]);
  const close = pickNum(o, ["close", "Close"]);
  const previousClose = pickNum(o, ["previousClose", "previous_close"]) ?? null;
  const value = currentValue ?? close ?? null;
  const changeNpr = pickNum(o, ["change", "point_change", "pointChange"]) ?? null;
  const changePct =
    pickNum(o, ["perChange", "percent_change", "percentageChange", "change_percent", "changePct", "pct_change"]) ?? null;
  return {
    name,
    value,
    changePct,
    changeNpr,
    high: pickNum(o, ["high"]) ?? null,
    low: pickNum(o, ["low"]) ?? null,
    previousClose,
  };
}

function emptyTopBoard(): NepseTopStocksBoard {
  return { topGainers: [], topLosers: [], topTurnover: [], topVolume: [], topTransactions: [] };
}

function mapTopList(
  rows: unknown,
  enrich?: Record<string, NepseSecurityTick>,
  masterBySymbol?: Map<string, { companyName: string; sector: string | null }>,
): NepseSecurityTick[] {
  if (!Array.isArray(rows)) return [];
  const out: NepseSecurityTick[] = [];
  for (const row of rows.slice(0, 40)) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const tick = rowToTick(o, masterBySymbol);
    if (!tick) continue;
    const live = enrich?.[tick.symbol];
    out.push({
      ...tick,
      // Fill gaps from the live board when the top-stocks payload omits fields.
      ltpNpr: tick.ltpNpr > 0 ? tick.ltpNpr : live?.ltpNpr ?? tick.ltpNpr,
      changePct: tick.changePct ?? live?.changePct,
      volume: tick.volume ?? live?.volume,
      turnoverNpr: tick.turnoverNpr ?? live?.turnoverNpr,
      trades: tick.trades ?? live?.trades,
      sector: tick.sector ?? live?.sector,
      companyName: tick.companyName ?? live?.companyName,
      marketCap: tick.marketCap ?? live?.marketCap,
    });
  }
  return out;
}

export async function fetchNepseYonepseBundle(): Promise<NepseBundle> {
  const sb = createMarketDataServiceClient();
  const masterRows = await listCompanyMasterMap(sb).catch(() => new Map());
  const masterBySymbol = new Map(
    [...masterRows.entries()].map(([symbol, row]) => [symbol, { companyName: row.companyName, sector: row.sector }]),
  );
  const bySymbol: Record<string, NepseSecurityTick> = {};
  let index: NepseIndexTick | undefined;
  const indices: NepseIndexRow[] = [];
  let marketStatus: NepseMarketFeedStatus = { isOpen: null, checkedAt: null };
  const summaryStats: NepseMarketSummaryStats = {
    totalTurnoverNpr: null,
    totalVolume: null,
    totalTrades: null,
    scripsTraded: null,
  };
  let topStocks = emptyTopBoard();

  const [indicesRes, dataRes, statusRes, summaryRes, topRes] = await Promise.allSettled([
    fetchJson<unknown>(YONEPSE_INDICES, { timeoutMs: 14_000, retries: 1 }),
    fetchJson<unknown>(YONEPSE_DATA, { timeoutMs: 20_000, retries: 0 }),
    fetchJson<unknown>(YONEPSE_STATUS, { timeoutMs: 8_000, retries: 0 }),
    fetchJson<unknown>(YONEPSE_SUMMARY, { timeoutMs: 8_000, retries: 0 }),
    fetchJson<unknown>(YONEPSE_TOP, { timeoutMs: 14_000, retries: 0 }),
  ]);

  if (indicesRes.status === "fulfilled" && Array.isArray(indicesRes.value)) {
    for (const row of indicesRes.value) {
      if (!row || typeof row !== "object") continue;
      const parsed = parseIndexRow(row as Record<string, unknown>);
      if (parsed) indices.push(parsed);
    }
    const nepseRow = indices.find((row) => /nepse/i.test(row.name) && !/sensitive|float/i.test(row.name));
    const fallback = nepseRow ?? indices.find((row) => /nepse/i.test(row.name)) ?? indices[0];
    if (fallback?.value != null) {
      index = {
        name: fallback.name.includes("NEPSE") ? "NEPSE" : fallback.name,
        value: fallback.value,
        changePct: fallback.changePct ?? undefined,
        changeNpr: fallback.changeNpr ?? undefined,
        previousClose: fallback.previousClose ?? undefined,
      };
    }
  }

  if (dataRes.status === "fulfilled") {
    const rows = Array.isArray(dataRes.value) ? dataRes.value : [];
    const cap = Math.min(rows.length, 12_000);
    for (let i = 0; i < cap; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const tick = rowToTick(row as Record<string, unknown>, masterBySymbol);
      if (!tick) continue;
      bySymbol[tick.symbol] = tick;
    }
  }

  if (statusRes.status === "fulfilled" && statusRes.value && typeof statusRes.value === "object") {
    const o = statusRes.value as Record<string, unknown>;
    marketStatus = {
      isOpen: typeof o.is_open === "boolean" ? o.is_open : typeof o.isOpen === "boolean" ? o.isOpen : null,
      checkedAt: pickStr(o, ["last_checked", "checked_at", "updated_at"]) ?? null,
    };
  }

  if (summaryRes.status === "fulfilled" && Array.isArray(summaryRes.value)) {
    for (const row of summaryRes.value) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const detail = (pickStr(o, ["detail", "label", "name"]) ?? "").toLowerCase();
      const value = pickNum(o, ["value", "amount"]);
      if (value == null) continue;
      if (detail.includes("turnover")) summaryStats.totalTurnoverNpr = value;
      else if (detail.includes("traded share") || detail.includes("volume")) summaryStats.totalVolume = value;
      else if (detail.includes("transaction")) summaryStats.totalTrades = value;
      else if (detail.includes("scrip")) summaryStats.scripsTraded = value;
    }
  }

  if (topRes.status === "fulfilled" && topRes.value && typeof topRes.value === "object") {
    const o = topRes.value as Record<string, unknown>;
    topStocks = {
      topGainers: mapTopList(o.top_gainer ?? o.topGainers, bySymbol, masterBySymbol),
      topLosers: mapTopList(o.top_loser ?? o.topLosers, bySymbol, masterBySymbol),
      topTurnover: mapTopList(o.top_turnover ?? o.topTurnover, bySymbol, masterBySymbol),
      topVolume: mapTopList(o.top_trade ?? o.topVolume, bySymbol, masterBySymbol),
      topTransactions: mapTopList(o.top_transaction ?? o.topTransactions, bySymbol, masterBySymbol),
    };
  }

  return { index, indices, bySymbol, marketStatus, summaryStats, topStocks };
}

const boardCache = createMemoryTtlCache();
const BOARD_TTL_MS = 20_000;

/**
 * Cached official NEPSE board for terminal routes (indices + movers + status).
 * Retains the historical function name for call-site compatibility.
 */
export async function getCachedNepseYonepseBoard(ttlMs = BOARD_TTL_MS): Promise<NepseBundle> {
  const key = "nepse-official-board-v1";
  const hit = boardCache.get<NepseBundle>(key);
  if (hit) return hit;
  const { getOfficialNepseLiveBundle } = await import("@/services/market/nepse-official-sync");
  const { bundle } = await getOfficialNepseLiveBundle({ ttlMs });
  boardCache.set(key, bundle, ttlMs);
  return bundle;
}
