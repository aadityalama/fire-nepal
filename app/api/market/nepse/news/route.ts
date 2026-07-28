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

  /** Company pages only accept the ingest tag `[SYMBOL]` (avoids NABIL→NABILPNP and UPPER→Upper Mai). */
  const mentionsSymbol = (item: NepseNewsResponseItem): boolean => {
    if (!symbol) return true;
    const hay = `${item.headline}\n${item.summary ?? ""}`.toUpperCase();
    return hay.includes(`[${symbol}]`) || hay.startsWith(`${symbol} ·`) || hay.startsWith(`${symbol}\n`);
  };

  const itemsRaw = (newsResult.data ?? []).map(toItem).filter(mentionsSymbol).slice(0, limit);
  const corporateActionsRaw = (actionsResult.data ?? []).map(toItem).filter(mentionsSymbol).slice(0, symbol ? 12 : 8);

  // Apply NEPSE Hub Admin news overrides (field edits + CMS-created + hidden rows).
  let items = itemsRaw;
  let corporateActions = corporateActionsRaw;
  if (symbol) {
    try {
      const { indexOverrides, listOverridesForSymbol, mergeCmsRows } = await import(
        "@/services/market/nepse-hub-admin-overrides"
      );
      const overrideIndex = indexOverrides(await listOverridesForSymbol(symbol, sb));
      if (overrideIndex.size) {
        const mergeNews = (rows: NepseNewsResponseItem[]) =>
          mergeCmsRows({
            official: rows as unknown as Array<Record<string, unknown>>,
            overrides: overrideIndex,
            domain: "news",
            recordKeyOf: (row) => String(row.id ?? ""),
            buildCmsRow: (recordKey, payload) =>
              ({
                id: recordKey,
                headline: String(payload.headline ?? "Untitled"),
                sourceName: String(payload.sourceName ?? "CMS"),
                sourceUrl: String(payload.sourceUrl ?? ""),
                publishedAt: (payload.publishedAt as string | null) ?? null,
                category: String(payload.category ?? "general"),
                sentiment: (payload.sentiment as NepseNewsResponseItem["sentiment"]) || "neutral",
                summary: (payload.summary as string | null) ?? (payload.snippet as string | null) ?? null,
                isCorporateAction: Boolean(payload.isCorporateAction),
              }) as unknown as Record<string, unknown>,
          }) as unknown as NepseNewsResponseItem[];

        items = mergeNews(itemsRaw);
        corporateActions = mergeNews(corporateActionsRaw);
      }
    } catch (error) {
      console.error("[nepse-news] override merge failed", error);
    }
  }

  return NextResponse.json(
    { items, corporateActions },
    { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=600" } },
  );
}
