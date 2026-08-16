import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { loadAiCompanyIntelligence } from "@/services/market/nepse-ai-intelligence";

type Params = { params: Promise<{ symbol: string }> };

/**
 * Deterministic AI Company Intelligence for Company Details.
 * Scores, fair value, risk, growth narrative, recommendation and checklist
 * from real filings + EOD technicals only — no LLM, no fabricated projections.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const blocked = guardPublicApi(request, { keyPrefix: "nepse-ai-intel", max: 30, botMax: 6 });
  if (blocked) return blocked;

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
