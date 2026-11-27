/**
 * Nepal domestic gold & silver rates from Hamro Patro’s public gold page.
 *
 * Authorization / access notes:
 * - No official developer API is documented by Hamro Patro.
 * - robots.txt allows `/gold` and `/en/gold` (disallows `/widgets/`, login, etc.).
 * - We only read the public HTML page and its embedded `hp-bootstrap` JSON
 *   (same class of server-side public-page parsing already used for festivals
 *   and FENEGOSIDA board rates). No undocumented private endpoints.
 * - Respect timeouts, cache aggressively, and never hammer the origin.
 *
 * @see https://www.hamropatro.com/gold
 * @see https://www.hamropatro.com/en/gold
 */

import { NEPAL_UI_GRAMS_PER_TOLA } from "@/lib/portfolio/nepal-metal-ui-convert";

export const HAMRO_PATRO_GOLD_URLS = [
  "https://www.hamropatro.com/en/gold",
  "https://www.hamropatro.com/gold",
] as const;

export const HAMRO_PATRO_GOLD_SOURCE_URL = "https://www.hamropatro.com/gold";

const FETCH_TIMEOUT_MS = 12_000;

export type HamroPatroNepalMetalRates = {
  goldNprPerTola: number;
  silverNprPerTola: number;
  /** Published Hallmark gold per 10 g when present. */
  goldNprPer10Gram: number | null;
  /** Published silver per 10 g when present. */
  silverNprPer10Gram: number | null;
  /** Gregorian publication date `YYYY-MM-DD` from Hamro Patro payload. */
  publishedDate: string;
  /** Local clock string when present (e.g. `10:45 am`). */
  publishedTimeLocal: string | null;
  /** BS label fragments when present (e.g. Mangsir 10). */
  publishedBsLabel: string | null;
  /** Absolute NPR change vs previous published day (signed). */
  goldDailyChangeNpr: number | null;
  silverDailyChangeNpr: number | null;
  /** Percent change vs previous published day (signed). */
  goldDailyChangePct: number | null;
  silverDailyChangePct: number | null;
  /** Epoch ms from Hamro Patro `updatedMs` when present. */
  sourceUpdatedMs: number | null;
};

type PricePoint = { date?: string; price?: number };
type PriceUnit = { name?: string; price?: PricePoint; history?: PricePoint[] };
type MetalItem = { name?: string; symbol?: string; prices?: PriceUnit[] };

type EnSegment = {
  name?: string;
  date?: string;
  updatedMs?: number;
  items?: MetalItem[];
};

type HpBootstrap = {
  data?: {
    enSegment?: EnSegment;
  };
  today?: {
    adKey?: string;
    year_ad?: number;
    month_ad?: number;
    date_ad?: number;
  };
};

function isPositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function parseNprAmount(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function unitIsTola(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("tola") || n.includes("तोला");
}

function unitIs10g(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().replace(/\s+/g, "");
  return n.includes("10g") || n.includes("10gm") || n.includes("१०ग्राम") || n.includes("10ग्राम");
}

function findUnit(item: MetalItem, pred: (name: string | undefined) => boolean): PriceUnit | null {
  const prices = item.prices;
  if (!Array.isArray(prices)) return null;
  return prices.find((p) => pred(p?.name)) ?? null;
}

function pickHallmark(items: MetalItem[]): MetalItem | null {
  for (const item of items) {
    const sym = String(item.symbol ?? "").toUpperCase();
    const name = String(item.name ?? "").toLowerCase();
    if (sym === "HALMARK" || sym === "HALLMARK") return item;
    if (name.includes("hallmark") || name.includes("halmark") || name.includes("छापावाल")) return item;
  }
  return null;
}

function pickSilver(items: MetalItem[]): MetalItem | null {
  for (const item of items) {
    const sym = String(item.symbol ?? "").toUpperCase();
    const name = String(item.name ?? "").toLowerCase();
    if (sym === "SILVER") return item;
    if (name === "silver" || name.includes("चाँदी") || name.includes("चांदी")) return item;
  }
  return null;
}

function dailyChangeFromUnit(unit: PriceUnit | null): {
  changeNpr: number | null;
  changePct: number | null;
} {
  if (!unit?.price || !isPositive(unit.price.price)) {
    return { changeNpr: null, changePct: null };
  }
  const current = unit.price.price;
  const history = Array.isArray(unit.history) ? unit.history : [];
  // history[0] is usually current; previous trading day is history[1]
  let previous: number | null = null;
  for (const point of history) {
    if (!point || !isPositive(point.price)) continue;
    if (point.price === current && point.date === unit.price.date) continue;
    if (unit.price.date && point.date === unit.price.date) continue;
    previous = point.price;
    break;
  }
  // If first history entry equals current, take the next distinct price.
  if (previous == null && history.length >= 2 && isPositive(history[1]?.price)) {
    previous = history[1]!.price!;
  }
  if (previous == null || previous <= 0) return { changeNpr: null, changePct: null };
  const changeNpr = current - previous;
  const changePct = (changeNpr / previous) * 100;
  return { changeNpr, changePct };
}

function extractBootstrapJson(html: string): HpBootstrap | null {
  const m = html.match(
    /<script[^>]*id=["']hp-bootstrap["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as HpBootstrap;
  } catch {
    return null;
  }
}

function parsePublishedTimeFromHtml(html: string): {
  timeLocal: string | null;
  bsLabel: string | null;
} {
  // Hamro Patro injects React comment nodes: Last updated<!-- -->: <!-- -->Mangsir …
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, " ");
  // "Last updated: Mangsir 10 | 10:45 am"
  const m = cleaned.match(
    /Last updated\s*:\s*([A-Za-z\u0900-\u097F]+)\s+(\d{1,2})\s*\|\s*(\d{1,2}:\d{2}\s*[ap]m)/i,
  );
  if (!m) return { timeLocal: null, bsLabel: null };
  const month = m[1]?.replace(/\s+/g, " ").trim() ?? "";
  const day = m[2]?.trim() ?? "";
  const time = m[3]?.replace(/\s+/g, " ").trim().toLowerCase() ?? null;
  return {
    timeLocal: time,
    bsLabel: month && day ? `${month} ${day}` : null,
  };
}

/**
 * Parse Hamro Patro public gold HTML into verified Nepal rates.
 * Prefers embedded `hp-bootstrap` JSON; falls back to visible Hallmark/Silver tola cards.
 */
export function parseHamroPatroNepalRatesFromHtml(html: string): HamroPatroNepalMetalRates | null {
  if (!html || html.length < 200) return null;

  const bootstrap = extractBootstrapJson(html);
  const segment = bootstrap?.data?.enSegment;
  const items = Array.isArray(segment?.items) ? segment!.items! : [];
  const goldItem = pickHallmark(items);
  const silverItem = pickSilver(items);

  const goldTolaUnit = goldItem ? findUnit(goldItem, unitIsTola) : null;
  const gold10Unit = goldItem ? findUnit(goldItem, unitIs10g) : null;
  const silverTolaUnit = silverItem ? findUnit(silverItem, unitIsTola) : null;
  const silver10Unit = silverItem ? findUnit(silverItem, unitIs10g) : null;

  let goldNprPerTola =
    goldTolaUnit?.price && isPositive(goldTolaUnit.price.price) ? goldTolaUnit.price.price : null;
  let silverNprPerTola =
    silverTolaUnit?.price && isPositive(silverTolaUnit.price.price) ? silverTolaUnit.price.price : null;
  const goldNprPer10Gram =
    gold10Unit?.price && isPositive(gold10Unit.price.price) ? gold10Unit.price.price : null;
  const silverNprPer10Gram =
    silver10Unit?.price && isPositive(silver10Unit.price.price) ? silver10Unit.price.price : null;

  const publishedDate =
    (typeof goldTolaUnit?.price?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(goldTolaUnit.price.date)
      ? goldTolaUnit.price.date
      : null) ??
    (typeof segment?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(segment.date) ? segment.date : null);

  // HTML card fallback (Hallmark + Silver per tola only).
  if (goldNprPerTola == null || silverNprPerTola == null) {
    const goldCard = html.match(
      /Gold\s*\(\s*Hallmark\s*\)[\s\S]{0,400}?Rs(?:<!--\s*-->)?\s*(?:<!--\s*-->)?\s*([\d,]+)/i,
    );
    const silverCard = html.match(
      />\s*Silver\s*<[\s\S]{0,400}?Rs(?:<!--\s*-->)?\s*(?:<!--\s*-->)?\s*([\d,]+)/i,
    );
    if (goldNprPerTola == null && goldCard?.[1]) goldNprPerTola = parseNprAmount(goldCard[1]);
    if (silverNprPerTola == null && silverCard?.[1]) silverNprPerTola = parseNprAmount(silverCard[1]);
  }

  if (goldNprPerTola == null || silverNprPerTola == null) return null;
  // Sanity bounds (NPR per tola).
  if (goldNprPerTola < 50_000 || goldNprPerTola > 2_000_000) return null;
  if (silverNprPerTola < 100 || silverNprPerTola > 100_000) return null;

  if (!publishedDate) {
    // Last resort: do not invent "today".
    return null;
  }

  const goldCh = dailyChangeFromUnit(goldTolaUnit);
  const silverCh = dailyChangeFromUnit(silverTolaUnit);

  // Prefer HTML-visible Increase lines when history is missing.
  if (goldCh.changeNpr == null) {
    const m = html.match(/Gold\s*\(\s*Hallmark\s*\)[\s\S]{0,500}?Increase[\s\S]{0,40}?Rs[\s\S]{0,10}?([\d,]+)/i);
    if (m?.[1]) {
      const n = parseNprAmount(m[1]);
      if (n != null) {
        goldCh.changeNpr = n;
        goldCh.changePct = (n / (goldNprPerTola - n)) * 100;
      }
    }
  }
  if (silverCh.changeNpr == null) {
    const m = html.match(/>\s*Silver\s*<[\s\S]{0,500}?Increase[\s\S]{0,40}?Rs[\s\S]{0,10}?([\d,]+)/i);
    if (m?.[1]) {
      const n = parseNprAmount(m[1]);
      if (n != null) {
        silverCh.changeNpr = n;
        silverCh.changePct = (n / (silverNprPerTola - n)) * 100;
      }
    }
  }

  const { timeLocal, bsLabel } = parsePublishedTimeFromHtml(html);
  const sourceUpdatedMs =
    typeof segment?.updatedMs === "number" && Number.isFinite(segment.updatedMs) ? segment.updatedMs : null;

  return {
    goldNprPerTola,
    silverNprPerTola,
    goldNprPer10Gram,
    silverNprPer10Gram,
    publishedDate,
    publishedTimeLocal: timeLocal,
    publishedBsLabel: bsLabel,
    goldDailyChangeNpr: goldCh.changeNpr,
    silverDailyChangeNpr: silverCh.changeNpr,
    goldDailyChangePct: goldCh.changePct,
    silverDailyChangePct: silverCh.changePct,
    sourceUpdatedMs,
  };
}

/**
 * NPR/g for portfolio marks from published per-tola Hamro Patro rates.
 * Uses the product UI tola constant (11.66 g) so tola-denominated holdings
 * mark to the published tola price exactly (grams = tola × 11.66).
 */
export function nprPerGramFromHamroPatroTola(nprPerTola: number): number {
  return Math.max(nprPerTola, 1e-9) / NEPAL_UI_GRAMS_PER_TOLA;
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": "FIRE-Nepal/1.0 (+https://firenepal.com; hamro-patro-public-gold-page)",
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

/** Fetch + parse Hamro Patro public gold page (primary domestic Nepal rates). */
export async function fetchHamroPatroNepalRates(): Promise<HamroPatroNepalMetalRates | null> {
  for (const url of HAMRO_PATRO_GOLD_URLS) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const parsed = parseHamroPatroNepalRatesFromHtml(html);
    if (parsed) return parsed;
  }
  return null;
}

/** Asia/Kathmandu calendar date `YYYY-MM-DD`. */
export function kathmanduDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Kathmandu local hour 0–23. */
export function kathmanduHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return Number.isFinite(h) ? h % 24 : 0;
}

/**
 * Adaptive server cache TTL for Hamro Patro polls.
 * Prefer ~15 minutes during typical morning publication window (NPT 9–13);
 * slower outside those hours to respect the source.
 */
export function hamroPatroCacheTtlMs(now: Date = new Date()): number {
  const hour = kathmanduHour(now);
  if (hour >= 9 && hour < 13) return 15 * 60 * 1000;
  if (hour >= 13 && hour < 18) return 30 * 60 * 1000;
  return 60 * 60 * 1000;
}

export type NepalMarketFreshness =
  | "updated_today"
  | "last_published"
  | "stale"
  | "updating"
  | "unavailable";

export function resolveNepalMarketFreshness(opts: {
  publishedDate: string | null | undefined;
  degraded?: boolean;
  loading?: boolean;
  hasPrice: boolean;
  now?: Date;
}): NepalMarketFreshness {
  if (opts.loading) return "updating";
  if (!opts.hasPrice) return "unavailable";
  if (opts.degraded) return "stale";
  if (!opts.publishedDate) return "last_published";
  const today = kathmanduDateKey(opts.now ?? new Date());
  if (opts.publishedDate === today) return "updated_today";
  return "last_published";
}
