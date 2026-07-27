import { NextResponse } from "next/server";
import { getIndexComposition, listMarketIndexOptions } from "@/services/market/nepse-index-composition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Official NEPSE market-index composition for the company explorer filter.
 * Query: ?index=SENSITIVE (default ALL_LISTED)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const indexKey = (url.searchParams.get("index") ?? "ALL_LISTED").trim().toUpperCase();
  const [composition, options] = await Promise.all([getIndexComposition(indexKey), listMarketIndexOptions()]);
  return NextResponse.json(
    { ...composition, options },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
