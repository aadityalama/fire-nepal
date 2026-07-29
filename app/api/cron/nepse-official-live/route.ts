import { NextResponse } from "next/server";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { ingestOfficialLiveMarket } from "@/services/market/nepse-official-sync";

/**
 * Post-close official NEPSE closing snapshot (once per trading day).
 * Schedule: 15:30 Asia/Kathmandu (09:45 UTC), Sunday–Thursday — Vercel Hobby compatible.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = createMarketDataServiceClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing" },
      { status: 503 },
    );
  }

  const live = await ingestOfficialLiveMarket(sb);
  return NextResponse.json({ ok: live.status !== "error", live }, { status: live.status === "error" ? 502 : 200 });
}
