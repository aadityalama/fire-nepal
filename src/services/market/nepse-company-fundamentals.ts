import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeGrahamNumber,
  computePb,
  computePe,
  sharePct,
} from "@/lib/market/nepse-fundamentals-format";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepseCompanyActionRow,
  NepseCompanyDividendRow,
  NepseCompanyFinancialRow,
  NepseCompanyFundamentalsPayload,
  NepseCompanyProfile,
  NepseCompanyRange52W,
  NepseCompanySessionStats,
  NepseCompanyShareholding,
  NepseCompanyValuation,
  NepseCorporateActionType,
} from "@/types/market/nepse-company-fundamentals";

const ACTION_TYPES = new Set<NepseCorporateActionType>([
  "rights",
  "bonus",
  "dividend",
  "agm",
  "book_close",
  "fpo",
  "ipo",
  "merger",
]);

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function emptyProfile(symbol: string): NepseCompanyProfile {
  return {
    symbol,
    companyName: null,
    sector: null,
    industry: null,
    marketCapNpr: null,
    paidUpCapitalNpr: null,
    listedShares: null,
    publicShares: null,
    promoterShares: null,
    source: null,
    updatedAt: null,
  };
}

function emptyValuation(symbol: string): NepseCompanyValuation {
  return {
    symbol,
    asOfDate: null,
    eps: null,
    pe: null,
    bookValueNpr: null,
    pb: null,
    roePct: null,
    roaPct: null,
    netWorthNpr: null,
    grahamNumber: null,
    source: null,
    updatedAt: null,
  };
}

function emptySession(): NepseCompanySessionStats {
  return {
    openNpr: null,
    highNpr: null,
    lowNpr: null,
    closeNpr: null,
    previousCloseNpr: null,
    volume: null,
    turnoverNpr: null,
    trades: null,
  };
}

function mapProfile(symbol: string, row: Record<string, unknown> | null, tick?: NepseSecurityTick): NepseCompanyProfile {
  const base = emptyProfile(symbol);
  if (row) {
    base.companyName = str(row.company_name);
    base.sector = str(row.sector);
    base.industry = str(row.industry);
    base.marketCapNpr = num(row.market_cap_npr);
    base.paidUpCapitalNpr = num(row.paid_up_capital_npr);
    base.listedShares = num(row.listed_shares);
    base.publicShares = num(row.public_shares);
    base.promoterShares = num(row.promoter_shares);
    base.source = str(row.source);
    base.updatedAt = str(row.updated_at);
  }
  // Live feed fills identity gaps only — never invents capital structure.
  if (!base.companyName && tick?.companyName) base.companyName = tick.companyName;
  if (!base.sector && tick?.sector) base.sector = tick.sector;
  if (base.marketCapNpr == null && tick?.marketCap != null && Number.isFinite(tick.marketCap)) {
    base.marketCapNpr = tick.marketCap;
  }
  return base;
}

function mapValuation(symbol: string, row: Record<string, unknown> | null, livePrice: number | null): NepseCompanyValuation {
  const base = emptyValuation(symbol);
  if (row) {
    base.asOfDate = str(row.as_of_date);
    base.eps = num(row.eps);
    base.pe = num(row.pe);
    base.bookValueNpr = num(row.book_value_npr);
    base.pb = num(row.pb);
    base.roePct = num(row.roe_pct);
    base.roaPct = num(row.roa_pct);
    base.netWorthNpr = num(row.net_worth_npr);
    base.grahamNumber = num(row.graham_number);
    base.source = str(row.source);
    base.updatedAt = str(row.updated_at);
  }
  // Derive ratios only from real stored EPS / book value + live price — never invent inputs.
  if (base.pe == null) base.pe = computePe(livePrice, base.eps);
  if (base.pb == null) base.pb = computePb(livePrice, base.bookValueNpr);
  if (base.grahamNumber == null) base.grahamNumber = computeGrahamNumber(base.eps, base.bookValueNpr);
  return base;
}

function mapFinancial(row: Record<string, unknown>): NepseCompanyFinancialRow {
  return {
    symbol: String(row.symbol),
    fiscalYear: String(row.fiscal_year),
    periodLabel: str(row.period_label),
    revenueNpr: num(row.revenue_npr),
    operatingProfitNpr: num(row.operating_profit_npr),
    netProfitNpr: num(row.net_profit_npr),
    reservesNpr: num(row.reserves_npr),
    cashNpr: num(row.cash_npr),
    borrowingsNpr: num(row.borrowings_npr),
    assetsNpr: num(row.assets_npr),
    liabilitiesNpr: num(row.liabilities_npr),
    source: str(row.source),
  };
}

function mapDividend(row: Record<string, unknown>): NepseCompanyDividendRow {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    fiscalYear: String(row.fiscal_year),
    bonusPct: num(row.bonus_pct),
    cashPct: num(row.cash_pct),
    bookCloseDate: str(row.book_close_date),
    agmDate: str(row.agm_date),
    source: str(row.source),
  };
}

function mapAction(row: Record<string, unknown>): NepseCompanyActionRow | null {
  const actionType = str(row.action_type);
  if (!actionType || !ACTION_TYPES.has(actionType as NepseCorporateActionType)) return null;
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    actionType: actionType as NepseCorporateActionType,
    title: str(row.title) ?? "Corporate action",
    actionDate: str(row.action_date),
    details: str(row.details),
    sourceUrl: str(row.source_url),
    source: str(row.source),
  };
}

function sessionFromTick(tick?: NepseSecurityTick): NepseCompanySessionStats {
  if (!tick) return emptySession();
  const close = tick.ltpNpr > 0 ? tick.ltpNpr : null;
  return {
    openNpr: tick.openNpr ?? null,
    highNpr: tick.highNpr ?? null,
    lowNpr: tick.lowNpr ?? null,
    closeNpr: close,
    previousCloseNpr: tick.previousCloseNpr ?? null,
    volume: tick.volume ?? null,
    turnoverNpr: tick.turnoverNpr ?? null,
    trades: tick.trades ?? null,
  };
}

function shareholdingFromProfile(profile: NepseCompanyProfile): NepseCompanyShareholding {
  const listed = profile.listedShares;
  const promoter = profile.promoterShares;
  const pub = profile.publicShares;
  const promoterPct = sharePct(promoter, listed);
  const publicPct = sharePct(pub, listed);
  let otherPct: number | null = null;
  if (promoterPct != null && publicPct != null) {
    const rest = 100 - promoterPct - publicPct;
    otherPct = rest >= 0 ? rest : null;
  }
  return {
    promoterShares: promoter,
    publicShares: pub,
    listedShares: listed,
    promoterPct,
    publicPct,
    otherPct,
  };
}

async function loadRange52w(sb: SupabaseClient, symbol: string): Promise<NepseCompanyRange52W> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 370);
  const sinceIso = since.toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("nepse_eod_prices")
    .select("trade_date, high_npr, low_npr, close_npr")
    .eq("symbol", symbol)
    .gte("trade_date", sinceIso)
    .order("trade_date", { ascending: true });
  if (error || !data?.length) {
    return { highNpr: null, lowNpr: null, fromDate: null, toDate: null };
  }

  let high: number | null = null;
  let low: number | null = null;
  let fromDate: string | null = null;
  let toDate: string | null = null;
  for (const row of data) {
    const highNpr = num(row.high_npr) ?? num(row.close_npr);
    const lowNpr = num(row.low_npr) ?? num(row.close_npr);
    const date = str(row.trade_date);
    if (date) {
      if (!fromDate) fromDate = date;
      toDate = date;
    }
    if (highNpr != null && highNpr > 0) high = high == null ? highNpr : Math.max(high, highNpr);
    if (lowNpr != null && lowNpr > 0) low = low == null ? lowNpr : Math.min(low, lowNpr);
  }
  return { highNpr: high, lowNpr: low, fromDate, toDate };
}

/**
 * Assemble the company fundamentals payload from Supabase + live session tick.
 * Missing DB rows resolve to null fields — never fabricated company-specific values.
 */
export async function loadCompanyFundamentals(symbolRaw: string): Promise<NepseCompanyFundamentalsPayload> {
  const symbol = decodeURIComponent(symbolRaw).trim().toUpperCase();
  const sb = createMarketDataServiceClient();

  let tick: NepseSecurityTick | undefined;
  try {
    const bundle = await getCachedNepseYonepseBundle();
    tick = bundle.bySymbol[symbol];
  } catch {
    tick = undefined;
  }

  const livePrice = tick && tick.ltpNpr > 0 ? tick.ltpNpr : tick?.previousCloseNpr && tick.previousCloseNpr > 0 ? tick.previousCloseNpr : null;

  if (!sb) {
    const profile = mapProfile(symbol, null, tick);
    return {
      symbol,
      profile,
      valuation: mapValuation(symbol, null, livePrice),
      financials: [],
      dividends: [],
      actions: [],
      session: sessionFromTick(tick),
      range52w: { highNpr: null, lowNpr: null, fromDate: null, toDate: null },
      shareholding: shareholdingFromProfile(profile),
      loadedAt: new Date().toISOString(),
    };
  }

  const [profileRes, valuationRes, financialsRes, dividendsRes, actionsRes, range52w] = await Promise.all([
    sb.from("nepse_company_profiles").select("*").eq("symbol", symbol).maybeSingle(),
    sb.from("nepse_company_valuation").select("*").eq("symbol", symbol).maybeSingle(),
    sb.from("nepse_company_financials").select("*").eq("symbol", symbol).order("fiscal_year", { ascending: false }).limit(8),
    sb.from("nepse_company_dividends").select("*").eq("symbol", symbol).order("fiscal_year", { ascending: false }).limit(20),
    sb.from("nepse_company_actions").select("*").eq("symbol", symbol).order("action_date", { ascending: false, nullsFirst: false }).limit(40),
    loadRange52w(sb, symbol),
  ]);

  const profile = mapProfile(symbol, (profileRes.data as Record<string, unknown> | null) ?? null, tick);
  const valuation = mapValuation(symbol, (valuationRes.data as Record<string, unknown> | null) ?? null, livePrice);
  const financials = ((financialsRes.data as Record<string, unknown>[] | null) ?? []).map(mapFinancial);
  const dividends = ((dividendsRes.data as Record<string, unknown>[] | null) ?? []).map(mapDividend);
  const actions = ((actionsRes.data as Record<string, unknown>[] | null) ?? [])
    .map(mapAction)
    .filter((row): row is NepseCompanyActionRow => Boolean(row));

  return {
    symbol,
    profile,
    valuation,
    financials,
    dividends,
    actions,
    session: sessionFromTick(tick),
    range52w,
    shareholding: shareholdingFromProfile(profile),
    loadedAt: new Date().toISOString(),
  };
}

/** Upsert helpers for future cron / licensed provider pipelines. */
export async function upsertCompanyProfile(
  sb: SupabaseClient,
  row: {
    symbol: string;
    company_name?: string | null;
    sector?: string | null;
    industry?: string | null;
    market_cap_npr?: number | null;
    paid_up_capital_npr?: number | null;
    listed_shares?: number | null;
    public_shares?: number | null;
    promoter_shares?: number | null;
    source?: string | null;
  },
): Promise<{ ok: boolean; message: string }> {
  const { error } = await sb.from("nepse_company_profiles").upsert(
    { ...row, symbol: row.symbol.toUpperCase(), updated_at: new Date().toISOString() },
    { onConflict: "symbol" },
  );
  return error ? { ok: false, message: error.message } : { ok: true, message: "profile upserted" };
}

export async function upsertCompanyValuation(
  sb: SupabaseClient,
  row: {
    symbol: string;
    as_of_date?: string | null;
    eps?: number | null;
    pe?: number | null;
    book_value_npr?: number | null;
    pb?: number | null;
    roe_pct?: number | null;
    roa_pct?: number | null;
    net_worth_npr?: number | null;
    graham_number?: number | null;
    source?: string | null;
  },
): Promise<{ ok: boolean; message: string }> {
  const { error } = await sb.from("nepse_company_valuation").upsert(
    { ...row, symbol: row.symbol.toUpperCase(), updated_at: new Date().toISOString() },
    { onConflict: "symbol" },
  );
  return error ? { ok: false, message: error.message } : { ok: true, message: "valuation upserted" };
}
