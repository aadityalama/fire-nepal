import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { loadCompanyFundamentals } from "@/services/market/nepse-company-fundamentals";

type Params = { params: Promise<{ symbol: string }> };

/** Public company fundamentals + session + 52W range for Hub Company Details. */
export async function GET(_request: Request, { params }: Params) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
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
