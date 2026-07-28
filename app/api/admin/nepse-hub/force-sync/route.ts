import { NextResponse } from "next/server";
import { requireNepseHubAdminApi } from "@/lib/admin/nepse-hub-admin";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import {
  forceSyncOfficialNepseMarket,
  getLatestOfficialSyncInfo,
} from "@/services/market/nepse-official-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;
  const sb = createMarketDataServiceClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  }
  const info = await getLatestOfficialSyncInfo(sb);
  return NextResponse.json({
    latestSnapshot: info.latestSnapshot
      ? {
          syncedAt: info.latestSnapshot.synced_at,
          tradeDate: info.latestSnapshot.trade_date,
          indexName: info.latestSnapshot.index_name,
          indexValue: info.latestSnapshot.index_value,
          indexChangeNpr: info.latestSnapshot.index_change_npr,
          indexChangePct: info.latestSnapshot.index_change_pct,
          totalTurnoverNpr: info.latestSnapshot.total_turnover_npr,
          totalVolume: info.latestSnapshot.total_volume,
          totalTrades: info.latestSnapshot.total_trades,
          advancing: info.latestSnapshot.advancing,
          declining: info.latestSnapshot.declining,
          unchanged: info.latestSnapshot.unchanged,
          upperCircuit: info.latestSnapshot.upper_circuit,
          lowerCircuit: info.latestSnapshot.lower_circuit,
          isMarketOpen: info.latestSnapshot.is_market_open,
        }
      : null,
    latestRun: info.latestRun,
    source: "https://www.nepalstock.com.np",
    admin: gate.email,
  });
}

export async function POST() {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;

  const result = await forceSyncOfficialNepseMarket();
  return NextResponse.json(
    {
      ok: result.ok,
      result,
      source: "https://www.nepalstock.com.np",
      requestedBy: gate.email,
    },
    { status: result.ok ? 200 : 502 },
  );
}
