import { NextResponse } from "next/server";
import {
  createMarketDataServiceClient,
  ingestEodPrices,
  ingestMarketNews,
} from "@/services/market/nepse-market-data-engine";

/**
 * Vercel Cron (after NEPSE close): snapshots validated live quotes into `nepse_eod_prices`
 * and aggregates configured news feeds into `nepse_market_news`. Everything downstream
 * (dashboard, company pages, indicators, statistics) reads from these tables automatically.
 * When `CRON_SECRET` is set, Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 */
export const maxDuration = 120;

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

  const [eod, news] = await Promise.all([ingestEodPrices(sb), ingestMarketNews(sb)]);
  const ok = eod.status !== "error" && news.status !== "error";
  return NextResponse.json({ ok, eod, news }, { status: ok ? 200 : 500 });
}
