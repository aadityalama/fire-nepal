import { NextResponse } from "next/server";
import {
  backfillEodHistory,
  createMarketDataServiceClient,
  ingestCompanyActions,
  ingestCompanyDisclosures,
  ingestCompanyFundamentals,
  ingestOfficialCompanyMaster,
  ingestCompanyOwnership,
  ingestCompanyStatements,
  ingestEodPrices,
  ingestMarketNews,
} from "@/services/market/nepse-market-data-engine";
import { ingestIndexEod } from "@/services/market/nepse-index-eod";
import { ingestIndexComposition } from "@/services/market/nepse-index-composition";

/**
 * Vercel Cron (after NEPSE close):
 * 1) Snapshot today's validated live quotes into `nepse_eod_prices`
 * 2) Snapshot NEPSE / Sensitive / Float / sector index closes into `nepse_index_eod`
 * 2b) Refresh official index→company membership into `nepse_index_constituents`
 * 3) Backfill multi-day OHLC for symbols still short on history
 * 4) Aggregate configured news feeds + company disclosures + exchange notices into `nepse_market_news`
 * 5) Refresh fundamentals from filings
 * 6) Incrementally ingest official financial statements (NEPSE reports + text PDFs)
 * 7) Build typed corporate actions into `nepse_company_actions`
 * 8) Refresh official NEPSE promoter/public ownership into `nepse_company_profiles`
 *
 * Manual: GET /api/cron/nepse-market-data?backfill=1&limit=80&priority=NABIL,VLBS,UPPER
 * When `CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`.
 */
export const maxDuration = 300;

function kathmanduSyncMode(now = new Date()): "preopen" | "postclose" | "weekly_validation" {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const minutes = hour * 60 + minute;
  const weeklyWindow = weekday === "Sun" && minutes < 10 * 60 + 30;
  if (weeklyWindow) return "weekly_validation";
  return minutes < 11 * 60 ? "preopen" : "postclose";
}

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

  const masterModeParam = url.searchParams.get("masterMode");
  const masterMode =
    masterModeParam === "manual" || masterModeParam === "preopen" || masterModeParam === "postclose" || masterModeParam === "weekly_validation"
      ? masterModeParam
      : kathmanduSyncMode();

  const companyMaster =
    url.searchParams.get("companyMaster") !== "0"
      ? await ingestOfficialCompanyMaster(sb, masterMode)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (companyMaster=0)" };

  const eod = await ingestEodPrices(sb);
  const indexEod =
    url.searchParams.get("indices") !== "0"
      ? await ingestIndexEod(sb)
      : { kind: "eod" as const, status: "ok" as const, items: 0, message: "Skipped (indices=0)" };
  const indexComposition =
    url.searchParams.get("indexComposition") !== "0"
      ? await ingestIndexComposition(sb)
      : { kind: "eod" as const, status: "ok" as const, items: 0, message: "Skipped (indexComposition=0)" };
  const backfill = wantBackfill
    ? await backfillEodHistory(sb, { symbolLimit, prioritize: priority, minBars: 60 })
    : { kind: "eod_backfill" as const, status: "ok" as const, items: 0, message: "Skipped (backfill=0)" };
  const fundamentals =
    url.searchParams.get("fundamentals") !== "0"
      ? await ingestCompanyFundamentals(sb)
      : { kind: "fundamentals" as const, status: "ok" as const, items: 0, message: "Skipped (fundamentals=0)" };
  const statementLimit = Number(url.searchParams.get("statementLimit")) || 160;
  const pdfLimit = Number(url.searchParams.get("pdfLimit")) || 50;
  const statements =
    url.searchParams.get("statements") !== "0"
      ? await ingestCompanyStatements(sb, {
          securityLimit: statementLimit,
          pdfLimit,
          prioritize: priority,
          parsePdfs: url.searchParams.get("pdfs") !== "0",
        })
      : { kind: "statements" as const, status: "ok" as const, items: 0, message: "Skipped (statements=0)" };
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
    companyMaster.status !== "error" &&
    eod.status !== "error" &&
    indexEod.status !== "error" &&
    indexComposition.status !== "error" &&
    news.status !== "error" &&
    disclosures.status !== "error" &&
    actions.status !== "error" &&
    ownership.status !== "error" &&
    backfill.status !== "error" &&
    fundamentals.status !== "error" &&
    statements.status !== "error";
  // indexEod / statements may be "partial" when a migration is not yet applied — do not fail the whole cron
  // unless status is hard error.
  return NextResponse.json(
    {
      ok,
      companyMaster,
      eod,
      indexEod,
      indexComposition,
      backfill,
      fundamentals,
      statements,
      news,
      disclosures,
      actions,
      ownership,
    },
    { status: ok ? 200 : 500 },
  );
}
