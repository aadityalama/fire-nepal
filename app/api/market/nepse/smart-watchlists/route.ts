import { NextResponse } from "next/server";
import { buildSmartWatchlistBuckets } from "@/services/market/nepse-screener-engine";
import { withApiRouteTiming } from "@/lib/mutation-perf";


/** Smart watchlist buckets derived from real filings + live quotes. */
async function GETHandler() {
  try {
    const buckets = await buildSmartWatchlistBuckets();
    return NextResponse.json(
      { buckets, loadedAt: new Date().toISOString() },
      { headers: { "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Smart watchlists failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withApiRouteTiming("market/nepse/smart-watchlists:GET", GETHandler);
