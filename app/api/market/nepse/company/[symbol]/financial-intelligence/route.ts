import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";

type Params = { params: Promise<{ symbol: string }> };

/**
 * Premium Financial Intelligence — Hub Company Details only.
 * Not used by NEPSE Portfolio / My NEPSE Holdings.
 */
export async function GET(_request: Request, { params }: Params) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
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
