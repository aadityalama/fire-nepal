import { NextResponse } from "next/server";
import { loadCompanyOhlc } from "@/services/market/nepse-company-ohlc";
import { withApiRouteTiming } from "@/lib/mutation-perf";


type Params = { params: Promise<{ symbol: string }> };

/** Public EOD OHLC history for Company Details technical analysis. */
async function GETHandler(request: Request, { params }: Params) {
  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 400;

  try {
    const payload = await loadCompanyOhlc(symbol, limit);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=120, stale-while-revalidate=600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load OHLC";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withApiRouteTiming<Params>("market/nepse/company/[symbol]/ohlc:GET", GETHandler);
