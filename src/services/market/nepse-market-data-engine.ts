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
 * paid-up / derived listed shares / market cap, valuation (EPS/PE/BV/ROE),
 * annual statement rows (published profit + equity), and dividend history.
 * Only published values (or identities derived from them) are written.
 */
export async function ingestCompanyFundamentals(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const {
      deriveListedShares,
      deriveMarketCap,
      deriveNetWorthTotal,
      deriveRoePct,
      computeGrahamNumber,
      computePe,
      computePb,
    } = await import("@/lib/market/nepse-fundamentals-format");
    const { getCompanyReportsBySymbol, getDividendHistoryBySymbol, getSecuritiesBySymbol, pickLatestReport } =
      await import("@/services/market/nepse-fundamentals-provider");
    const { getCachedNepseYonepseBundle } = await import("@/services/market/nepse-bundle-cache");

    const [reportsBySymbol, dividendsBySymbol, securities, bundle] = await Promise.all([
      getCompanyReportsBySymbol(),
      getDividendHistoryBySymbol(),
      getSecuritiesBySymbol(),
      getCachedNepseYonepseBundle().catch(() => null),
    ]);

    const failures: string[] = [];
    let items = 0;
    const now = new Date().toISOString();

    const profileRows: Record<string, unknown>[] = [];
    for (const sec of securities.values()) {
      const latest = pickLatestReport(reportsBySymbol.get(sec.symbol) ?? []);
      const tick = bundle?.bySymbol[sec.symbol];
      const livePrice =
        tick && tick.ltpNpr > 0
          ? tick.ltpNpr
          : tick?.previousCloseNpr && tick.previousCloseNpr > 0
            ? tick.previousCloseNpr
            : null;
      const paidUp = latest?.paidUpCapitalNpr ?? null;
      const listed = deriveListedShares(paidUp, sec.instrumentType);
      const marketCap =
        tick?.marketCap != null && Number.isFinite(tick.marketCap) && tick.marketCap > 0
          ? tick.marketCap
          : deriveMarketCap(livePrice, listed);
      profileRows.push({
        symbol: sec.symbol,
        company_name: sec.companyName,
        sector: sec.sector,
        industry: sec.instrumentType,
        paid_up_capital_npr: paidUp,
        listed_shares: listed,
        market_cap_npr: marketCap,
        // Promoter / public splits are not published by the configured securities feed.
        public_shares: null,
        promoter_shares: null,
        source: paidUp != null ? "yonepse:all_securities+filings" : "yonepse:all_securities",
        updated_at: now,
      });
    }
    for (let i = 0; i < profileRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_profiles").upsert(profileRows.slice(i, i + 500), { onConflict: "symbol" });
      if (error) failures.push(`profiles: ${error.message}`);
      else items += Math.min(500, profileRows.length - i);
    }

    const valuationRows: Record<string, unknown>[] = [];
    for (const [symbol, reports] of reportsBySymbol) {
      const latest = pickLatestReport(reports);
      if (!latest) continue;
      const tick = bundle?.bySymbol[symbol];
      const livePrice =
        tick && tick.ltpNpr > 0
          ? tick.ltpNpr
          : tick?.previousCloseNpr && tick.previousCloseNpr > 0
            ? tick.previousCloseNpr
            : null;
      const listed = deriveListedShares(latest.paidUpCapitalNpr, securities.get(symbol)?.instrumentType);
      const eps = latest.eps;
      const book = latest.netWorthPerShareNpr;
      valuationRows.push({
        symbol,
        as_of_date: latest.submittedDate,
        eps,
        pe: computePe(livePrice, eps) ?? latest.pe,
        book_value_npr: book,
        pb: computePb(livePrice, book),
        roe_pct: deriveRoePct(eps, book),
        roa_pct: null,
        net_worth_npr: deriveNetWorthTotal(book, listed),
        graham_number: computeGrahamNumber(eps, book),
        source: `yonepse:${latest.type}:${latest.fiscalYear}${latest.quarter ? ` ${latest.quarter}` : ""}`,
        updated_at: now,
      });
    }
    for (let i = 0; i < valuationRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_valuation").upsert(valuationRows.slice(i, i + 500), { onConflict: "symbol" });
      if (error) failures.push(`valuation: ${error.message}`);
      else items += Math.min(500, valuationRows.length - i);
    }

    const financialRows: Record<string, unknown>[] = [];
    for (const [symbol, reports] of reportsBySymbol) {
      const seen = new Set<string>();
      for (const report of reports.filter((row) => row.type === "annual")) {
        if (seen.has(report.fiscalYear)) continue;
        seen.add(report.fiscalYear);
        const listed = deriveListedShares(report.paidUpCapitalNpr, securities.get(symbol)?.instrumentType ?? "Equity");
        financialRows.push({
          symbol,
          fiscal_year: report.fiscalYear,
          period_label: `FY ${report.fiscalYear}`,
          revenue_npr: null,
          operating_profit_npr: null,
          net_profit_npr: report.profitNpr,
          reserves_npr: deriveNetWorthTotal(report.netWorthPerShareNpr, listed),
          cash_npr: null,
          borrowings_npr: null,
          assets_npr: null,
          liabilities_npr: null,
          source: `yonepse:annual:${report.fiscalYear}`,
          updated_at: now,
        });
      }
    }
    for (let i = 0; i < financialRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_financials").upsert(financialRows.slice(i, i + 500), {
        onConflict: "symbol,fiscal_year",
      });
      if (error) failures.push(`financials: ${error.message}`);
      else items += Math.min(500, financialRows.length - i);
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
          updated_at: now,
        });
      }
    }
    for (let i = 0; i < dividendRows.length; i += 500) {
      const { error } = await sb.from("nepse_company_dividends").upsert(dividendRows.slice(i, i + 500), {
        onConflict: "symbol,fiscal_year",
      });
      if (error) failures.push(`dividends: ${error.message}`);
      else items += Math.min(500, dividendRows.length - i);
    }

    result = {
      kind: "fundamentals",
      status: failures.length === 0 ? "ok" : items > 0 ? "partial" : "error",
      items,
      message: failures.length
        ? failures.slice(0, 3).join("; ")
        : `Upserted ${profileRows.length} profiles, ${valuationRows.length} valuations, ${financialRows.length} financial rows, ${dividendRows.length} dividend rows`,
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

/** Ingest symbol-tagged NEPSE disclosures + official exchange notices into the news table. */
export async function ingestCompanyDisclosures(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { getCompanyDisclosures, getExchangeMessages } = await import("@/services/market/nepse-fundamentals-provider");
    const { categorizeHeadline, scoreSentiment, isCorporateActionHeadline } = await import("@/services/market/nepse-news");
    const [companyDisclosures, exchangeMessages] = await Promise.all([
      getCompanyDisclosures(600),
      getExchangeMessages(400).catch(() => []),
    ]);
    // Dedupe by source_url so the two official streams never double-post the same notice.
    const seen = new Set<string>();
    const disclosures = [...companyDisclosures, ...exchangeMessages].filter((row) => {
      if (seen.has(row.sourceUrl)) return false;
      seen.add(row.sourceUrl);
      return true;
    });
    if (!disclosures.length) {
      result = { kind: "news", status: "ok", items: 0, message: "No disclosures published by provider" };
    } else {
      const rows = disclosures.map((row) => {
        const headline = `[${row.symbol}] ${row.title}`.slice(0, 400);
        const summary = `${row.symbol}${row.body ? ` · ${row.body}` : ""}`.slice(0, 500);
        return {
          headline,
          source_name: row.source ?? "NEPSE disclosure",
          source_url: row.sourceUrl,
          published_at: row.publishedAt,
          category: categorizeHeadline(row.title),
          sentiment: scoreSentiment(`${row.title} ${row.body ?? ""}`),
          summary,
          is_corporate_action: isCorporateActionHeadline(row.title),
        };
      });
      let persisted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb.from("nepse_market_news").upsert(chunk, { onConflict: "source_url", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        persisted += chunk.length;
      }
      result = {
        kind: "news",
        status: "ok",
        items: persisted,
        message: `Upserted ${persisted} symbol-tagged disclosures + exchange notices`,
      };
    }
  } catch (error) {
    result = {
      kind: "news",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Disclosure ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

/**
 * Build typed corporate actions (rights/bonus/dividend/agm/book_close/ipo/fpo/merger) from
 * the official disclosure streams and the proposed-dividend history, then upsert them into
 * `nepse_company_actions`. Only real, symbol-tagged events are stored — never synthesized.
 */
export async function ingestCompanyActions(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { getCompanyDisclosures, getExchangeMessages, getDividendHistoryBySymbol } = await import(
      "@/services/market/nepse-fundamentals-provider"
    );
    const { classifyCorporateAction } = await import("@/services/market/nepse-news");

    const [companyDisclosures, exchangeMessages, dividendsBySymbol] = await Promise.all([
      getCompanyDisclosures(600),
      getExchangeMessages(400).catch(() => []),
      getDividendHistoryBySymbol().catch(() => new Map()),
    ]);

    type ActionRow = {
      symbol: string;
      action_type: string;
      title: string;
      action_date: string | null;
      details: string | null;
      source_url: string | null;
      source: string | null;
      dedupe_key: string;
    };

    const rows: ActionRow[] = [];
    const seen = new Set<string>();
    const push = (row: Omit<ActionRow, "dedupe_key">) => {
      const dedupe_key = `${row.symbol}|${row.action_type}|${row.action_date ?? ""}|${row.title.slice(0, 80)}`;
      if (seen.has(dedupe_key)) return;
      seen.add(dedupe_key);
      rows.push({ ...row, dedupe_key });
    };

    const toDate = (value: string | null): string | null => {
      if (!value) return null;
      const iso = value.length >= 10 ? value.slice(0, 10) : value;
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
    };

    // 1) Disclosures + official exchange notices → typed actions (skip untyped news).
    for (const d of [...companyDisclosures, ...exchangeMessages]) {
      const actionType = classifyCorporateAction(`${d.title} ${d.body ?? ""}`);
      if (!actionType) continue;
      push({
        symbol: d.symbol,
        action_type: actionType,
        title: d.title.slice(0, 300),
        action_date: toDate(d.publishedAt),
        details: d.body ? d.body.slice(0, 400) : null,
        source_url: d.sourceUrl,
        source: d.source ?? "NEPSE",
      });
    }

    // 2) Proposed-dividend history → dividend / bonus / book_close actions.
    for (const [symbol, list] of dividendsBySymbol.entries()) {
      for (const div of list as { fiscalYear: string; cashPct: number | null; bonusPct: number | null; totalPct: number | null; announcementDate: string | null; bookCloseDate: string | null }[]) {
        const cash = div.cashPct ?? 0;
        const bonus = div.bonusPct ?? 0;
        const parts: string[] = [];
        if (cash > 0) parts.push(`Cash ${cash}%`);
        if (bonus > 0) parts.push(`Bonus ${bonus}%`);
        const details = parts.length ? `FY ${div.fiscalYear} · ${parts.join(" · ")}` : `FY ${div.fiscalYear}`;
        const annDate = toDate(div.announcementDate);
        if ((div.totalPct ?? 0) > 0 && cash > 0) {
          push({
            symbol,
            action_type: "dividend",
            title: `Cash dividend ${cash}% (FY ${div.fiscalYear})`,
            action_date: annDate,
            details,
            source_url: null,
            source: "NEPSE proposed dividend",
          });
        }
        if (bonus > 0) {
          push({
            symbol,
            action_type: "bonus",
            title: `Bonus share ${bonus}% (FY ${div.fiscalYear})`,
            action_date: annDate,
            details,
            source_url: null,
            source: "NEPSE proposed dividend",
          });
        }
        const bookClose = toDate(div.bookCloseDate);
        if (bookClose) {
          push({
            symbol,
            action_type: "book_close",
            title: `Book closure (FY ${div.fiscalYear})`,
            action_date: bookClose,
            details,
            source_url: null,
            source: "NEPSE proposed dividend",
          });
        }
      }
    }

    if (!rows.length) {
      result = { kind: "fundamentals", status: "ok", items: 0, message: "No typed corporate actions available" };
    } else {
      let persisted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb
          .from("nepse_company_actions")
          .upsert(chunk, { onConflict: "dedupe_key", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
        persisted += chunk.length;
      }
      result = {
        kind: "fundamentals",
        status: "ok",
        items: persisted,
        message: `Upserted ${persisted} typed corporate actions across ${new Set(rows.map((r) => r.symbol)).size} symbols`,
      };
    }
  } catch (error) {
    result = {
      kind: "fundamentals",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Corporate actions ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}
