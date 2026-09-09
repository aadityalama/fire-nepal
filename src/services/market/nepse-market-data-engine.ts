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
  kind: "eod" | "news" | "fundamentals" | "eod_backfill" | "statements";
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
  const kind =
    result.kind === "eod_backfill" ? "eod" : result.kind === "statements" ? "statements" : result.kind;
  const { error } = await sb.from("nepse_ingestion_runs").insert({
    kind,
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
        // Ownership (promoter/public) is written by ingestCompanyOwnership — omit here
        // so upserts do not wipe previously ingested official NEPSE capital-structure fields.
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

function statementRowChanged(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  keys: string[],
): boolean {
  for (const key of keys) {
    const a = previous[key] == null ? null : Number(previous[key]);
    const b = next[key] == null ? null : Number(next[key]);
    if (a !== b && !(Number.isNaN(a) && Number.isNaN(b))) {
      if (previous[key] !== next[key]) return true;
    }
    if (typeof previous[key] === "string" || typeof next[key] === "string") {
      if ((previous[key] ?? null) !== (next[key] ?? null)) return true;
    }
  }
  return false;
}

/**
 * Ingest complete annual/quarterly financial statements from official NEPSE reports.
 * Structured fiscalReport scalars always; PDF line items when text-extractable.
 * Incremental: skips unchanged document fingerprints; archives prior values on restatement.
 */
export async function ingestCompanyStatements(
  sb: SupabaseClient,
  options?: {
    securityLimit?: number;
    pdfLimit?: number;
    prioritize?: string[];
    parsePdfs?: boolean;
  },
): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { fetchOfficialStatements } = await import("@/services/market/nepse-statements-provider");

    const existingRes = await sb
      .from("nepse_company_statements")
      .select("symbol,period_key,report_id,document_path,document_hash,extraction_status,report_modified_at");
    if (existingRes.error && /nepse_company_statements|schema cache|does not exist/i.test(existingRes.error.message)) {
      // Soft-fail so the rest of the market cron keeps running until the migration is applied.
      result = {
        kind: "statements",
        status: "partial",
        items: 0,
        message: `Statements table missing — apply migration 20260727120000_nepse_company_statements.sql (${existingRes.error.message})`,
      };
      await logRun(sb, result, startedAt);
      return result;
    }

    const knownHashes = new Set<string>();
    const skipKeys = new Set<string>();
    for (const row of (existingRes.data as Record<string, unknown>[] | null) ?? []) {
      const symbol = typeof row.symbol === "string" ? row.symbol : "";
      const periodKey = typeof row.period_key === "string" ? row.period_key : "";
      const reportId = typeof row.report_id === "string" ? row.report_id : "";
      const documentPath = typeof row.document_path === "string" ? row.document_path : "";
      const documentHash = typeof row.document_hash === "string" ? row.document_hash : "";
      const status = typeof row.extraction_status === "string" ? row.extraction_status : "";
      if (documentHash) knownHashes.add(documentHash);
      // Skip PDF re-download only when this exact filing was already successfully parsed.
      if (symbol && periodKey && reportId && status === "pdf_parsed") {
        skipKeys.add(`${symbol}|${periodKey}|${reportId}|${documentPath}`);
      }
    }

    const parsePdfs = options?.parsePdfs !== false;
    const official = await fetchOfficialStatements({
      securityLimit: options?.securityLimit ?? 160,
      pdfLimit: options?.pdfLimit ?? 50,
      prioritize: options?.prioritize ?? ["NABIL", "NICA", "GBIME", "UPPER", "API", "HIDCL", "NLIC", "SHIVM", "NRIC", "CHCL"],
      parsePdfs,
      concurrency: 3,
      knownDocumentHashes: knownHashes,
      skipPeriodKeys: parsePdfs ? skipKeys : undefined,
    });

    const now = new Date().toISOString();
    const numericKeys = [
      "revenue_npr",
      "operating_revenue_npr",
      "other_income_npr",
      "gross_profit_npr",
      "operating_profit_npr",
      "ebitda_npr",
      "ebit_npr",
      "net_profit_npr",
      "eps",
      "diluted_eps",
      "total_assets_npr",
      "current_assets_npr",
      "non_current_assets_npr",
      "cash_npr",
      "investments_npr",
      "inventories_npr",
      "receivables_npr",
      "total_equity_npr",
      "share_capital_npr",
      "reserves_npr",
      "retained_earnings_npr",
      "total_liabilities_npr",
      "current_liabilities_npr",
      "non_current_liabilities_npr",
      "borrowings_npr",
      "operating_cash_flow_npr",
      "investing_cash_flow_npr",
      "financing_cash_flow_npr",
      "free_cash_flow_npr",
      "net_cash_movement_npr",
      "paid_up_capital_npr",
      "pe",
      "net_worth_per_share_npr",
    ] as const;

    const symbols = [...new Set(official.map((row) => row.symbol))];
    const existingByKey = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < symbols.length; i += 80) {
      const chunk = symbols.slice(i, i + 80);
      const existingFull = await sb.from("nepse_company_statements").select("*").in("symbol", chunk);
      for (const row of (existingFull.data as Record<string, unknown>[] | null) ?? []) {
        existingByKey.set(`${row.symbol}|${row.period_key}`, row);
      }
    }

    const prefer = <T,>(next: T | null | undefined, prev: unknown): T | null => {
      if (next != null && next !== "") return next as T;
      if (prev == null || prev === "") return null;
      return prev as T;
    };

    const upsertRows: Record<string, unknown>[] = official.map((row) => {
      const prev = existingByKey.get(`${row.symbol}|${row.periodKey}`) ?? {};
      const sameFiling =
        prev.report_id === row.reportId &&
        (prev.document_path ?? null) === (row.documentPath ?? null) &&
        (row.documentHash == null || prev.document_hash == null || prev.document_hash === row.documentHash);
      const mergeNulls = sameFiling || row.extractionStatus !== "pdf_parsed";
      const pickNum = (next: number | null | undefined, key: string) =>
        mergeNulls ? prefer(next ?? null, prev[key]) : (next ?? null);

      return {
        symbol: row.symbol,
        period_key: row.periodKey,
        period_type: row.periodType,
        fiscal_year: row.fiscalYear,
        fiscal_year_nepali: row.fiscalYearNepali,
        quarter: row.quarter,
        period_label: row.periodLabel,
        report_id: row.reportId,
        document_path: row.documentPath,
        document_hash: prefer(row.documentHash, prev.document_hash),
        submitted_date: row.submittedDate,
        report_modified_at: row.reportModifiedAt,
        revenue_npr: pickNum(row.fields.revenueNpr ?? null, "revenue_npr"),
        operating_revenue_npr: pickNum(row.fields.operatingRevenueNpr ?? null, "operating_revenue_npr"),
        other_income_npr: pickNum(row.fields.otherIncomeNpr ?? null, "other_income_npr"),
        gross_profit_npr: pickNum(row.fields.grossProfitNpr ?? null, "gross_profit_npr"),
        operating_profit_npr: pickNum(row.fields.operatingProfitNpr ?? null, "operating_profit_npr"),
        ebitda_npr: pickNum(row.fields.ebitdaNpr ?? null, "ebitda_npr"),
        ebit_npr: pickNum(row.fields.ebitNpr ?? null, "ebit_npr"),
        net_profit_npr: pickNum(row.netProfitNpr ?? row.fields.netProfitNpr ?? null, "net_profit_npr"),
        eps: pickNum(row.eps ?? row.fields.eps ?? null, "eps"),
        diluted_eps: pickNum(row.dilutedEps ?? row.fields.dilutedEps ?? null, "diluted_eps"),
        total_assets_npr: pickNum(row.fields.totalAssetsNpr ?? null, "total_assets_npr"),
        current_assets_npr: pickNum(row.fields.currentAssetsNpr ?? null, "current_assets_npr"),
        non_current_assets_npr: pickNum(row.fields.nonCurrentAssetsNpr ?? null, "non_current_assets_npr"),
        cash_npr: pickNum(row.fields.cashNpr ?? null, "cash_npr"),
        investments_npr: pickNum(row.fields.investmentsNpr ?? null, "investments_npr"),
        inventories_npr: pickNum(row.fields.inventoriesNpr ?? null, "inventories_npr"),
        receivables_npr: pickNum(row.fields.receivablesNpr ?? null, "receivables_npr"),
        total_equity_npr: pickNum(row.fields.totalEquityNpr ?? null, "total_equity_npr"),
        share_capital_npr: pickNum(row.fields.shareCapitalNpr ?? row.paidUpCapitalNpr ?? null, "share_capital_npr"),
        reserves_npr: pickNum(row.fields.reservesNpr ?? null, "reserves_npr"),
        retained_earnings_npr: pickNum(row.fields.retainedEarningsNpr ?? null, "retained_earnings_npr"),
        total_liabilities_npr: pickNum(row.fields.totalLiabilitiesNpr ?? null, "total_liabilities_npr"),
        current_liabilities_npr: pickNum(row.fields.currentLiabilitiesNpr ?? null, "current_liabilities_npr"),
        non_current_liabilities_npr: pickNum(row.fields.nonCurrentLiabilitiesNpr ?? null, "non_current_liabilities_npr"),
        borrowings_npr: pickNum(row.fields.borrowingsNpr ?? null, "borrowings_npr"),
        operating_cash_flow_npr: pickNum(row.fields.operatingCashFlowNpr ?? null, "operating_cash_flow_npr"),
        investing_cash_flow_npr: pickNum(row.fields.investingCashFlowNpr ?? null, "investing_cash_flow_npr"),
        financing_cash_flow_npr: pickNum(row.fields.financingCashFlowNpr ?? null, "financing_cash_flow_npr"),
        free_cash_flow_npr: pickNum(row.fields.freeCashFlowNpr ?? null, "free_cash_flow_npr"),
        net_cash_movement_npr: pickNum(row.fields.netCashMovementNpr ?? null, "net_cash_movement_npr"),
        paid_up_capital_npr: pickNum(row.paidUpCapitalNpr, "paid_up_capital_npr"),
        pe: pickNum(row.pe, "pe"),
        net_worth_per_share_npr: pickNum(row.netWorthPerShareNpr, "net_worth_per_share_npr"),
        extraction_status:
          row.extractionStatus === "structured_only" && prev.extraction_status === "pdf_parsed" && sameFiling
            ? "pdf_parsed"
            : row.extractionStatus,
        source: row.source,
        updated_at: now,
      };
    });

    const revisions: Record<string, unknown>[] = [];
    for (const next of upsertRows) {
      const prev = existingByKey.get(`${next.symbol}|${next.period_key}`);
      if (!prev) continue;
      const changed =
        statementRowChanged(prev, next, [...numericKeys, "document_hash", "report_id", "document_path"]) ||
        (prev.report_id != null && next.report_id != null && prev.report_id !== next.report_id);
      if (!changed) continue;
      revisions.push({
        symbol: next.symbol,
        period_key: next.period_key,
        previous_row: prev,
        reason: "official_report_updated",
        source: next.source,
      });
    }
    for (let i = 0; i < revisions.length; i += 200) {
      const { error } = await sb.from("nepse_company_statement_revisions").insert(revisions.slice(i, i + 200));
      if (error) console.error("[nepse-engine] statement revision archive failed:", error.message);
    }

    let persisted = 0;
    const failures: string[] = [];
    for (let i = 0; i < upsertRows.length; i += 150) {
      const chunk = upsertRows.slice(i, i + 150);
      const { error } = await sb.from("nepse_company_statements").upsert(chunk, { onConflict: "symbol,period_key" });
      if (error) failures.push(error.message);
      else persisted += chunk.length;
    }

    // Keep legacy annual financials table in sync for CompanyFinancialsTable.
    const annualLegacy = upsertRows
      .filter((row) => row.period_type === "annual")
      .map((row) => ({
        symbol: row.symbol,
        fiscal_year: row.fiscal_year,
        period_label: row.period_label,
        revenue_npr: row.revenue_npr,
        operating_profit_npr: row.operating_profit_npr,
        net_profit_npr: row.net_profit_npr,
        reserves_npr: row.reserves_npr ?? row.total_equity_npr,
        cash_npr: row.cash_npr,
        borrowings_npr: row.borrowings_npr,
        assets_npr: row.total_assets_npr,
        liabilities_npr: row.total_liabilities_npr,
        source: row.source,
        updated_at: now,
      }));
    for (let i = 0; i < annualLegacy.length; i += 200) {
      const { error } = await sb.from("nepse_company_financials").upsert(annualLegacy.slice(i, i + 200), {
        onConflict: "symbol,fiscal_year",
      });
      if (error) failures.push(`legacy financials: ${error.message}`);
    }

    const parsed = upsertRows.filter((row) => row.extraction_status === "pdf_parsed").length;
    result = {
      kind: "statements",
      status: failures.length === 0 ? "ok" : persisted > 0 ? "partial" : "error",
      items: persisted,
      message: failures.length
        ? failures.slice(0, 3).join("; ")
        : `Upserted ${persisted} statement periods (${parsed} PDF-parsed, ${revisions.length} revisions archived)`,
    };
  } catch (error) {
    result = {
      kind: "statements",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Statements ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

/**
 * Ingest official NEPSE promoter / public ownership into `nepse_company_profiles`.
 * Mutual-fund / institutional / foreign holdings are not published by NEPSE and stay null.
 */
export async function ingestCompanyOwnership(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { getOwnershipBySymbol } = await import("@/services/market/nepse-ownership-provider");
    const bySymbol = await getOwnershipBySymbol({ concurrency: 3 });
    if (!bySymbol.size) {
      result = { kind: "fundamentals", status: "ok", items: 0, message: "No ownership rows published by NEPSE" };
    } else {
      const now = new Date().toISOString();
      const rows = [...bySymbol.values()].map((row) => ({
        symbol: row.symbol,
        promoter_shares: row.promoterShares,
        public_shares: row.publicShares,
        listed_shares: row.listedShares,
        source: "nepse:security-detail",
        updated_at: now,
      }));
      let persisted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await sb.from("nepse_company_profiles").upsert(chunk, { onConflict: "symbol" });
        if (error) throw new Error(error.message);
        persisted += chunk.length;
      }
      result = {
        kind: "fundamentals",
        status: "ok",
        items: persisted,
        message: `Upserted promoter/public ownership for ${persisted} symbols from NEPSE security-detail`,
      };
    }
  } catch (error) {
    result = {
      kind: "fundamentals",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Ownership ingest failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}

/**
 * Official NEPSE company master synchronization.
 * Writes the single-source company catalog + change history + validation report.
 */
export async function ingestOfficialCompanyMaster(
  sb: SupabaseClient,
  mode: "preopen" | "postclose" | "weekly_validation" | "manual" = "postclose",
): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { syncOfficialCompanyMaster } = await import("@/services/market/nepse-company-master");
    const sync = await syncOfficialCompanyMaster(sb, mode);
    // When NEPSE changes listings/sectors, rebuild official index membership automatically.
    let compositionMessage = "index composition skipped";
    if (sync.status !== "error") {
      try {
        const { ingestIndexComposition } = await import("@/services/market/nepse-index-composition");
        const composition = await ingestIndexComposition(sb);
        compositionMessage = `index composition ${composition.status}: ${composition.message}`;
      } catch (compositionError) {
        compositionMessage =
          compositionError instanceof Error
            ? `index composition error: ${compositionError.message}`
            : "index composition error";
      }
    }
    result = {
      kind: "fundamentals",
      status: sync.status,
      items: sync.totalSeen,
      message: `${sync.message} · active=${sync.totalActive} listed=${sync.totalListed} new=${sync.newSymbols} changed=${sync.changedSymbols} · ${compositionMessage}`,
    };
  } catch (error) {
    result = {
      kind: "fundamentals",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Official company master sync failed",
    };
  }
  await logRun(sb, result, startedAt);
  return result;
}
