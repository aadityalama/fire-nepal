import { NextResponse } from "next/server";
import { loadPortfolioMarketContext } from "@/services/market/nepse-portfolio-market-context";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const revalidate = 120;

/**
 * Batch EOD / profile / dividend / index context for institutional portfolio analytics.
 * POST body: { symbols: string[] }
 */
async function POSTHandler(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const symbols = Array.isArray((body as { symbols?: unknown })?.symbols)
    ? ((body as { symbols: unknown[] }).symbols as unknown[])
        .map((s) => String(s ?? "").trim().toUpperCase())
        .filter(Boolean)
    : [];

  if (!symbols.length) {
    return NextResponse.json({ ok: false, error: "symbols required" }, { status: 400 });
  }

  const context = await loadPortfolioMarketContext(symbols);
  return NextResponse.json({ ok: true, context }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}

export const POST = withApiRouteTiming("market/nepse/portfolio-analytics-context:POST", POSTHandler);
