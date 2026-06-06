import { NEPAL_METAL_TOLA_GRAMS } from "@/lib/market/bullion-estimate";

/**
 * Official Nepal bullion board figures published on fenegosida.org (FENEGOSIDA —
 * Federation of Nepal Gold and Silver Dealers' Association), aligned with FNGSGJA industry rates.
 */
const FENEGOSIDA_URLS = ["https://www.fenegosida.org/", "https://fenegosida.org/"] as const;

/** HTML markers for the homepage rate cards (structure verified 2026). */
const RE_FINE_GOLD_10G = /FINE GOLD\s*\(\s*9999\s*\)\s*<br\s*\/?>\s*<span>\s*per\s*10\s*grm/i;
const RE_FINE_GOLD_TOLA = /FINE GOLD\s*\(\s*9999\s*\)\s*<br\s*\/?>\s*<span>\s*per\s*1\s*tola/i;
const RE_SILVER_10G = /<p>\s*SILVER\s*<br\s*\/?>\s*<span>\s*per\s*10\s*grm/i;
const RE_SILVER_TOLA = /<p>\s*SILVER\s*<br\s*\/?>\s*<span>\s*per\s*1\s*tola/i;

export type FenegosidaNepalBoardRates = {
  goldNprPer10Gram: number;
  goldNprPerTola: number;
  silverNprPer10Gram: number;
  silverNprPerTola: number;
};

function parseNprInt(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function firstBoldNprAfter(html: string, anchor: RegExp): number | null {
  const m = html.match(anchor);
  if (!m || m.index === undefined) return null;
  const slice = html.slice(m.index, m.index + 900);
  const b = slice.match(/<b>\s*(\d[\d,]*)\s*<\/b>/i);
  if (!b?.[1]) return null;
  return parseNprInt(b[1]);
}

/**
 * Parse official Nepal bullion board rates from the FENEGOSIDA public homepage HTML.
 * Reads **Fine Gold (9999)** and **Silver** per **10 g** and per **1 tola** from the published `<b>` amounts.
 */
export function parseFenegosidaNepalRatesFromHtml(html: string): FenegosidaNepalBoardRates | null {
  const goldNprPer10Gram = firstBoldNprAfter(html, RE_FINE_GOLD_10G);
  const goldNprPerTola = firstBoldNprAfter(html, RE_FINE_GOLD_TOLA);
  const silverNprPer10Gram = firstBoldNprAfter(html, RE_SILVER_10G);
  const silverNprPerTola = firstBoldNprAfter(html, RE_SILVER_TOLA);
  if (goldNprPer10Gram == null || goldNprPerTola == null || silverNprPer10Gram == null || silverNprPerTola == null) {
    return null;
  }
  if (goldNprPer10Gram < 50_000 || goldNprPerTola < 50_000) return null;
  if (silverNprPer10Gram < 100 || silverNprPerTola < 100) return null;
  return { goldNprPer10Gram, goldNprPerTola, silverNprPer10Gram, silverNprPerTola };
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14_000);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "FireNepalHomepage/1.0 (+https://github.com/aadityalama/fire-nepal; FENEGOSIDA board rate reader)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Nepal Federation (FENEGOSIDA) published board — primary valuation for the app. */
export async function fetchNepalFenegosidaBoardRates(): Promise<FenegosidaNepalBoardRates | null> {
  for (const url of FENEGOSIDA_URLS) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const parsed = parseFenegosidaNepalRatesFromHtml(html);
    if (parsed) return parsed;
  }
  return null;
}

/** NPR/g from official **per 10 g** board line (FENEGOSIDA publishes 10 g explicitly). */
export function nprPerGramFromNepal10GramBoard(nprPer10Gram: number): number {
  return Math.max(nprPer10Gram, 1e-9) / 10;
}

/** Fallback: derive NPR/g from published per-tola when 10 g line is unavailable. */
export function nprPerGramFromNepalTolaBoard(nprPerTola: number): number {
  return Math.max(nprPerTola, 1e-9) / NEPAL_METAL_TOLA_GRAMS;
}
