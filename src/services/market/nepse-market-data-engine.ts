import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { fetchArchiveSymbols, fetchSymbolHistory } from "@/services/market/nepse-eod-history";
import {
  fetchConfiguredNews,
  parseNewsFeedConfig,
  type AggregatedNewsItem,
} from "@/services/market/nepse-news";

/**
 * Automatic NEPSE data engine: after market close a cron hits the ingest route,
 * which snapshots the validated live bundle into `nepse_eod_prices`, backfills
 * multi-day OHLC from the public history archive when needed, and pulls configured
 * news feeds into `nepse_market_news`. Tables are additive — no existing schema is touched.
 */

export type IngestResult = {
  kind: "eod" | "news" | "fundamentals" | "eod_backfill";
  status: "ok" | "partial" | "error";
  items: number;
  message: string;
};

/** Untyped on purpose: market-engine tables are not part of the generated Database types yet. */
export function createMarketDataServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Trade date in Asia/Kathmandu regardless of server timezone. */
export function kathmanduTradeDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(now);
}

async function logRun(sb: SupabaseClient, result: IngestResult, startedAt: Date): Promise<void> {
  const { error } = await sb.from("nepse_ingestion_runs").insert({
    kind: result.kind === "eod_backfill" ? "eod" : result.kind,
    status: result.status,
    items: result.items,
    message: result.message.slice(0, 500),
    started_at: startedAt.toISOString(),
  });
  if (error) console.error("[nepse-engine] run log failed:", error.message);
}

async function upsertEodChunks(
  sb: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<{ persisted: number; failures: string[] }> {
  let persisted = 0;
  const failures: string[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from("nepse_eod_prices").upsert(chunk, { onConflict: "symbol,trade_date" });
    if (error) failures.push(error.message);
    else persisted += chunk.length;
  }
  return { persisted, failures };
}

export async function ingestEodPrices(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const bundle = await getCachedNepseYonepseBundle();
    const tradeDate = kathmanduTradeDate();
    const rows = Object.values(bundle.bySymbol)
      .filter((tick) => Number.isFinite(tick.ltpNpr) && tick.ltpNpr > 0)
      .map((tick) => ({
        symbol: tick.symbol,
        trade_date: tradeDate,
        open_npr: tick.openNpr ?? tick.previousCloseNpr ?? null,
        high_npr: tick.highNpr ?? null,
        low_npr: tick.lowNpr ?? null,
        close_npr: tick.ltpNpr,
        previous_close_npr: tick.previousCloseNpr ?? null,
        change_pct: tick.changePct ?? null,
        volume: tick.volume != null ? Math.round(tick.volume) : null,
        turnover_npr: tick.turnoverNpr ?? null,
        trades: tick.trades ?? null,
        sector: tick.sector ?? null,
      }));

    if (rows.length === 0) {
      result = { kind: "eod", status: "error", items: 0, message: "Upstream bundle returned no usable quotes" };
    } else {
      const { persisted, failures } = await upsertEodChunks(sb, rows);
      result = {
        kind: "eod",
        status: failures.length === 0 ? "ok" : persisted > 0 ? "partial" : "error",
        items: persisted,
        message: failures.length ? failures.join("; ") : `Stored ${persisted} closes for ${tradeDate}`,
      };
    }
  } catch (error) {
    result = {
      kind: "eod",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "EOD ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

export type BackfillOptions = {
  /** Max symbols to process in this run (Vercel time budget). */
  symbolLimit?: number;
  /** Prefer these symbols first (e.g. NABIL). */
  prioritize?: string[];
  /** Only backfill symbols that currently have fewer than this many EOD rows. */
  minBars?: number;
};

/**
 * Backfill multi-day OHLC into `nepse_eod_prices` from the public history archive.
 * Safe to re-run — upserts on (symbol, trade_date).
 */
export async function backfillEodHistory(sb: SupabaseClient, options: BackfillOptions = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const symbolLimit = Math.min(Math.max(options.symbolLimit ?? 40, 1), 200);
  const minBars = Math.max(options.minBars ?? 30, 1);
  const prioritize = (options.prioritize ?? []).map((s) => s.toUpperCase());

  let result: IngestResult;
  try {
    let symbols: string[] = [];
    try {
      const bundle = await getCachedNepseYonepseBundle();
      symbols = Object.keys(bundle.bySymbol);
    } catch {
      symbols = [];
    }
    // Always merge the history archive symbol list so preferred/illiquid names still get OHLC.
    try {
      const archive = await fetchArchiveSymbols();
      symbols = [...new Set([...symbols, ...archive])];
    } catch {
      /* live symbols alone are enough to make progress */
    }
    symbols = [...new Set([...prioritize, ...symbols.map((s) => s.toUpperCase())])];

    const need: string[] = [];
    for (const symbol of symbols) {
      if (need.length >= symbolLimit) break;
      const { count, error } = await sb
        .from("nepse_eod_prices")
        .select("*", { count: "exact", head: true })
        .eq("symbol", symbol);
      if (error) continue;
      if ((count ?? 0) < minBars) need.push(symbol);
    }

    if (need.length === 0) {
      result = {
        kind: "eod_backfill",
        status: "ok",
        items: 0,
        message: `All checked symbols already have ≥${minBars} EOD bars`,
      };
    } else {
      let persisted = 0;
      let symbolsOk = 0;
      const failures: string[] = [];

      for (const symbol of need) {
        try {
          const bars = await fetchSymbolHistory(symbol);
          if (!bars.length) {
            failures.push(`${symbol}: empty history`);
            continue;
          }
          const rows = bars.map((bar) => ({
            symbol,
            trade_date: bar.tradeDate,
            open_npr: bar.openNpr,
            high_npr: bar.highNpr,
            low_npr: bar.lowNpr,
            close_npr: bar.closeNpr,
            previous_close_npr: bar.previousCloseNpr,
            change_pct: bar.changePct,
            volume: bar.volume != null ? Math.round(bar.volume) : null,
            turnover_npr: bar.turnoverNpr,
            trades: null,
            sector: null,
          }));
          const chunk = await upsertEodChunks(sb, rows);
          persisted += chunk.persisted;
          if (chunk.failures.length) failures.push(`${symbol}: ${chunk.failures[0]}`);
          else symbolsOk += 1;
        } catch (error) {
          failures.push(`${symbol}: ${error instanceof Error ? error.message : "fetch failed"}`);
        }
      }

      result = {
        kind: "eod_backfill",
        status: failures.length === 0 ? "ok" : symbolsOk > 0 ? "partial" : "error",
        items: persisted,
        message: `Backfilled ${persisted} bars across ${symbolsOk}/${need.length} symbols${
          failures.length ? ` · ${failures.slice(0, 3).join("; ")}` : ""
        }`,
      };
    }
  } catch (error) {
    result = {
      kind: "eod_backfill",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "EOD backfill failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

export async function ingestMarketNews(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const feeds = parseNewsFeedConfig(process.env.NEPSE_NEWS_FEEDS);
    if (feeds.length === 0) {
      result = {
        kind: "news",
        status: "ok",
        items: 0,
        message: "No feeds configured (set NEPSE_NEWS_FEEDS as 'Name|url,Name|url')",
      };
    } else {
      const { items, failures } = await fetchConfiguredNews(feeds);
      let persisted = 0;
      if (items.length > 0) {
        const rows = items.map((item: AggregatedNewsItem) => ({
          headline: item.headline.slice(0, 400),
          source_name: item.sourceName,
          source_url: item.sourceUrl,
          published_at: item.publishedAt,
          category: item.category,
          sentiment: item.sentiment,
          summary: item.summary,
          is_corporate_action: item.isCorporateAction,
        }));
        const { error } = await sb.from("nepse_market_news").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        persisted = rows.length;
      }
      result = {
        kind: "news",
        status: failures.length === 0 ? "ok" : persisted > 0 ? "partial" : "error",
        items: persisted,
        message: failures.length ? `Feed failures: ${failures.join("; ")}` : `Aggregated ${persisted} headlines`,
      };
    }
  } catch (error) {
    result = {
      kind: "news",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "News ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

/**
 * Fundamentals ingest from the real filings mirror (Yonepse): company identity,
 * latest valuation (EPS / PE / net worth per share) and full dividend history.
 * Only published values are written — fields the provider omits stay null.
 */
export async function ingestCompanyFundamentals(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { getCompanyReportsBySymbol, getDividendHistoryBySymbol, getSecuritiesBySymbol, fiscalYearStart, quarterRank } =
      await import("@/services/market/nepse-fundamentals-provider");
    const [reportsBySymbol, dividendsBySymbol, securities] = await Promise.all([
      getCompanyReportsBySymbol(),
      getDividendHistoryBySymbol(),
      getSecuritiesBySymbol(),
    ]);

    const failures: string[] = [];
    let items = 0;

    const profileRows = [...securities.values()].map((sec) => ({
      symbol: sec.symbol,
      company_name: sec.companyName,
      sector: sec.sector,
      industry: sec.instrumentType,
      source: "yonepse:all_securities",
      updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < profileRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_profiles").upsert(profileRows.slice(i, i + 500), { onConflict: "symbol" });
      if (error) failures.push(`profiles: ${error.message}`);
      else items += Math.min(500, profileRows.length - i);
    }

    const valuationRows: Record<string, unknown>[] = [];
    for (const [symbol, reports] of reportsBySymbol) {
      const latest = [...reports].sort((a, b) => {
        const diff = (fiscalYearStart(b.fiscalYear) ?? 0) - (fiscalYearStart(a.fiscalYear) ?? 0);
        return diff !== 0 ? diff : quarterRank(b.quarter) - quarterRank(a.quarter);
      })[0];
      if (!latest) continue;
      valuationRows.push({
        symbol,
        as_of_date: latest.submittedDate,
        eps: latest.eps,
        pe: latest.pe,
        book_value_npr: latest.netWorthPerShareNpr,
        source: `yonepse:${latest.type}:${latest.fiscalYear}${latest.quarter ? ` ${latest.quarter}` : ""}`,
        updated_at: new Date().toISOString(),
      });
    }
    for (let i = 0; i < valuationRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_valuation").upsert(valuationRows.slice(i, i + 500), { onConflict: "symbol" });
      if (error) failures.push(`valuation: ${error.message}`);
      else items += Math.min(500, valuationRows.length - i);
    }

    const dividendRows: Record<string, unknown>[] = [];
    for (const rows of dividendsBySymbol.values()) {
      for (const row of rows) {
        dividendRows.push({
          symbol: row.symbol,
          fiscal_year: row.fiscalYear,
          bonus_pct: row.bonusPct,
          cash_pct: row.cashPct,
          book_close_date: row.bookCloseDate,
          source: "yonepse:proposed_dividend",
          updated_at: new Date().toISOString(),
        });
      }
    }
    for (let i = 0; i < dividendRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_dividends").upsert(dividendRows.slice(i, i + 500), { onConflict: "symbol,fiscal_year" });
      if (error) failures.push(`dividends: ${error.message}`);
      else items += Math.min(500, dividendRows.length - i);
    }

    result = {
      kind: "fundamentals",
      status: failures.length === 0 ? "ok" : items > 0 ? "partial" : "error",
      items,
      message: failures.length
        ? failures.slice(0, 3).join("; ")
        : `Upserted ${profileRows.length} profiles, ${valuationRows.length} valuations, ${dividendRows.length} dividend rows`,
    };
  } catch (error) {
    result = {
      kind: "fundamentals",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Fundamentals ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}
