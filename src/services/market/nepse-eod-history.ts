import { fetchJson } from "@/lib/api/fetch-json";

/**
 * Historical NEPSE OHLC from the public ShareSansar archive (OmitNomis GitHub Pages).
 * Used to seed `nepse_eod_prices` so technical indicators have real multi-day bars.
 * Unofficial archive — never invents values; empty/missing fields stay null.
 */

const HISTORY_BASE = "https://omitnomis.github.io/ShareSansarScraper/api";

export type HistoryBar = {
  tradeDate: string;
  openNpr: number | null;
  highNpr: number | null;
  lowNpr: number | null;
  closeNpr: number;
  volume: number | null;
  turnoverNpr: number | null;
  changePct: number | null;
  previousCloseNpr: number | null;
};

type ColumnarHistory = {
  symbol?: string;
  cols?: string[];
  rows?: unknown[][];
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function dateStr(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export async function fetchArchiveSymbols(): Promise<string[]> {
  const payload = await fetchJson<unknown>(`${HISTORY_BASE}/symbols.json`, { timeoutMs: 20_000, retries: 1 });
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter(Boolean);
}

/** Fetch full OHLC history for one symbol from the public archive. */
export async function fetchSymbolHistory(symbolRaw: string): Promise<HistoryBar[]> {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol) return [];
  const payload = await fetchJson<ColumnarHistory>(`${HISTORY_BASE}/history/${encodeURIComponent(symbol)}.json`, {
    timeoutMs: 30_000,
    retries: 1,
  });
  const cols = payload.cols ?? [];
  const rows = payload.rows ?? [];
  if (!cols.length || !rows.length) return [];

  const idx = Object.fromEntries(cols.map((col, i) => [col, i]));
  const required = ["d", "c"];
  if (required.some((key) => idx[key] == null)) return [];

  const bars: HistoryBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const tradeDate = dateStr(row[idx.d]);
    const close = num(row[idx.c]) ?? num(row[idx.ltp]);
    if (!tradeDate || close == null || close <= 0) continue;
    bars.push({
      tradeDate,
      openNpr: num(row[idx.o]),
      highNpr: num(row[idx.h]),
      lowNpr: num(row[idx.l]),
      closeNpr: close,
      volume: num(row[idx.vol]),
      turnoverNpr: num(row[idx.to]),
      changePct: num(row[idx.dp]),
      previousCloseNpr: null,
    });
  }

  bars.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  for (let i = 0; i < bars.length; i++) {
    if (i > 0) bars[i].previousCloseNpr = bars[i - 1].closeNpr;
    if (bars[i].openNpr == null) bars[i].openNpr = bars[i].previousCloseNpr ?? bars[i].closeNpr;
    if (bars[i].highNpr == null) {
      bars[i].highNpr = Math.max(bars[i].openNpr ?? bars[i].closeNpr, bars[i].closeNpr);
    }
    if (bars[i].lowNpr == null) {
      bars[i].lowNpr = Math.min(bars[i].openNpr ?? bars[i].closeNpr, bars[i].closeNpr);
    }
  }
  return bars;
}
