import { NextResponse } from "next/server";
import { loadNepseIndexIntraday } from "@/services/market/nepse-index-intraday";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Official NEPSE intraday index graph + recent market-summary history for sparklines.
 */
export async function GET() {
  try {
    const payload = await loadNepseIndexIntraday();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load intraday index";
    return NextResponse.json(
      {
        fetchedAt: new Date().toISOString(),
        indexId: 58,
        points: [],
        open: null,
        high: null,
        low: null,
        last: null,
        summaryHistory: [],
        error: message,
      },
      { status: 502 },
    );
  }
}
