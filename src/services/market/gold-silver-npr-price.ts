import { fetchJson } from "@/lib/api/fetch-json";
import {
  DEFAULT_BULLION_USD_PER_TROY_OZ,
  metalNprPerGramFromUsdSpot,
  nprPerTolaFromGram,
} from "@/lib/market/bullion-estimate";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";
import { fetchNprForexCross } from "@/services/market/forex-npr";
import {
  fetchNepalFenegosidaTolaRates,
  nprPerGramFromNepalTolaBoard,
} from "@/services/market/fenegosida-nepal-rates";
import { fetchYahooLast } from "@/services/market/yahoo-quotes";

/** Align with client refresh (5–15m): server-side coalescing window. */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cacheExpiresAt = 0;
let cached: GoldSilverPriceResponse | null = null;
/** Last successful payload (for stale fallback). */
let lastGood: GoldSilverPriceResponse | null = null;

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

async function nprPayloadFromSpot(
  spot: { goldUsdPerOz: number; silverUsdPerOz: number },
  source: string,
  degraded?: boolean,
): Promise<GoldSilverPriceResponse> {
  const forex = await fetchNprForexCross();
  const { goldNprPerGram, silverNprPerGram } = metalNprPerGramFromUsdSpot(
    spot.goldUsdPerOz,
    spot.silverUsdPerOz,
    forex.usdPerNpr,
  );
  const gg = Math.max(goldNprPerGram, 1e-6);
  const sg = Math.max(silverNprPerGram, 1e-6);
  const updatedAt = new Date().toISOString();
  return {
    goldPerGramNPR: gg,
    silverPerGramNPR: sg,
    goldPerTolaNPR: nprPerTolaFromGram(gg),
    silverPerTolaNPR: nprPerTolaFromGram(sg),
    goldUsdPerTroyOz: spot.goldUsdPerOz,
    silverUsdPerTroyOz: spot.silverUsdPerOz,
    source,
    updatedAt,
    nepalDomesticPrimary: false,
    ...(degraded ? { degraded: true } : {}),
  };
}

/** Nepal board (FENEGOSIDA) NPR/tola with international USD/oz as secondary reference. */
function nepalBoardPayload(
  nepal: { goldNprPerTola: number; silverNprPerTola: number },
  intl: { spot: { goldUsdPerOz: number; silverUsdPerOz: number }; source: string },
): GoldSilverPriceResponse {
  const gg = Math.max(nprPerGramFromNepalTolaBoard(nepal.goldNprPerTola), 1e-6);
  const sg = Math.max(nprPerGramFromNepalTolaBoard(nepal.silverNprPerTola), 1e-6);
  const updatedAt = new Date().toISOString();
  return {
    goldPerGramNPR: gg,
    silverPerGramNPR: sg,
    goldPerTolaNPR: nepal.goldNprPerTola,
    silverPerTolaNPR: nepal.silverNprPerTola,
    goldUsdPerTroyOz: intl.spot.goldUsdPerOz,
    silverUsdPerTroyOz: intl.spot.silverUsdPerOz,
    source: `Nepal — FENEGOSIDA (Fine Gold 9999 & Silver, official board) · Intl ref: ${intl.source}`,
    updatedAt,
    nepalDomesticPrimary: true,
    internationalRefSource: intl.source,
  };
}

/**
 * Returns cached bullion NPR/g for a few minutes; on hard failure reuses last good values with `degraded: true`.
 * Never returns zero prices when any historical or anchor data exists.
 */
export async function getGoldSilverNprPrice(): Promise<GoldSilverPriceResponse> {
  const now = Date.now();
  if (cached && now < cacheExpiresAt) return cached;

  try {
    const [nepalTola, intl] = await Promise.all([fetchNepalFenegosidaTolaRates(), resolveUsdSpot()]);
    const fresh = nepalTola
      ? nepalBoardPayload(nepalTola, intl)
      : await nprPayloadFromSpot(intl.spot, `International spot → NPR (${intl.source})`, false);
    lastGood = fresh;
    cached = fresh;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return fresh;
  } catch {
    if (lastGood) {
      const stale: GoldSilverPriceResponse = { ...lastGood, degraded: true, updatedAt: lastGood.updatedAt };
      cached = stale;
      cacheExpiresAt = now + CACHE_TTL_MS;
      return stale;
    }
    const forex = await fetchNprForexCross().catch(() => null);
    const usdPerNpr = forex?.usdPerNpr ?? undefined;
    const spot = {
      goldUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz,
      silverUsdPerOz: DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz,
    };
    const { goldNprPerGram, silverNprPerGram } = metalNprPerGramFromUsdSpot(
      spot.goldUsdPerOz,
      spot.silverUsdPerOz,
      usdPerNpr ?? 1 / 133.5,
    );
    const gg = Math.max(goldNprPerGram, 1e-6);
    const sg = Math.max(silverNprPerGram, 1e-6);
    const emergency: GoldSilverPriceResponse = {
      goldPerGramNPR: gg,
      silverPerGramNPR: sg,
      goldPerTolaNPR: nprPerTolaFromGram(gg),
      silverPerTolaNPR: nprPerTolaFromGram(sg),
      goldUsdPerTroyOz: spot.goldUsdPerOz,
      silverUsdPerTroyOz: spot.silverUsdPerOz,
      source: "Anchored estimate (no live feed yet)",
      updatedAt: new Date().toISOString(),
      nepalDomesticPrimary: false,
      degraded: true,
    };
    cached = emergency;
    cacheExpiresAt = now + Math.min(CACHE_TTL_MS, 120_000);
    return emergency;
  }
}
