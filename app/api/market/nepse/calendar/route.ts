import { NextResponse } from "next/server";
import { loadMarketCalendar } from "@/services/market/nepse-market-calendar";

/** Market calendar: AGM, book close, dividend, bonus, rights, IPO, filings. */
export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit")) || 120;
    const payload = await loadMarketCalendar(Math.min(Math.max(limit, 1), 250));
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
