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
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 40);

  const [newsResult, actionsResult] = await Promise.all([
    sb
      .from("nepse_market_news")
      .select("id, headline, source_name, source_url, published_at, category, sentiment, summary, is_corporate_action")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    sb
      .from("nepse_market_news")
      .select("id, headline, source_name, source_url, published_at, category, sentiment, summary, is_corporate_action")
      .eq("is_corporate_action", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

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

  return NextResponse.json(
    {
      items: (newsResult.data ?? []).map(toItem),
      corporateActions: (actionsResult.data ?? []).map(toItem),
    },
    { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=600" } },
  );
}
