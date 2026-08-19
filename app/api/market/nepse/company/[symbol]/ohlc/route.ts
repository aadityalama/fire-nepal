import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { loadCompanyOhlc } from "@/services/market/nepse-company-ohlc";

type Params = { params: Promise<{ symbol: string }> };

/** Public EOD OHLC history for Hub Company Details technical analysis. */
export async function GET(request: Request, { params }: Params) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
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
