import { NextRequest, NextResponse } from "next/server";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { listCompanyMasterMap } from "@/services/market/nepse-company-master";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { filterNepseDirectory } from "@/services/market/nepse-search-filter";
import type { NepseSecurityTick } from "@/types/market";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "private, max-age=12, stale-while-revalidate=24",
} as const;

export async function GET(req: NextRequest) {
  const blocked = guardPublicApi(req, { keyPrefix: "nepse-search", max: 60, botMax: 10 });
  if (blocked) return blocked;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limitRaw) ? Math.min(60, Math.max(1, Math.floor(limitRaw))) : 24;

  const bundle = await getCachedNepseYonepseBundle();
  const sb = createMarketDataServiceClient();
  const masterMap = await listCompanyMasterMap(sb).catch(() => new Map());

  let hits: NepseSecurityTick[];
  if (masterMap.size > 0 && q.trim()) {
    const qu = q.trim().toUpperCase();
    const ql = q.trim().toLowerCase();
    const ordered = [...masterMap.values()].sort((a, b) =>
      a.symbol.localeCompare(b.symbol, "en", { sensitivity: "base" }),
    );
    const rows: NepseSecurityTick[] = [];
    const seen = new Set<string>();
    const push = (symbol: string) => {
      if (rows.length >= limit || seen.has(symbol)) return;
      seen.add(symbol);
      const meta = masterMap.get(symbol);
      if (!meta) return;
      const live = bundle.bySymbol[symbol];
      rows.push({
        symbol,
        companyName: meta.companyName,
        sector: meta.sector ?? undefined,
        ltpNpr: live?.ltpNpr ?? 0,
        changePct: live?.changePct,
        changeNpr: live?.changeNpr,
        volume: live?.volume,
        turnoverNpr: live?.turnoverNpr,
        marketCap: live?.marketCap,
        trades: live?.trades,
        previousCloseNpr: live?.previousCloseNpr,
        openNpr: live?.openNpr,
        highNpr: live?.highNpr,
        lowNpr: live?.lowNpr,
      });
    };

    for (const row of ordered) {
      if (row.symbol.startsWith(qu)) push(row.symbol);
    }
    for (const row of ordered) {
      if ((row.companyName ?? "").toLowerCase().includes(ql)) push(row.symbol);
    }
    for (const row of ordered) {
      if (row.symbol.includes(qu)) push(row.symbol);
    }
    hits = rows;
  } else {
    hits = filterNepseDirectory(bundle.bySymbol, q, limit);
  }

  return NextResponse.json({ hits, fetchedAt: new Date().toISOString() }, { headers: HEADERS });
}
