import { NextResponse } from "next/server";
import {
  backfillEodHistory,
  createMarketDataServiceClient,
  ingestCompanyFundamentals,
  ingestEodPrices,
  ingestMarketNews,
} from "@/services/market/nepse-market-data-engine";

/**
 * Vercel Cron (after NEPSE close):
 * 1) Snapshot today's validated live quotes into `nepse_eod_prices`
 * 2) Backfill multi-day OHLC for symbols still short on history
 * 3) Aggregate configured news feeds into `nepse_market_news`
 *
 * Manual: GET /api/cron/nepse-market-data?backfill=1&limit=80&priority=NABIL,NICA
 * When `CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`.
 */
export const maxDuration = 300;

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

  const url = new URL(request.url);
  const wantBackfill = url.searchParams.get("backfill") !== "0";
  const symbolLimit = Number(url.searchParams.get("limit")) || 80;
  const priority = (url.searchParams.get("priority") ?? "NABIL,NICA,HDL,UPPER,SHIVM")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const eod = await ingestEodPrices(sb);
  const backfill = wantBackfill
    ? await backfillEodHistory(sb, { symbolLimit, prioritize: priority, minBars: 60 })
    : { kind: "eod_backfill" as const, status: "ok" as const, items: 0, message: "Skipped (backfill=0)" };
  const fundamentals =
    url.searchParams.get("fundamentals") !== "0"
      ? await ingestCompanyFundamentals(sb)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (fundamentals=0)" };
  const news = await ingestMarketNews(sb);

  const ok =
    eod.status !== "error" && news.status !== "error" && backfill.status !== "error" && fundamentals.status !== "error";
  return NextResponse.json({ ok, eod, backfill, fundamentals, news }, { status: ok ? 200 : 500 });
}
