import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { loadCompanyOhlc } from "@/services/market/nepse-company-ohlc";

type Params = { params: Promise<{ symbol: string }> };

/** Public EOD OHLC history for Company Details technical analysis. */
export async function GET(request: NextRequest, { params }: Params) {
  const blocked = guardPublicApi(request, { keyPrefix: "nepse-ohlc", max: 30, botMax: 6 });
  if (blocked) return blocked;

  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit")) || 260;
  const limit = Math.min(Math.max(limitRaw, 30), 400);

  try {
    const payload = await loadCompanyOhlc(symbol, limit);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=120, s-maxage=600, stale-while-revalidate=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OHLC";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
