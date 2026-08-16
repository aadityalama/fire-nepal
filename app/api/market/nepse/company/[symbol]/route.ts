import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { loadCompanyFundamentals } from "@/services/market/nepse-company-fundamentals";

type Params = { params: Promise<{ symbol: string }> };

/** Public company fundamentals + session + 52W range for Company Details. */
export async function GET(request: NextRequest, { params }: Params) {
  const blocked = guardPublicApi(request, { keyPrefix: "nepse-company", max: 40, botMax: 8 });
  if (blocked) return blocked;

  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const payload = await loadCompanyFundamentals(symbol);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fundamentals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
