import { NextResponse } from "next/server";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";
import { withApiRouteTiming } from "@/lib/mutation-perf";


type Params = { params: Promise<{ symbol: string }> };

/**
 * Premium Financial Intelligence: quarterly/annual statements, ratios, dividend
 * analytics, shareholding, peer comparison and growth CAGRs — real data only.
 * Provider datasets are memory-cached for 6h; CDN caches the response for 30m.
 */
async function GETHandler(_request: Request, { params }: Params) {
  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const payload = await loadFinancialIntelligence(symbol);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load financial intelligence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withApiRouteTiming<Params>("market/nepse/company/[symbol]/financial-intelligence:GET", GETHandler);
