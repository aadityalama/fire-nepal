import { DEFAULT_BULLION_USD_PER_TROY_OZ } from "@/lib/market/bullion-estimate";
import { fetchCoingeckoUsd } from "@/services/market/coingecko";
import { fetchNprForexCross } from "@/services/market/forex-npr";
import { getOfficialNepseBundleWithMeta } from "@/services/market/nepse-bundle-cache";
import { buildNepseTerminalSnapshot } from "@/services/market/nepse-terminal";
import { fetchYahooLast } from "@/services/market/yahoo-quotes";
import type { MarketSnapshot, MarketSourceStatus, MetalSpotUsdOz } from "@/types/market";

const DEFAULT_METALS_USD_OZ: MetalSpotUsdOz = {
  goldUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz,
  silverUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz,
};

function splitEquitySymbols(symbols: string[]): { usd: string[]; kr: string[] } {
  const usd: string[] = [];
  const kr: string[] = [];
  for (const raw of symbols) {
    const s = raw.trim();
    if (!s) continue;
    if (/\.KS$/i.test(s)) kr.push(s.toUpperCase());
    else usd.push(s.toUpperCase());
  }
  return { usd, kr };
}

/**
 * Aggregates best-effort public feeds server-side (never throws — returns partial snapshot).
 * NEPSE values come exclusively from the official nepalstock.com.np sync (or last successful).
 */
export async function buildMarketSnapshot(opts: {
  /** Extra Yahoo symbols (US or `.KS`). */
  extraSymbols: string[];
  /** CoinGecko ids (lowercase). */
  cryptoIds: string[];
}): Promise<MarketSnapshot> {
  const sourceStatus: Record<string, MarketSourceStatus> = {};
  const fetchedAt = new Date().toISOString();

  const coreUsd = ["SPY", "QQQ", "GC=F", "SI=F"];
  const merged = [...new Set([...coreUsd, ...opts.extraSymbols.map((s) => s.trim())])];
  const { usd, kr } = splitEquitySymbols(merged);

  const forexP = fetchNprForexCross().then((fx) => {
    sourceStatus.forex = "ok";
    return fx;
  });

  const nepseP = getOfficialNepseBundleWithMeta()
    .then((served) => {
      sourceStatus.nepse = Object.keys(served.bundle.bySymbol).length || served.bundle.index ? "ok" : "error";
      return served;
    })
    .catch(() => {
      sourceStatus.nepse = "error";
      return null;
    });

  const cryptoIds = [...new Set(["bitcoin", "ethereum", ...opts.cryptoIds.map((c) => c.toLowerCase())])];

  const [forex, nepseServe, cg] = await Promise.all([
    forexP,
    nepseP,
    fetchCoingeckoUsd(cryptoIds)
      .then((m) => {
        sourceStatus.coingecko = Object.keys(m).length ? "ok" : "error";
        return m;
      })
      .catch(() => {
        sourceStatus.coingecko = "error";
        return {};
      }),
  ]);

  const usdEquities: MarketSnapshot["usdEquities"] = {};
  const krEquities: MarketSnapshot["krEquities"] = {};
  const metalsUsdOz = { ...DEFAULT_METALS_USD_OZ };

  const yahooUsdTargets = [...new Set(usd)];
  const yahooResults = await Promise.all(
    yahooUsdTargets.map(async (sym) => {
      const q = await fetchYahooLast(sym);
      return { sym, q };
    }),
  );
  let yahooOk = 0;
  for (const { sym, q } of yahooResults) {
    if (q) {
      yahooOk++;
      if (sym === "GC=F") metalsUsdOz.goldUsdPerOz = q.last;
      else if (sym === "SI=F") metalsUsdOz.silverUsdPerOz = q.last;
      else usdEquities[sym] = { symbol: sym, lastUsd: q.last, changePct: q.changePct };
    }
  }
  sourceStatus.yahoo_usd = yahooOk > 0 ? "ok" : "error";

  const krTargets = [...new Set(kr)];
  let krOk = 0;
  await Promise.all(
    krTargets.map(async (sym) => {
      const q = await fetchYahooLast(sym);
      if (q) {
        krOk++;
        krEquities[sym] = { symbol: sym, lastKrw: q.last, changePct: q.changePct };
      }
    }),
  );
  sourceStatus.yahoo_kr = !krTargets.length ? "skipped" : krOk > 0 ? "ok" : "error";

  const crypto: MarketSnapshot["crypto"] = {};
  for (const [id, lastUsd] of Object.entries(cg)) {
    crypto[id] = { id, lastUsd };
  }

  const nepse = nepseServe?.bundle;
  const partial =
    (sourceStatus.nepse === "error" && !nepse?.index) ||
    (sourceStatus.yahoo_usd === "error" && yahooOk === 0) ||
    Boolean(nepseServe?.meta.stale);

  const nepseTerminal =
    nepse && Object.keys(nepse.bySymbol).length > 0
      ? buildNepseTerminalSnapshot(nepse.bySymbol, {
          summaryStats: nepse.summaryStats,
          officialBreadth: nepse.officialBreadth,
        })
      : undefined;

  return {
    fetchedAt: nepseServe?.meta.lastSuccessfulSyncAt ?? fetchedAt,
    partial,
    sourceStatus,
    forex: {
      krwPerNpr: forex.krwPerNpr,
      usdPerNpr: forex.usdPerNpr,
      nprPerUsd: forex.nprPerUsd,
    },
    nepseIndex: nepse?.index,
    nepseBySymbol: nepse?.bySymbol ?? {},
    nepseTerminal,
    nepseSync: nepseServe
      ? {
          source: nepseServe.meta.source,
          lastSuccessfulSyncAt: nepseServe.meta.lastSuccessfulSyncAt,
          stale: nepseServe.meta.stale,
          marketIsOpen: nepseServe.bundle.marketStatus.isOpen,
          marketAsOf: nepseServe.bundle.marketStatus.checkedAt,
        }
      : undefined,
    usdEquities,
    krEquities,
    crypto,
    metalsUsdOz,
  };
}
