import { NextResponse } from "next/server";
import { buildNepalEconomyDashboard } from "@/lib/nepal-economy/build-dashboard";
import { readDashboardCache } from "@/lib/nepal-economy/storage-cache";
import type { NepalEconomyDashboardData } from "@/types/nepal-economy";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=900",
} as const;

function emptyDashboardPayload(): NepalEconomyDashboardData {
  return {
    fetchedAt: new Date().toISOString(),
    apiStatus: "cached",
    networkStatus: "unreachable",
    cards: [],
    topGainers: [],
    topLosers: [],
    charts: { gdpGrowth: [], fdRates: [] },
    news: [],
    newsMode: "cached",
    engineSource: "empty",
  };
}

export async function GET() {
  try {
    const payload = await buildNepalEconomyDashboard();
    return NextResponse.json(payload, { headers: HEADERS });
  } catch (error) {
    console.error("[nepal-economy] dashboard build failed", error);
    const cached = await readDashboardCache();
    if (cached) {
      return NextResponse.json(
        {
          ...cached,
          apiStatus: "cached" as const,
          networkStatus: "partial" as const,
        },
        { headers: HEADERS },
      );
    }
    return NextResponse.json(emptyDashboardPayload(), { headers: HEADERS });
  }
}
