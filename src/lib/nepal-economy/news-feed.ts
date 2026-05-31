import { OFFICIAL_NEWS } from "@/lib/nepal-economy/official-baseline";
import type { NepalEconomyNewsItem } from "@/types/nepal-economy";

const RSS_URL =
  "https://news.google.com/rss/search?q=Nepal+economy+OR+NRB+OR+NEPSE+OR+remittance+Nepal&hl=en-NP&gl=NP&ceid=NP:en";

const TAG_RULES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /nepse|stock|equity|share/i, tag: "NEPSE" },
  { pattern: /remittance|migrant|foreign employment/i, tag: "Remittance" },
  { pattern: /nrb|policy|monetary|central bank|government/i, tag: "Government Policy" },
  { pattern: /bank|deposit|interest|loan|bfi/i, tag: "Banking" },
  { pattern: /economy|gdp|inflation|cpi|fiscal/i, tag: "Economy" },
];

function classifyTag(title: string, source: string) {
  const haystack = `${title} ${source}`;
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(haystack)) return rule.tag;
  }
  return "Economy";
}

function decodeXml(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssItems(xml: string): NepalEconomyNewsItem[] {
  const items: NepalEconomyNewsItem[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemBlocks.slice(0, 12)) {
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const href = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const pubDate = decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? "");
    const source = decodeXml(block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? "Google News");

    if (!title || !href) continue;

    items.push({
      title,
      href,
      source,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      tag: classifyTag(title, source),
    });
  }

  return items;
}

export async function fetchEconomicNews(): Promise<{ items: NepalEconomyNewsItem[]; mode: "live" | "official" }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const response = await fetch(RSS_URL, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseRssItems(xml);
    if (items.length === 0) throw new Error("RSS returned no items");
    return { items, mode: "live" };
  } catch {
    return {
      items: OFFICIAL_NEWS.map((item) => ({ ...item })),
      mode: "official",
    };
  } finally {
    clearTimeout(timeout);
  }
}
