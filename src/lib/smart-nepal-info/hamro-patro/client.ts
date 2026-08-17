import type { LocalizedLabel } from "../types";

/** Official Hamro Patro origin — public site + documented embed widgets. */
export const HAMRO_PATRO_ORIGIN = "https://www.hamropatro.com";

/**
 * Documented third-party integration surface (iframe embeds).
 * robots.txt disallows crawling `/widgets/`; embed usage remains the permitted UI integration.
 * @see https://www.hamropatro.com/widgets/
 */
export const HAMRO_PATRO_WIDGETS_PAGE = `${HAMRO_PATRO_ORIGIN}/widgets/`;

/** Stable public date page (schema.org Event JSON-LD). Allowed by robots.txt. */
export function buildHamroPatroDateUrl(
  bsYear: number,
  bsMonth: number,
  bsDay: number,
  locale: "en" | "np" = "en",
): string {
  const path =
    locale === "en"
      ? `/en/date/${bsYear}-${bsMonth}-${bsDay}`
      : `/date/${bsYear}-${bsMonth}-${bsDay}`;
  return `${HAMRO_PATRO_ORIGIN}${path}`;
}

export type HamroPatroSchemaEvent = {
  name: string;
  startDate?: string;
  endDate?: string;
};

export type HamroPatroDayFestival = {
  festival: LocalizedLabel;
  /** Nepal-local AD date from schema.org Event, when present. */
  startDate: string | null;
  sourceUrl: string;
  publicHoliday: boolean;
};

type JsonLdNode = Record<string, unknown>;

function asNodes(value: unknown): JsonLdNode[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is JsonLdNode => !!item && typeof item === "object");
  }
  if (typeof value === "object") {
    return [value as JsonLdNode];
  }
  return [];
}

function typeIncludesEvent(node: JsonLdNode): boolean {
  const type = node["@type"];
  if (type === "Event") {
    return true;
  }
  if (Array.isArray(type)) {
    return type.includes("Event");
  }
  return false;
}

/** Extract schema.org Event records from Hamro Patro public HTML. */
export function parseHamroPatroEventJsonLd(html: string): HamroPatroSchemaEvent[] {
  const events: HamroPatroSchemaEvent[] = [];
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const roots = asNodes(parsed);
      for (const root of roots) {
        const candidates = root["@graph"] ? asNodes(root["@graph"]) : [root];
        for (const node of candidates) {
          if (!typeIncludesEvent(node)) {
            continue;
          }
          const name = typeof node.name === "string" ? node.name.trim() : "";
          if (!name) {
            continue;
          }
          events.push({
            name,
            startDate: typeof node.startDate === "string" ? node.startDate : undefined,
            endDate: typeof node.endDate === "string" ? node.endDate : undefined,
          });
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return events;
}

/**
 * Hamro Patro titles are typically: `{en} | {np} | {bs date} — … | Hamro Patro`
 */
export function parseHamroPatroTitleLabels(html: string): LocalizedLabel | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch?.[1]) {
    return null;
  }

  const title = titleMatch[1].replace(/\s+/g, " ").trim();
  const parts = title.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const en = parts[0];
  const np = parts[1];
  if (!en || !np) {
    return null;
  }

  return { en, np };
}

export function parseHamroPatroIsHoliday(html: string): boolean | null {
  const match = html.match(/"isHoliday"\s*:\s*(true|false)/);
  if (!match) {
    return null;
  }
  return match[1] === "true";
}

export function buildFestivalLabelFromHamroPatroPages(params: {
  enHtml: string;
  npHtml?: string | null;
}): { festival: LocalizedLabel; startDate: string | null; publicHoliday: boolean } | null {
  const enEvents = parseHamroPatroEventJsonLd(params.enHtml);
  const primary = enEvents[0];
  if (!primary?.name) {
    return null;
  }

  const titleLabels =
    parseHamroPatroTitleLabels(params.enHtml) ??
    (params.npHtml ? parseHamroPatroTitleLabels(params.npHtml) : null);
  const npEvents = params.npHtml ? parseHamroPatroEventJsonLd(params.npHtml) : [];
  const npEventName = npEvents[0]?.name;
  // Prefer Devanagari labels: some Hamro Patro NP pages still emit Latin Event names.
  const npFromEvent =
    npEventName && /[\u0900-\u097F]/.test(npEventName) ? npEventName : null;

  const festival: LocalizedLabel = {
    en: primary.name,
    np: npFromEvent || titleLabels?.np || primary.name,
  };

  const holidayFlag =
    parseHamroPatroIsHoliday(params.enHtml) ??
    (params.npHtml ? parseHamroPatroIsHoliday(params.npHtml) : null);

  return {
    festival,
    startDate: primary.startDate ?? null,
    publicHoliday: holidayFlag === true,
  };
}

export type HamroPatroFetch = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "FIRE-Nepal/1.0 (+https://firenepal.com; hamro-patro-schema.org-jsonld)",
};

/**
 * Load today's (or a BS day's) festival from Hamro Patro public date pages.
 * Uses schema.org Event JSON-LD on `/en/date/{y}-{m}-{d}` and `/date/{y}-{m}-{d}`.
 * Does not call undocumented private APIs or `/widgets/` (robots Disallow).
 */
export async function fetchHamroPatroDayFestival(
  bsYear: number,
  bsMonth: number,
  bsDay: number,
  fetchImpl: HamroPatroFetch = fetch,
): Promise<HamroPatroDayFestival | null> {
  const enUrl = buildHamroPatroDateUrl(bsYear, bsMonth, bsDay, "en");
  const npUrl = buildHamroPatroDateUrl(bsYear, bsMonth, bsDay, "np");

  const [enRes, npRes] = await Promise.all([
    fetchImpl(enUrl, { headers: DEFAULT_HEADERS, redirect: "follow" }),
    fetchImpl(npUrl, { headers: DEFAULT_HEADERS, redirect: "follow" }),
  ]);

  if (!enRes.ok) {
    return null;
  }

  const enHtml = await enRes.text();
  const npHtml = npRes.ok ? await npRes.text() : null;
  const parsed = buildFestivalLabelFromHamroPatroPages({ enHtml, npHtml });
  if (!parsed) {
    return null;
  }

  return {
    festival: parsed.festival,
    startDate: parsed.startDate,
    sourceUrl: enUrl,
    publicHoliday: parsed.publicHoliday,
  };
}
