import { NEPAL_METAL_TOLA_GRAMS } from "@/lib/market/bullion-estimate";

const FENEGOSIDA_URLS = ["https://www.fenegosida.org/", "https://fenegosida.org/"] as const;

function parseNprInt(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/**
 * Parse official Nepal bullion board rates from the FENEGOSIDA public homepage HTML.
 * Uses Fine Gold (9999) and Silver **per 1 tola** (Nepal trade convention).
 */
export function parseFenegosidaNepalRatesFromHtml(html: string): {
  goldNprPerTola: number;
  silverNprPerTola: number;
} | null {
  const goldM = html.match(/FINE GOLD\s*\(9999\)\s*per\s*1\s*tola[^\d]{0,32}(\d[\d,]*)/i);
  const silverM = html.match(/SILVER\s*per\s*1\s*tola[^\d]{0,32}(\d[\d,]*)/i);
  if (!goldM?.[1] || !silverM?.[1]) return null;
  const goldNprPerTola = parseNprInt(goldM[1]);
  const silverNprPerTola = parseNprInt(silverM[1]);
  if (goldNprPerTola == null || silverNprPerTola == null) return null;
  /** Reject obvious parse garbage / placeholder zeros. */
  if (goldNprPerTola < 50_000 || silverNprPerTola < 500) return null;
  return { goldNprPerTola, silverNprPerTola };
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
        "User-Agent": "FireNepalHomepage/1.0 (+https://github.com/aadityalama/fire-nepal; bullion NPR board mirror)",
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

/** Nepal Federation (FENEGOSIDA) published rates — primary valuation for the app. */
export async function fetchNepalFenegosidaTolaRates(): Promise<{
  goldNprPerTola: number;
  silverNprPerTola: number;
} | null> {
  for (const url of FENEGOSIDA_URLS) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const parsed = parseFenegosidaNepalRatesFromHtml(html);
    if (parsed) return parsed;
  }
  return null;
}

export function nprPerGramFromNepalTolaBoard(nprPerTola: number): number {
  return Math.max(nprPerTola, 1e-9) / NEPAL_METAL_TOLA_GRAMS;
}
