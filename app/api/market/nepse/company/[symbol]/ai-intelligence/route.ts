import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { loadAiCompanyIntelligence } from "@/services/market/nepse-ai-intelligence";

type Params = { params: Promise<{ symbol: string }> };

/**
 * Deterministic AI Company Intelligence for Hub Company Details.
 * Not used by NEPSE Portfolio / My NEPSE Holdings.
 */
export async function GET(_request: Request, { params }: Params) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
  const { symbol } = await params;
  if (!symbol?.trim()) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const payload = await loadAiCompanyIntelligence(symbol);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load AI company intelligence";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
