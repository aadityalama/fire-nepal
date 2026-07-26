import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { loadIndexEodSeries } from "@/services/market/nepse-index-eod";
import type { PortfolioMarketContext } from "@/lib/portfolio/institutional-analytics";

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function indexKeyFromName(name: string): string {
  const n = name.trim();
  if (/nepse/i.test(n) && !/sensitive|float|sub/i.test(n)) return "NEPSE";
  if (/sensitive/i.test(n)) return "SENSITIVE";
  if (/float/i.test(n)) return "FLOAT";
  return n
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

/**
 * Batch market context for institutional portfolio analytics.
 * Only returns persisted / published values — never synthesizes prices or dividends.
 */
export async function loadPortfolioMarketContext(symbolsRaw: string[]): Promise<PortfolioMarketContext> {
  const symbols = [...new Set(symbolsRaw.map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, 80);
  const empty: PortfolioMarketContext = {
    eodBySymbol: {},
    profiles: {},
    dividends: {},
    indexEod: {},
    liveIndices: [],
    loadedAt: new Date().toISOString(),
  };
  if (!symbols.length) return empty;

  const sb = createMarketDataServiceClient();
  const bundlePromise = getCachedNepseYonepseBundle().catch(() => null);

  if (!sb) {
    const bundle = await bundlePromise;
    return {
      ...empty,
      liveIndices: (bundle?.indices ?? []).map((idx) => ({
        indexKey: indexKeyFromName(idx.name),
        indexName: idx.name,
        value: idx.value,
        changePct: idx.changePct,
      })),
      loadedAt: new Date().toISOString(),
    };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 420);
  const sinceIso = since.toISOString().slice(0, 10);

  const [eodRes, profileRes, divRes, indexEod, bundle] = await Promise.all([
    sb
      .from("nepse_eod_prices")
      .select("symbol, trade_date, close_npr")
      .in("symbol", symbols)
      .gte("trade_date", sinceIso)
      .order("trade_date", { ascending: true }),
    sb
      .from("nepse_company_profiles")
      .select("symbol, company_name, sector, industry, market_cap_npr")
      .in("symbol", symbols),
    sb
      .from("nepse_company_dividends")
      .select("symbol, fiscal_year, cash_pct, bonus_pct, book_close_date, agm_date")
      .in("symbol", symbols)
      .order("fiscal_year", { ascending: false }),
    loadIndexEodSeries(["NEPSE", "SENSITIVE", "FLOAT"], 400),
    bundlePromise,
  ]);

  const eodBySymbol: PortfolioMarketContext["eodBySymbol"] = {};
  for (const row of (eodRes.data ?? []) as Record<string, unknown>[]) {
    const symbol = str(row.symbol)?.toUpperCase();
    const tradeDate = str(row.trade_date)?.slice(0, 10);
    const closeNpr = num(row.close_npr);
    if (!symbol || !tradeDate || closeNpr == null || closeNpr <= 0) continue;
    (eodBySymbol[symbol] ??= []).push({ tradeDate, closeNpr });
  }

  // Fill sector from live ticks when profile sector is missing.
  const profiles: PortfolioMarketContext["profiles"] = {};
  for (const row of (profileRes.data ?? []) as Record<string, unknown>[]) {
    const symbol = str(row.symbol)?.toUpperCase();
    if (!symbol) continue;
    profiles[symbol] = {
      symbol,
      companyName: str(row.company_name),
      sector: str(row.sector) ?? bundle?.bySymbol[symbol]?.sector ?? null,
      marketCapNpr: num(row.market_cap_npr) ?? bundle?.bySymbol[symbol]?.marketCap ?? null,
      industry: str(row.industry),
    };
  }
  for (const symbol of symbols) {
    if (profiles[symbol]) continue;
    const tick = bundle?.bySymbol[symbol];
    if (!tick) continue;
    profiles[symbol] = {
      symbol,
      companyName: tick.companyName ?? null,
      sector: tick.sector ?? null,
      marketCapNpr: tick.marketCap ?? null,
      industry: null,
    };
  }

  const dividends: PortfolioMarketContext["dividends"] = {};
  for (const row of (divRes.data ?? []) as Record<string, unknown>[]) {
    const symbol = str(row.symbol)?.toUpperCase();
    if (!symbol) continue;
    (dividends[symbol] ??= []).push({
      symbol,
      fiscalYear: str(row.fiscal_year) ?? "",
      cashPct: num(row.cash_pct),
      bonusPct: num(row.bonus_pct),
      bookCloseDate: str(row.book_close_date)?.slice(0, 10) ?? null,
      agmDate: str(row.agm_date)?.slice(0, 10) ?? null,
    });
  }

  // Merge sector index keys discovered from profiles into index series when present.
  const sectorKeys = [
    ...new Set(
      Object.values(profiles)
        .map((p) => p.sector)
        .filter((s): s is string => !!s)
        .map((s) => indexKeyFromName(s)),
    ),
  ].slice(0, 12);
  if (sectorKeys.length) {
    const extra = await loadIndexEodSeries(sectorKeys, 400);
    Object.assign(indexEod, extra);
  }

  const liveIndices = (bundle?.indices ?? []).map((idx) => ({
    indexKey: indexKeyFromName(idx.name),
    indexName: idx.name,
    value: idx.value,
    changePct: idx.changePct,
  }));

  return {
    eodBySymbol,
    profiles,
    dividends,
    indexEod,
    liveIndices,
    loadedAt: new Date().toISOString(),
  };
}
