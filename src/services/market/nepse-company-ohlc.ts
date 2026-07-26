import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import type { Candle } from "@/lib/market/technical-indicators";

export type NepseOhlcBar = Candle & {
  tradeDate: string;
  turnoverNpr: number | null;
  trades: number | null;
  previousCloseNpr: number | null;
  changePct: number | null;
};

export type NepseOhlcPayload = {
  symbol: string;
  bars: NepseOhlcBar[];
  count: number;
  fromDate: string | null;
  toDate: string | null;
  source: "nepse_eod_prices";
  loadedAt: string;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

/**
 * Load real EOD OHLC bars for a symbol from `nepse_eod_prices`.
 * Returns an empty series when history has not been ingested — never synthesizes candles.
 */
export async function loadCompanyOhlc(symbolRaw: string, limit = 400): Promise<NepseOhlcPayload> {
  const symbol = decodeURIComponent(symbolRaw).trim().toUpperCase();
  const capped = Math.min(Math.max(limit, 1), 1500);
  const empty: NepseOhlcPayload = {
    symbol,
    bars: [],
    count: 0,
    fromDate: null,
    toDate: null,
    source: "nepse_eod_prices",
    loadedAt: new Date().toISOString(),
  };

  const sb = createMarketDataServiceClient();
  if (!sb) return empty;

  const { data, error } = await sb
    .from("nepse_eod_prices")
    .select("trade_date, open_npr, high_npr, low_npr, close_npr, previous_close_npr, change_pct, volume, turnover_npr, trades")
    .eq("symbol", symbol)
    .order("trade_date", { ascending: false })
    .limit(capped);

  if (error || !data?.length) return empty;

  const bars: NepseOhlcBar[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const tradeDate = str(row.trade_date);
    const close = num(row.close_npr);
    if (!tradeDate || close == null || close <= 0) continue;
    const open = num(row.open_npr) ?? num(row.previous_close_npr) ?? close;
    const high = num(row.high_npr) ?? Math.max(open, close);
    const low = num(row.low_npr) ?? Math.min(open, close);
    bars.push({
      tradeDate,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume: Math.max(0, Math.round(num(row.volume) ?? 0)),
      turnoverNpr: num(row.turnover_npr),
      trades: num(row.trades) != null ? Math.round(num(row.trades)!) : null,
      previousCloseNpr: num(row.previous_close_npr),
      changePct: num(row.change_pct),
    });
  }

  // Query was newest-first; reverse to chronological for indicators/charts.
  bars.reverse();

  return {
    symbol,
    bars,
    count: bars.length,
    fromDate: bars[0]?.tradeDate ?? null,
    toDate: bars[bars.length - 1]?.tradeDate ?? null,
    source: "nepse_eod_prices",
    loadedAt: new Date().toISOString(),
  };
}
