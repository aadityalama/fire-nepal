import { fetchJson } from "@/lib/api/fetch-json";

export type YahooQuote = { symbol: string; last: number; changePct?: number };

/** Yahoo Finance chart API (single symbol). */
export async function fetchYahooLast(symbol: string): Promise<YahooQuote | null> {
  const enc = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=1d`;
  try {
    const data = await fetchJson<{
      chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }[] };
    }>(url, { timeoutMs: 10_000, retries: 1 });
    const meta = data.chart?.result?.[0]?.meta;
    const last = meta?.regularMarketPrice;
    if (typeof last !== "number" || !Number.isFinite(last)) return null;
    const prev = meta?.chartPreviousClose;
    const changePct =
      typeof prev === "number" && prev > 0 ? ((last - prev) / prev) * 100 : undefined;
    return { symbol, last, changePct };
  } catch {
    return null;
  }
}

export async function fetchYahooBatch(symbols: string[]): Promise<Record<string, YahooQuote>> {
  const uniq = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  const settled = await Promise.all(uniq.map(async (sym) => ({ sym, q: await fetchYahooLast(sym) })));
  const out: Record<string, YahooQuote> = {};
  for (const { sym, q } of settled) {
    if (q) out[sym.toUpperCase()] = q;
  }
  return out;
}
