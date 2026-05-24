import { fetchJson } from "@/lib/api/fetch-json";
import { sectorForListedSymbol } from "@/services/market/nepse-sector-map";
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

export type NepseBundle = {
  index?: NepseIndexTick;
  bySymbol: Record<string, NepseSecurityTick>;
};

function rowToTick(o: Record<string, unknown>): NepseSecurityTick | null {
  const symRaw = pickStr(o, ["symbol", "SYMBOL", "ticker", "stock_symbol", "security_symbol"]);
  const ltp = pickNum(o, ["ltp", "close", "last_price", "closing_price", "Close", "LTP", "last", "nav", "NAV"]);
  if (!symRaw || ltp == null) return null;

  const symbol = normalizeNepseSymbol(symRaw);
  const companyName = pickStr(o, ["name", "company_name", "security_name", "company", "Company"]);
  const previousCloseNpr = pickNum(o, ["previous_close", "prev_close", "yesterday_close", "prevClose"]);
  const changeNpr = pickNum(o, ["change", "point_change", "absolute_change"]);
  let changePct = pickNum(o, ["percent_change", "change_percent", "pct_change"]);
  if (changePct == null && changeNpr != null && previousCloseNpr != null && previousCloseNpr > 0) {
    changePct = (changeNpr / previousCloseNpr) * 100;
  }
  const highNpr = pickNum(o, ["high", "day_high", "High"]);
  const lowNpr = pickNum(o, ["low", "day_low", "Low"]);
  const volume = pickNum(o, ["volume", "total_volume", "Volume"]);
  const turnoverNpr = pickNum(o, ["turnover", "total_turnover", "Turnover"]);
  const marketCap = pickNum(o, ["market_cap", "mkt_cap", "marketcap", "MarketCap"]);
  const trades = pickNum(o, ["trades", "total_trades", "Trades"]);
  const lastUpdated = pickStr(o, ["last_updated", "updated_at", "timestamp"]);
  const sectorRaw = pickStr(o, ["sector", "Sector", "industry", "Industry"]);
  const sectorFromRegistry = sectorForListedSymbol(symbol);
  const sector = sectorRaw ?? sectorFromRegistry;

  let intradayRangePct: number | undefined;
  if (highNpr != null && lowNpr != null && previousCloseNpr != null && previousCloseNpr > 0) {
    intradayRangePct = ((highNpr - lowNpr) / previousCloseNpr) * 100;
  }

  return {
    symbol,
    companyName,
    ltpNpr: ltp,
    changePct,
    changeNpr,
    previousCloseNpr,
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

export async function fetchNepseYonepseBundle(): Promise<NepseBundle> {
  const bySymbol: Record<string, NepseSecurityTick> = {};
  let index: NepseIndexTick | undefined;

  try {
    const indices = await fetchJson<unknown>(YONEPSE_INDICES, { timeoutMs: 14_000, retries: 1 });
    if (Array.isArray(indices)) {
      for (const row of indices) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const name =
          pickStr(o, ["index_name", "name", "index", "title", "Index"]) ?? "NEPSE";
        const value = pickNum(o, ["current_index", "close", "value", "index_value", "last", "ltp"]);
        const changePct = pickNum(o, ["percent_change", "change_percent", "changePct", "pct_change"]);
        if (value != null && /nepse/i.test(String(name))) {
          index = { name: "NEPSE", value, changePct };
          break;
        }
      }
      if (!index) {
        const first = indices[0];
        if (first && typeof first === "object") {
          const o = first as Record<string, unknown>;
          const name = pickStr(o, ["index_name", "name"]) ?? "Index";
          const value = pickNum(o, ["current_index", "close", "value", "index_value", "last"]);
          if (value != null) index = { name, value };
        }
      }
    }
  } catch {
    /* partial */
  }

  try {
    const data = await fetchJson<unknown>(YONEPSE_DATA, { timeoutMs: 20_000, retries: 0 });
    const rows = Array.isArray(data) ? data : [];
    const cap = Math.min(rows.length, 12_000);
    for (let i = 0; i < cap; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const tick = rowToTick(row as Record<string, unknown>);
      if (!tick) continue;
      bySymbol[tick.symbol] = tick;
    }
  } catch {
    /* partial */
  }

  return { index, bySymbol };
}
