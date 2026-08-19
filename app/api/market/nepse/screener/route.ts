import { NextResponse } from "next/server";
import {
  NEPSE_HUB_TEMPORARILY_DISABLED,
  nepseHubMaintenanceResponse,
} from "@/lib/market/nepse-hub-maintenance";
import { runAdvancedScreener, type ScreenerFilters } from "@/services/market/nepse-screener-engine";

function numParam(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function boolParam(value: string | null): boolean | undefined {
  if (value == null || value.trim() === "") return undefined;
  return value === "1" || value === "true";
}

/** Advanced stock screener with fundamental + optional technical filters. Hub-only. */
export async function GET(request: Request) {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return nepseHubMaintenanceResponse();
  try {
    const url = new URL(request.url);
    const filters: ScreenerFilters = {
      sector: url.searchParams.get("sector") ?? undefined,
      minPrice: numParam(url.searchParams.get("minPrice")),
      maxPrice: numParam(url.searchParams.get("maxPrice")),
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
      minRoa: numParam(url.searchParams.get("minRoa")),
      maxRoa: numParam(url.searchParams.get("maxRoa")),
      minDivYield: numParam(url.searchParams.get("minDivYield")),
      maxDivYield: numParam(url.searchParams.get("maxDivYield")),
      minRsi: numParam(url.searchParams.get("minRsi")),
      maxRsi: numParam(url.searchParams.get("maxRsi")),
      macdSignal: (url.searchParams.get("macdSignal") as ScreenerFilters["macdSignal"]) ?? "any",
      maTrend: (url.searchParams.get("maTrend") as ScreenerFilters["maTrend"]) ?? "any",
      smaTrend: (url.searchParams.get("smaTrend") as ScreenerFilters["smaTrend"]) ?? "any",
      emaTrend: (url.searchParams.get("emaTrend") as ScreenerFilters["emaTrend"]) ?? "any",
      bollingerPosition: (url.searchParams.get("bollingerPosition") as ScreenerFilters["bollingerPosition"]) ?? "any",
      technicalRating: (url.searchParams.get("technicalRating") as ScreenerFilters["technicalRating"]) ?? "any",
      minAiScore: numParam(url.searchParams.get("minAiScore")),
      maxAiScore: numParam(url.searchParams.get("maxAiScore")),
      minChangePct: numParam(url.searchParams.get("minChangePct")),
      maxChangePct: numParam(url.searchParams.get("maxChangePct")),
      minVolume: numParam(url.searchParams.get("minVolume")),
      maxVolume: numParam(url.searchParams.get("maxVolume")),
      minTurnover: numParam(url.searchParams.get("minTurnover")),
      near52wHigh: boolParam(url.searchParams.get("near52wHigh")),
      near52wLow: boolParam(url.searchParams.get("near52wLow")),
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
