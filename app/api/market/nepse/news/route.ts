import { NextResponse } from "next/server";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";

export type NepseNewsResponseItem = {
  id: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string | null;
  isCorporateAction: boolean;
};

/** Public read of aggregated market headlines (stored metadata only, no article bodies). */
export async function GET(request: Request) {
  const sb = createMarketDataServiceClient();
  if (!sb) {
    return NextResponse.json({ items: [], corporateActions: [] }, { headers: { "cache-control": "public, max-age=60" } });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 80);
  const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();

  const base = sb
    .from("nepse_market_news")
    .select("id, headline, source_name, source_url, published_at, category, sentiment, summary, is_corporate_action");

  // Prefer the ingest tag `[SYMBOL]` so NABIL does not match NABILPNP / NADEP substrings.
  // Fall back to a broad ilike, then post-filter with a word-boundary check.
  const newsQuery = symbol
    ? base
        .or(`headline.ilike.%[${symbol}]%,headline.ilike.%${symbol}%,summary.ilike.%${symbol}%`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(Math.min(limit * 4, 80))
    : base.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);

  const actionsQuery = symbol
    ? sb
        .from("nepse_market_news")
        .select("id, headline, source_name, source_url, published_at, category, sentiment, summary, is_corporate_action")
        .eq("is_corporate_action", true)
        .or(`headline.ilike.%[${symbol}]%,headline.ilike.%${symbol}%,summary.ilike.%${symbol}%`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(48)
    : sb
        .from("nepse_market_news")
        .select("id, headline, source_name, source_url, published_at, category, sentiment, summary, is_corporate_action")
        .eq("is_corporate_action", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);

  const [newsResult, actionsResult] = await Promise.all([newsQuery, actionsQuery]);

  const toItem = (row: Record<string, unknown>): NepseNewsResponseItem => ({
    id: String(row.id),
    headline: String(row.headline),
    sourceName: String(row.source_name),
    sourceUrl: String(row.source_url),
    publishedAt: row.published_at ? String(row.published_at) : null,
    category: String(row.category),
    sentiment: row.sentiment as NepseNewsResponseItem["sentiment"],
    summary: row.summary ? String(row.summary) : null,
    isCorporateAction: Boolean(row.is_corporate_action),
  });

  /** Exact symbol token match — `[NABIL]` yes, `NABILPNP` / `NADEP` no. */
  const mentionsSymbol = (item: NepseNewsResponseItem): boolean => {
    if (!symbol) return true;
    const hay = `${item.headline} ${item.summary ?? ""}`.toUpperCase();
    if (hay.includes(`[${symbol}]`)) return true;
    return new RegExp(`(?:^|[^A-Z0-9])${symbol}(?:[^A-Z0-9]|$)`).test(hay);
  };

  const items = (newsResult.data ?? []).map(toItem).filter(mentionsSymbol).slice(0, limit);
  const corporateActions = (actionsResult.data ?? []).map(toItem).filter(mentionsSymbol).slice(0, symbol ? 12 : 8);

  return NextResponse.json(
    { items, corporateActions },
    { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=600" } },
  );
}
