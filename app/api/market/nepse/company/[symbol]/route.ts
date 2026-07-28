import { NextResponse } from "next/server";
import { loadCompanyFundamentals } from "@/services/market/nepse-company-fundamentals";
import { withApiRouteTiming } from "@/lib/mutation-perf";


type Params = { params: Promise<{ symbol: string }> };

/** Public company fundamentals + session + 52W range for Company Details. */
async function GETHandler(_request: Request, { params }: Params) {
  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const payload = await loadCompanyFundamentals(symbol);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fundamentals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withApiRouteTiming<Params>("market/nepse/company/[symbol]:GET", GETHandler);
