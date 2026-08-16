import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";

type Params = { params: Promise<{ symbol: string }> };

/**
 * Premium Financial Intelligence: quarterly/annual statements, ratios, dividend
 * analytics, shareholding, peer comparison and growth CAGRs — real data only.
 * Provider datasets are memory-cached for 6h; CDN caches the response for 30m.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const blocked = guardPublicApi(request, { keyPrefix: "nepse-fin-intel", max: 30, botMax: 6 });
  if (blocked) return blocked;

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
