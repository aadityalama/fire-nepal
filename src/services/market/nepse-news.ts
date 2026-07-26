/**
 * NEPSE news aggregation: fetches configured RSS/Atom feeds, keeps headline + metadata +
 * source link only (never article bodies), then categorizes and scores sentiment locally.
 *
 * Feeds are configured via the `NEPSE_NEWS_FEEDS` env var as comma-separated
 * `Source Name|https://feed-url` pairs so no unverified endpoint is hardcoded.
 */

export type AggregatedNewsItem = {
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string | null;
  isCorporateAction: boolean;
};

export type NewsFeedConfig = { name: string; url: string };

export function parseNewsFeedConfig(raw: string | undefined): NewsFeedConfig[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((entry) => {
      const [name, url] = entry.split("|").map((part) => part.trim());
      if (!name || !url || !/^https?:\/\//.test(url)) return null;
      return { name, url };
    })
    .filter((feed): feed is NewsFeedConfig => feed != null);
}

const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ["IPO", /\b(ipo|allotment|book building|right share|rights? issue|fpo)\b/i],
  ["Banking", /\b(bank|banking|nrb|interest rate|deposit|lending)\b/i],
  ["Hydropower", /\b(hydro|hydropower|megawatt|mw project|electricity|nea)\b/i],
  ["Insurance", /\b(insurance|insurer|beema|reinsurance)\b/i],
  ["Finance", /\b(finance company|microfinance|laghubitta|leasing)\b/i],
  ["Manufacturing", /\b(cement|manufacturing|industry|factory|production)\b/i],
  ["Hotels", /\b(hotel|tourism|resort)\b/i],
];

export function categorizeHeadline(headline: string): string {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(headline)) return category;
  }
  return "Economy";
}

const POSITIVE_WORDS = /\b(profit|gain|surge|rise|rises|rose|up|record|growth|bonus|dividend|approved|jumps?|high|bullish|expands?)\b/i;
const NEGATIVE_WORDS = /\b(loss|losses|fall|falls|fell|drop|drops|decline|down|plunge|penalt|fine|scam|fraud|suspend|bearish|weak|crash)\b/i;

export function scoreSentiment(text: string): "positive" | "neutral" | "negative" {
  const positive = POSITIVE_WORDS.test(text);
  const negative = NEGATIVE_WORDS.test(text);
  if (positive && !negative) return "positive";
  if (negative && !positive) return "negative";
  return "neutral";
}

const CORPORATE_ACTION_PATTERN =
  /\b(dividend|bonus share|right share|rights? issue|book closure|agm|sgm|ipo|allotment|merger|acquisition|listing)\b/i;

export function isCorporateActionHeadline(headline: string): boolean {
  return CORPORATE_ACTION_PATTERN.test(headline);
}

/**
 * Maps a disclosure / notice headline to a structured corporate-action type used by the
 * `nepse_company_actions` timeline. Returns null when the text is not a typed action
 * (e.g. resignations, clarifications, general board news) so we never fabricate a type.
 * Ordered most-specific → least-specific: mergers & rights before generic book-closure.
 */
export function classifyCorporateAction(
  text: string,
):
  | "rights"
  | "bonus"
  | "dividend"
  | "agm"
  | "book_close"
  | "fpo"
  | "ipo"
  | "merger"
  | null {
  const t = text.toLowerCase();
  if (/\b(merger|amalgamat|acquisit|acquire)\b/.test(t)) return "merger";
  if (/\b(right share|rights? issue|right shares)\b/.test(t)) return "rights";
  if (/\bfpo\b|further public offer/.test(t)) return "fpo";
  if (/\bipo\b|initial public offer|allotment/.test(t)) return "ipo";
  if (/bonus share|bonus dividend/.test(t)) return "bonus";
  if (/dividend/.test(t)) return "dividend";
  if (/\bagm\b|\bsgm\b|annual general meeting|special general meeting/.test(t)) return "agm";
  if (/book clos|book-clos/.test(t)) return "book_close";
  if (/listing|listed .*shares?|commence.*trading/.test(t)) return "ipo";
  return null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(block: string, tags: string[]): string | null {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (match?.[1]) {
      const text = stripHtml(match[1]);
      if (text) return text;
    }
  }
  return null;
}

function extractLink(block: string): string | null {
  // Atom: <link href="..."/> — RSS: <link>...</link>
  const atom = block.match(/<link[^>]*href="([^"]+)"/i);
  if (atom?.[1]) return atom[1].trim();
  const rss = firstMatch(block, ["link"]);
  return rss && /^https?:\/\//.test(rss) ? rss : null;
}

/** One-sentence summary derived from the feed's own description snippet (max ~220 chars). */
function summarize(description: string | null): string | null {
  if (!description) return null;
  const sentence = description.split(/(?<=[.!?])\s+/)[0] ?? description;
  const clipped = sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
  return clipped || null;
}

/** Parses RSS 2.0 `<item>` and Atom `<entry>` blocks without extra dependencies. */
export function parseFeedXml(xml: string, sourceName: string, limit = 20): AggregatedNewsItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>]([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  const items: AggregatedNewsItem[] = [];
  for (const block of blocks.slice(0, limit)) {
    const headline = firstMatch(block, ["title"]);
    const link = extractLink(block);
    if (!headline || !link) continue;
    const publishedRaw = firstMatch(block, ["pubDate", "published", "updated", "dc:date"]);
    const publishedAt = publishedRaw && !Number.isNaN(Date.parse(publishedRaw)) ? new Date(publishedRaw).toISOString() : null;
    const description = firstMatch(block, ["description", "summary", "content"]);
    const sentimentBasis = `${headline} ${description ?? ""}`;
    items.push({
      headline,
      sourceName,
      sourceUrl: link,
      publishedAt,
      category: categorizeHeadline(sentimentBasis),
      sentiment: scoreSentiment(sentimentBasis),
      summary: summarize(description),
      isCorporateAction: isCorporateActionHeadline(sentimentBasis),
    });
  }
  return items;
}

/** Fetches and parses every configured feed; failures are isolated per feed. */
export async function fetchConfiguredNews(
  feeds: NewsFeedConfig[],
): Promise<{ items: AggregatedNewsItem[]; failures: string[] }> {
  const failures: string[] = [];
  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          headers: { "user-agent": "FIRENepal-NewsBot/1.0 (+https://firenepal.com)" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseFeedXml(await response.text(), feed.name);
      } catch (error) {
        failures.push(`${feed.name}: ${error instanceof Error ? error.message : "fetch failed"}`);
        return [];
      }
    }),
  );

  // Deduplicate across sources by URL and normalized headline.
  const seenUrls = new Set<string>();
  const seenHeadlines = new Set<string>();
  const items: AggregatedNewsItem[] = [];
  for (const item of results.flat()) {
    const headlineKey = item.headline.toLowerCase().replace(/\s+/g, " ");
    if (seenUrls.has(item.sourceUrl) || seenHeadlines.has(headlineKey)) continue;
    seenUrls.add(item.sourceUrl);
    seenHeadlines.add(headlineKey);
    items.push(item);
  }
  items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return { items, failures };
}
