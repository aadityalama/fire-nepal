import { NextResponse } from "next/server";
import {
  backfillEodHistory,
  createMarketDataServiceClient,
  ingestCompanyActions,
  ingestCompanyDisclosures,
  ingestCompanyFundamentals,
  ingestCompanyOwnership,
  ingestEodPrices,
  ingestMarketNews,
} from "@/services/market/nepse-market-data-engine";
import { ingestIndexEod } from "@/services/market/nepse-index-eod";

/**
 * Vercel Cron (after NEPSE close):
 * 1) Snapshot today's validated live quotes into `nepse_eod_prices`
 * 2) Snapshot NEPSE / Sensitive / sector index closes into `nepse_index_eod`
 * 3) Backfill multi-day OHLC for symbols still short on history
 * 4) Aggregate configured news feeds + company disclosures + exchange notices into `nepse_market_news`
 * 5) Refresh fundamentals from filings
 * 6) Build typed corporate actions into `nepse_company_actions`
 * 7) Refresh official NEPSE promoter/public ownership into `nepse_company_profiles`
 *
 * Manual: GET /api/cron/nepse-market-data?backfill=1&limit=80&priority=NABIL,VLBS,UPPER
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
  const priority = (url.searchParams.get("priority") ?? "NABIL,VLBS,UPPER,NICA,HDL,SHIVM")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const eod = await ingestEodPrices(sb);
  const indexEod =
    url.searchParams.get("indices") !== "0"
      ? await ingestIndexEod(sb)
      : { kind: "eod" as const, status: "ok" as const, items: 0, message: "Skipped (indices=0)" };
  const backfill = wantBackfill
    ? await backfillEodHistory(sb, { symbolLimit, prioritize: priority, minBars: 60 })
    : { kind: "eod_backfill" as const, status: "ok" as const, items: 0, message: "Skipped (backfill=0)" };
  const fundamentals =
    url.searchParams.get("fundamentals") !== "0"
      ? await ingestCompanyFundamentals(sb)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (fundamentals=0)" };
  const news = await ingestMarketNews(sb);
  const disclosures =
    url.searchParams.get("disclosures") !== "0"
      ? await ingestCompanyDisclosures(sb)
      : { kind: "news" as const, status: "ok" as const, items: 0, message: "Skipped (disclosures=0)" };
  const actions =
    url.searchParams.get("actions") !== "0"
      ? await ingestCompanyActions(sb)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (actions=0)" };
  const ownership =
    url.searchParams.get("ownership") !== "0"
      ? await ingestCompanyOwnership(sb)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (ownership=0)" };

  const ok =
    eod.status !== "error" &&
    indexEod.status !== "error" &&
    news.status !== "error" &&
    disclosures.status !== "error" &&
    actions.status !== "error" &&
    ownership.status !== "error" &&
    backfill.status !== "error" &&
    fundamentals.status !== "error";
  return NextResponse.json(
    { ok, eod, indexEod, backfill, fundamentals, news, disclosures, actions, ownership },
    { status: ok ? 200 : 500 },
  );
}
