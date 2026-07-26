import { NextResponse } from "next/server";
import { runAdvancedScreener, type ScreenerFilters } from "@/services/market/nepse-screener-engine";

function numParam(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Advanced stock screener with fundamental + optional technical filters. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters: ScreenerFilters = {
      sector: url.searchParams.get("sector") ?? undefined,
      minMarketCap: numParam(url.searchParams.get("minMarketCap")),
      maxMarketCap: numParam(url.searchParams.get("maxMarketCap")),
      minPe: numParam(url.searchParams.get("minPe")),
      maxPe: numParam(url.searchParams.get("maxPe")),
      minPb: numParam(url.searchParams.get("minPb")),
      maxPb: numParam(url.searchParams.get("maxPb")),
      minEps: numParam(url.searchParams.get("minEps")),
      maxEps: numParam(url.searchParams.get("maxEps")),
      minRoe: numParam(url.searchParams.get("minRoe")),
      maxRoe: numParam(url.searchParams.get("maxRoe")),
      minDivYield: numParam(url.searchParams.get("minDivYield")),
      maxDivYield: numParam(url.searchParams.get("maxDivYield")),
      minRsi: numParam(url.searchParams.get("minRsi")),
      maxRsi: numParam(url.searchParams.get("maxRsi")),
      macdSignal: (url.searchParams.get("macdSignal") as ScreenerFilters["macdSignal"]) ?? "any",
      maTrend: (url.searchParams.get("maTrend") as ScreenerFilters["maTrend"]) ?? "any",
      minChangePct: numParam(url.searchParams.get("minChangePct")),
      maxChangePct: numParam(url.searchParams.get("maxChangePct")),
      minVolume: numParam(url.searchParams.get("minVolume")),
      maxVolume: numParam(url.searchParams.get("maxVolume")),
      includeTechnicals: url.searchParams.get("technicals") === "1",
      limit: numParam(url.searchParams.get("limit")) ?? 100,
    };
    const payload = await runAdvancedScreener(filters);
    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Screener failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
