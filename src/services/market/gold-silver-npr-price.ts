import { fetchJson } from "@/lib/api/fetch-json";
import {
  DEFAULT_BULLION_USD_PER_TROY_OZ,
  metalNprPerGramFromUsdSpot,
  nprPerTolaFromGram,
} from "@/lib/market/bullion-estimate";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";
import { fetchNprForexCross } from "@/services/market/forex-npr";
import {
  fetchHamroPatroNepalRates,
  hamroPatroCacheTtlMs,
  HAMRO_PATRO_GOLD_SOURCE_URL,
  nprPerGramFromHamroPatroTola,
  type HamroPatroNepalMetalRates,
} from "@/services/market/hamropatro-nepal-rates";
import { fetchYahooLast } from "@/services/market/yahoo-quotes";

let cacheExpiresAt = 0;
let cached: GoldSilverPriceResponse | null = null;
/** Last successful Hamro Patro (or domestic) payload for stale fallback — never Yahoo-as-domestic. */
let lastGoodDomestic: GoldSilverPriceResponse | null = null;

function isPositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function spotFromGoldApi(token: string): Promise<{ goldUsdPerOz: number; silverUsdPerOz: number } | null> {
  try {
    const [au, ag] = await Promise.all([
      fetchJson<{ price?: number }>(`https://www.goldapi.io/api/XAU/USD`, {
        timeoutMs: 12_000,
        retries: 1,
        init: { headers: { "x-access-token": token } },
      }),
      fetchJson<{ price?: number }>(`https://www.goldapi.io/api/XAG/USD`, {
        timeoutMs: 12_000,
        retries: 1,
        init: { headers: { "x-access-token": token } },
      }),
    ]);
    if (!isPositive(au.price) || !isPositive(ag.price)) return null;
    return { goldUsdPerOz: au.price, silverUsdPerOz: ag.price };
  } catch {
    return null;
  }
}

/** Metals.dev “latest” — USD per troy ounce for precious metals. */
async function spotFromMetalsDev(apiKey: string): Promise<{ goldUsdPerOz: number; silverUsdPerOz: number } | null> {
  try {
    const url = `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(apiKey)}&currency=USD&unit=toz`;
    const data = await fetchJson<{
      status?: string;
      metals?: { gold?: number; silver?: number };
    }>(url, { timeoutMs: 12_000, retries: 1 });
    if (data.status === "failure") return null;
    const g = data.metals?.gold;
    const s = data.metals?.silver;
    if (!isPositive(g) || !isPositive(s)) return null;
    return { goldUsdPerOz: g, silverUsdPerOz: s };
  } catch {
    return null;
  }
}

/** metalpriceapi.com latest — prefers `USDXAU` / `USDXAG` (USD per troy oz). */
async function spotFromMetalPriceApi(apiKey: string): Promise<{ goldUsdPerOz: number; silverUsdPerOz: number } | null> {
  try {
    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(apiKey)}&base=USD&currencies=XAU,XAG`;
    const data = await fetchJson<{
      success?: boolean;
      rates?: { XAU?: number; XAG?: number; USDXAU?: number; USDXAG?: number };
    }>(url, { timeoutMs: 12_000, retries: 1 });
    if (data.success === false) return null;
    const r = data.rates;
    if (!r) return null;
    let goldUsdPerOz: number | null = null;
    if (isPositive(r.USDXAU)) goldUsdPerOz = r.USDXAU;
    else if (isPositive(r.XAU) && r.XAU < 1) goldUsdPerOz = 1 / r.XAU;
    else if (isPositive(r.XAU)) goldUsdPerOz = r.XAU;
    let silverUsdPerOz: number | null = null;
    if (isPositive(r.USDXAG)) silverUsdPerOz = r.USDXAG;
    else if (isPositive(r.XAG) && r.XAG < 1) silverUsdPerOz = 1 / r.XAG;
    else if (isPositive(r.XAG)) silverUsdPerOz = r.XAG;
    if (!isPositive(goldUsdPerOz) || !isPositive(silverUsdPerOz)) return null;
    return { goldUsdPerOz, silverUsdPerOz };
  } catch {
    return null;
  }
}

async function spotFromYahoo(): Promise<{ goldUsdPerOz: number; silverUsdPerOz: number } | null> {
  const [g, s] = await Promise.all([fetchYahooLast("GC=F"), fetchYahooLast("SI=F")]);
  if (!g || !s || !isPositive(g.last) || !isPositive(s.last)) return null;
  return { goldUsdPerOz: g.last, silverUsdPerOz: s.last };
}

/** International USD/oz reference only — never used as silent Nepal domestic substitute. */
async function resolveUsdSpot(): Promise<{ spot: { goldUsdPerOz: number; silverUsdPerOz: number }; source: string }> {
  const goldApiKey = process.env.GOLDAPI_API_KEY ?? process.env.GOLD_API_KEY;
  if (goldApiKey) {
    const s = await spotFromGoldApi(goldApiKey);
    if (s) return { spot: s, source: "GoldAPI" };
  }
  const metalsDev = process.env.METALS_DEV_API_KEY;
  if (metalsDev) {
    const s = await spotFromMetalsDev(metalsDev);
    if (s) return { spot: s, source: "Metals.dev" };
  }
  const mpa = process.env.METALPRICEAPI_KEY ?? process.env.METAL_PRICE_API_KEY;
  if (mpa) {
    const s = await spotFromMetalPriceApi(mpa);
    if (s) return { spot: s, source: "MetalPriceAPI" };
  }
  const y = await spotFromYahoo();
  if (y) return { spot: y, source: "Yahoo Finance (GC=F / SI=F)" };
  return {
    spot: {
      goldUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz,
      silverUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz,
    },
    source: "USD spot estimate (feeds unavailable)",
  };
}

function hamroPatroDomesticPayload(
  nepal: HamroPatroNepalMetalRates,
  intl: { spot: { goldUsdPerOz: number; silverUsdPerOz: number }; source: string },
): GoldSilverPriceResponse {
  const gg = Math.max(nprPerGramFromHamroPatroTola(nepal.goldNprPerTola), 1e-6);
  const sg = Math.max(nprPerGramFromHamroPatroTola(nepal.silverNprPerTola), 1e-6);
  const syncedAt = new Date().toISOString();
  return {
    goldPerGramNPR: gg,
    silverPerGramNPR: sg,
    goldPerTolaNPR: nepal.goldNprPerTola,
    silverPerTolaNPR: nepal.silverNprPerTola,
    ...(nepal.goldNprPer10Gram != null ? { goldNepalPer10GramNPR: nepal.goldNprPer10Gram } : {}),
    ...(nepal.silverNprPer10Gram != null ? { silverNepalPer10GramNPR: nepal.silverNprPer10Gram } : {}),
    goldUsdPerTroyOz: intl.spot.goldUsdPerOz,
    silverUsdPerTroyOz: intl.spot.silverUsdPerOz,
    source: "Nepal — Hamro Patro (Hallmark Gold & Silver)",
    sourceUrl: HAMRO_PATRO_GOLD_SOURCE_URL,
    updatedAt: syncedAt,
    publishedDate: nepal.publishedDate,
    ...(nepal.publishedTimeLocal ? { publishedTimeLocal: nepal.publishedTimeLocal } : {}),
    ...(nepal.publishedBsLabel ? { publishedBsLabel: nepal.publishedBsLabel } : {}),
    goldDailyChangeNpr: nepal.goldDailyChangeNpr,
    silverDailyChangeNpr: nepal.silverDailyChangeNpr,
    goldDailyChangePct: nepal.goldDailyChangePct,
    silverDailyChangePct: nepal.silverDailyChangePct,
    nepalDomesticPrimary: true,
    domesticProvider: "hamro_patro",
    internationalRefSource: intl.source,
  };
}

/**
 * Domestic Nepal gold/silver from Hamro Patro (primary).
 * International USD/oz is attached as reference only.
 * On Hamro Patro failure: serve last verified Hamro Patro quote with `degraded` — never Yahoo as domestic.
 * If no verified domestic quote exists yet, returns Price Unavailable shape (zeros + unavailable).
 */
export async function getGoldSilverNprPrice(): Promise<GoldSilverPriceResponse> {
  const now = Date.now();
  if (cached && now < cacheExpiresAt) return cached;

  const ttl = hamroPatroCacheTtlMs(new Date(now));

  try {
    const [hamro, intl] = await Promise.all([fetchHamroPatroNepalRates(), resolveUsdSpot()]);
    if (hamro) {
      const fresh = hamroPatroDomesticPayload(hamro, intl);
      lastGoodDomestic = fresh;
      cached = fresh;
      cacheExpiresAt = now + ttl;
      return fresh;
    }

    // Hamro Patro unavailable — never silently substitute Yahoo/FX as Nepal domestic.
    if (lastGoodDomestic?.nepalDomesticPrimary && lastGoodDomestic.domesticProvider === "hamro_patro") {
      const stale: GoldSilverPriceResponse = {
        ...lastGoodDomestic,
        degraded: true,
        // Keep original publishedDate; refresh sync timestamp only as metadata via updatedAt of last good.
      };
      cached = stale;
      cacheExpiresAt = now + Math.min(ttl, 15 * 60 * 1000);
      return stale;
    }

    const unavailable: GoldSilverPriceResponse = {
      goldPerGramNPR: 0,
      silverPerGramNPR: 0,
      goldPerTolaNPR: 0,
      silverPerTolaNPR: 0,
      goldUsdPerTroyOz: intl.spot.goldUsdPerOz,
      silverUsdPerTroyOz: intl.spot.silverUsdPerOz,
      source: "Price Unavailable — Hamro Patro Nepal rates could not be verified",
      sourceUrl: HAMRO_PATRO_GOLD_SOURCE_URL,
      updatedAt: new Date().toISOString(),
      nepalDomesticPrimary: false,
      domesticProvider: "unavailable",
      internationalRefSource: intl.source,
      degraded: true,
    };
    cached = unavailable;
    cacheExpiresAt = now + Math.min(ttl, 5 * 60 * 1000);
    return unavailable;
  } catch {
    if (lastGoodDomestic?.nepalDomesticPrimary) {
      const stale: GoldSilverPriceResponse = { ...lastGoodDomestic, degraded: true };
      cached = stale;
      cacheExpiresAt = now + Math.min(ttl, 15 * 60 * 1000);
      return stale;
    }
    const unavailable: GoldSilverPriceResponse = {
      goldPerGramNPR: 0,
      silverPerGramNPR: 0,
      goldPerTolaNPR: 0,
      silverPerTolaNPR: 0,
      goldUsdPerTroyOz: DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz,
      silverUsdPerTroyOz: DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz,
      source: "Price Unavailable — Hamro Patro Nepal rates could not be verified",
      sourceUrl: HAMRO_PATRO_GOLD_SOURCE_URL,
      updatedAt: new Date().toISOString(),
      nepalDomesticPrimary: false,
      domesticProvider: "unavailable",
      degraded: true,
    };
    cached = unavailable;
    cacheExpiresAt = now + 120_000;
    return unavailable;
  }
}

/** Test/helpers: clear in-memory cache (unit tests only). */
export function __resetGoldSilverPriceCacheForTests(): void {
  cacheExpiresAt = 0;
  cached = null;
  lastGoodDomestic = null;
}

/** Kept for emergency tooling — FX spot → NPR is NOT used as Nepal domestic. */
export async function getInternationalSpotNprEstimate(): Promise<GoldSilverPriceResponse> {
  const intl = await resolveUsdSpot();
  const forex = await fetchNprForexCross();
  const { goldNprPerGram, silverNprPerGram } = metalNprPerGramFromUsdSpot(
    intl.spot.goldUsdPerOz,
    intl.spot.silverUsdPerOz,
    forex.usdPerNpr,
  );
  const gg = Math.max(goldNprPerGram, 1e-6);
  const sg = Math.max(silverNprPerGram, 1e-6);
  return {
    goldPerGramNPR: gg,
    silverPerGramNPR: sg,
    goldPerTolaNPR: nprPerTolaFromGram(gg),
    silverPerTolaNPR: nprPerTolaFromGram(sg),
    goldUsdPerTroyOz: intl.spot.goldUsdPerOz,
    silverUsdPerTroyOz: intl.spot.silverUsdPerOz,
    source: `International spot → NPR (${intl.source}) — reference only`,
    updatedAt: new Date().toISOString(),
    nepalDomesticPrimary: false,
    internationalRefSource: intl.source,
  };
}
