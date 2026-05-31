import { NextResponse } from "next/server";
import { buildNepalEconomyDashboard } from "@/lib/nepal-economy/build-dashboard";
import {
  OFFICIAL_FD_RATES,
  OFFICIAL_INFLATION,
  OFFICIAL_NEWS,
  OFFICIAL_NEPSE_MOVERS,
  OFFICIAL_POLICY_RATE,
  OFFICIAL_REMITTANCE,
} from "@/lib/nepal-economy/official-baseline";
import { readDashboardCache } from "@/lib/nepal-economy/storage-cache";
import type { NepalEconomyCard, NepalEconomyDashboardData } from "@/types/nepal-economy";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

function officialFallbackCards(): NepalEconomyCard[] {
  const mk = (
    id: NepalEconomyCard["id"],
    label: string,
    metric: typeof OFFICIAL_INFLATION,
  ): NepalEconomyCard => ({
    id,
    label,
    value: metric.displayValue,
    detail: metric.detail,
    change: metric.change ?? null,
    tone: metric.tone,
    source: metric.source,
    sourceUrl: metric.sourceUrl,
    updatedAt: metric.updatedAt,
    dataMode: "official",
  });

  return [
    mk("inflation", "Nepal Inflation Rate", OFFICIAL_INFLATION),
    {
      id: "gdp",
      label: "GDP Growth",
      value: "3.67%",
      detail: "Annual GDP growth, 2024 (World Bank)",
      change: "Up",
      tone: "up",
      source: "World Bank Open Data",
      sourceUrl: "https://api.worldbank.org/v2/country/NPL/indicator/NY.GDP.MKTP.KD.ZG?format=json",
      updatedAt: "2024-12-31",
      dataMode: "official",
    },
    mk("policyRate", "NRB Policy Rate", OFFICIAL_POLICY_RATE),
    mk("fdRates", "Commercial Bank FD Rates", OFFICIAL_FD_RATES),
    {
      id: "usdNpr",
      label: "USD/NPR Exchange Rate",
      value: "रु 154.92",
      detail: "NRB forex reference",
      change: null,
      tone: "neutral",
      source: "Nepal Rastra Bank",
      sourceUrl: "https://www.nrb.org.np/api/forex/v1/rates",
      updatedAt: "2025-08-31",
      dataMode: "official",
    },
    {
      id: "krwNpr",
      label: "KRW/NPR Exchange Rate",
      value: "रु 0.1029",
      detail: "NRB forex reference",
      change: null,
      tone: "neutral",
      source: "Nepal Rastra Bank",
      sourceUrl: "https://www.nrb.org.np/api/forex/v1/rates",
      updatedAt: "2025-08-31",
      dataMode: "official",
    },
    {
      id: "gold",
      label: "Gold Price",
      value: "रु 311,100",
      detail: "Fine gold price per tola",
      change: null,
      tone: "neutral",
      source: "FENEGOSIDA",
      sourceUrl: "https://www.fenegosida.org/",
      updatedAt: "2025-08-31",
      dataMode: "official",
    },
    {
      id: "silver",
      label: "Silver Price",
      value: "रु 5,345",
      detail: "Silver price per tola",
      change: null,
      tone: "neutral",
      source: "FENEGOSIDA",
      sourceUrl: "https://www.fenegosida.org/",
      updatedAt: "2025-08-31",
      dataMode: "official",
    },
    mk("remittance", "Remittance Statistics", OFFICIAL_REMITTANCE),
    {
      id: "nepse",
      label: "NEPSE Index",
      value: "2,777.11",
      detail: "Latest NEPSE index reference",
      change: "+0.17%",
      tone: "up",
      source: "Yonepse public NEPSE mirror",
      sourceUrl: "https://shubhamnpk.github.io/yonepse/",
      updatedAt: "2025-08-31",
      dataMode: "official",
    },
  ];
}

function minimalOfficialPayload(): NepalEconomyDashboardData {
  return {
    fetchedAt: new Date().toISOString(),
    apiStatus: "cached",
    networkStatus: "partial",
    cards: officialFallbackCards(),
    topGainers: OFFICIAL_NEPSE_MOVERS.gainers,
    topLosers: OFFICIAL_NEPSE_MOVERS.losers,
    charts: {
      gdpGrowth: [
        { label: "2020", value: -2.4 },
        { label: "2021", value: 4.8 },
        { label: "2022", value: 5.6 },
        { label: "2023", value: 2.0 },
        { label: "2024", value: 3.67 },
      ],
      fdRates: OFFICIAL_FD_RATES.chart,
    },
    news: OFFICIAL_NEWS.map((item) => ({ ...item })),
    newsMode: "official",
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
        { ...cached, apiStatus: "cached" as const, networkStatus: "partial" as const },
        { headers: HEADERS },
      );
    }
    return NextResponse.json(minimalOfficialPayload(), { headers: HEADERS });
  }
}
