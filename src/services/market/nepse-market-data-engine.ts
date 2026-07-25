import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import {
  fetchConfiguredNews,
  parseNewsFeedConfig,
  type AggregatedNewsItem,
} from "@/services/market/nepse-news";

/**
 * Automatic NEPSE data engine (Phase 3): after market close a cron hits the ingest route,
 * which snapshots the validated live bundle into `nepse_eod_prices` and pulls configured
 * news feeds into `nepse_market_news`. Tables are additive — no existing schema is touched.
 */

export type IngestResult = {
  kind: "eod" | "news";
  status: "ok" | "partial" | "error";
  items: number;
  message: string;
};

/** Untyped on purpose: the Phase 3 tables are not part of the generated Database types yet. */
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
    kind: result.kind,
    status: result.status,
    items: result.items,
    message: result.message.slice(0, 500),
    started_at: startedAt.toISOString(),
  });
  if (error) console.error("[nepse-engine] run log failed:", error.message);
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
        open_npr: tick.previousCloseNpr ?? null,
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
      // Chunked upserts keep each request under PostgREST payload limits.
      let persisted = 0;
      const failures: string[] = [];
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await sb.from("nepse_eod_prices").upsert(chunk, { onConflict: "symbol,trade_date" });
        if (error) failures.push(error.message);
        else persisted += chunk.length;
      }
      result = {
        kind: "eod",
        status: failures.length === 0 ? "ok" : persisted > 0 ? "partial" : "error",
        items: persisted,
        message: failures.length ? failures.join("; ") : `Stored ${persisted} closes for ${kathmanduTradeDate()}`,
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
