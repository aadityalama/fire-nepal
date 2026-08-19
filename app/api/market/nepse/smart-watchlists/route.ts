import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { buildSmartWatchlistBuckets } from "@/services/market/nepse-screener-engine";

/** Smart watchlist buckets derived from real filings + live quotes. Hub-only. */
export async function GET() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
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
