import { computePb, computePe, sharePct } from "@/lib/market/nepse-fundamentals-format";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import {
  cagrPct,
  fiscalYearStart,
  getCompanyReportsBySymbol,
  getDividendHistoryBySymbol,
  getSecuritiesBySymbol,
  normalizeFiscalYear,
  quarterRank,
  shortQuarterLabel,
  type ProviderDividend,
  type ProviderReport,
} from "@/services/market/nepse-fundamentals-provider";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepseAnnualReportRow,
  NepseDividendAnalytics,
  NepseFinancialIntelligencePayload,
  NepseFinancialRatios,
  NepseGrowthAnalytics,
  NepsePeerRow,
  NepseQuarterlyReportRow,
  NepseShareholdingBreakdown,
  StatementBlock,
  StatementLine,
  StatementPeriod,
} from "@/types/market/nepse-financial-intelligence";

/**
 * Assemble the Financial Intelligence dashboard from real sources only:
 * - Yonepse company filings (quarterly/annual EPS, PE, profit, net worth per share)
 * - Yonepse dividend history (cash/bonus, all years)
 * - Live NEPSE bundle (price, market cap, sector) for derived ratios and peers
 * - Supabase fundamental tables when ingested (revenue/assets/ownership merge)
 * - EOD closes for historical dividend yield
 * Missing values stay null → UI renders "Data unavailable". Nothing is fabricated.
 */

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** ROE ≈ EPS ÷ book value per share — accounting identity on two real published inputs. */
function deriveRoePct(eps: number | null, bookValue: number | null): number | null {
  if (eps == null || bookValue == null || bookValue <= 0) return null;
  return (eps / bookValue) * 100;
}

function sortReportsDesc(reports: ProviderReport[]): ProviderReport[] {
  return [...reports].sort((a, b) => {
    const yearDiff = (fiscalYearStart(b.fiscalYear) ?? 0) - (fiscalYearStart(a.fiscalYear) ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return quarterRank(b.quarter) - quarterRank(a.quarter);
  });
}

function buildQuarterly(reports: ProviderReport[]): NepseQuarterlyReportRow[] {
  const quarterly = sortReportsDesc(reports.filter((row) => row.type === "quarterly"));
  const byYearQuarter = new Map<string, ProviderReport>();
  for (const row of quarterly) {
    const key = `${fiscalYearStart(row.fiscalYear)}·${quarterRank(row.quarter)}`;
    if (!byYearQuarter.has(key)) byYearQuarter.set(key, row);
  }
  return quarterly.slice(0, 12).map((row) => {
    const prevKey = `${(fiscalYearStart(row.fiscalYear) ?? 0) - 1}·${quarterRank(row.quarter)}`;
    const prev = byYearQuarter.get(prevKey);
    return {
      fiscalYear: row.fiscalYear,
      fiscalYearNepali: row.fiscalYearNepali,
      quarter: shortQuarterLabel(row.quarter),
      eps: row.eps,
      pe: row.pe,
      netProfitNpr: row.profitNpr,
      netWorthPerShareNpr: row.netWorthPerShareNpr,
      paidUpCapitalNpr: row.paidUpCapitalNpr,
      submittedDate: row.submittedDate,
      yoyEpsPct: pctChange(row.eps, prev?.eps ?? null),
      yoyProfitPct: pctChange(row.profitNpr, prev?.profitNpr ?? null),
    };
  });
}

type DbFinancialRow = {
  fiscal_year?: unknown;
  revenue_npr?: unknown;
  operating_profit_npr?: unknown;
  net_profit_npr?: unknown;
  assets_npr?: unknown;
  liabilities_npr?: unknown;
  reserves_npr?: unknown;
  cash_npr?: unknown;
  borrowings_npr?: unknown;
};

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function fyShort(fiscalYear: string): string {
  const match = fiscalYear.match(/^(\d{2})?(\d{2})[-/](\d{2})?(\d{2})$/);
  if (match) return `${match[2]}/${match[4]}`;
  return fiscalYear.length > 7 ? fiscalYear.slice(2) : fiscalYear;
}

function buildAnnual(reports: ProviderReport[], dbFinancials: DbFinancialRow[]): NepseAnnualReportRow[] {
  const annual = sortReportsDesc(reports.filter((row) => row.type === "annual"));
  const deduped: ProviderReport[] = [];
  const seen = new Set<string>();
  for (const row of annual) {
    if (seen.has(row.fiscalYear)) continue;
    seen.add(row.fiscalYear);
    deduped.push(row);
  }

  const dbByYear = new Map<string, DbFinancialRow>();
  for (const row of dbFinancials) {
    const fy = typeof row.fiscal_year === "string" ? normalizeFiscalYear(row.fiscal_year) : null;
    if (fy) dbByYear.set(fy, row);
  }

  // Prefer filing-backed years; also surface DB-only years so statement tables can fill.
  const filingYears = new Set(deduped.map((row) => normalizeFiscalYear(row.fiscalYear)));
  const dbOnlyYears = [...dbByYear.keys()]
    .filter((fy) => !filingYears.has(fy))
    .sort((a, b) => (fiscalYearStart(b) ?? 0) - (fiscalYearStart(a) ?? 0));

  const combinedSources: { fiscalYear: string; filing: ProviderReport | null; db: DbFinancialRow | null }[] = [
    ...deduped.map((filing) => ({
      fiscalYear: filing.fiscalYear,
      filing,
      db:
        dbByYear.get(normalizeFiscalYear(filing.fiscalYear)) ??
        (filing.fiscalYearNepali ? dbByYear.get(normalizeFiscalYear(filing.fiscalYearNepali)) : undefined) ??
        null,
    })),
    ...dbOnlyYears.map((fy) => ({ fiscalYear: fy, filing: null as ProviderReport | null, db: dbByYear.get(fy) ?? null })),
  ];

  const rows = combinedSources.slice(0, 10).map(({ fiscalYear, filing, db }) => {
    const netProfit = filing?.profitNpr ?? toNum(db?.net_profit_npr);
    return {
      fiscalYear,
      fiscalYearNepali: filing?.fiscalYearNepali ?? null,
      eps: filing?.eps ?? null,
      pe: filing?.pe ?? null,
      netProfitNpr: netProfit,
      netWorthPerShareNpr: filing?.netWorthPerShareNpr ?? null,
      paidUpCapitalNpr: filing?.paidUpCapitalNpr ?? null,
      revenueNpr: toNum(db?.revenue_npr),
      operatingProfitNpr: toNum(db?.operating_profit_npr),
      assetsNpr: toNum(db?.assets_npr),
      liabilitiesNpr: toNum(db?.liabilities_npr),
      equityNpr: toNum(db?.reserves_npr),
      cashNpr: toNum(db?.cash_npr),
      borrowingsNpr: toNum(db?.borrowings_npr),
      submittedDate: filing?.submittedDate ?? null,
      profitYoyPct: null as number | null,
      revenueYoyPct: null as number | null,
      epsYoyPct: null as number | null,
    };
  });

  for (let i = 0; i < rows.length; i++) {
    const prev = rows[i + 1];
    rows[i].profitYoyPct = pctChange(rows[i].netProfitNpr, prev?.netProfitNpr ?? null);
    rows[i].revenueYoyPct = pctChange(rows[i].revenueNpr, prev?.revenueNpr ?? null);
    rows[i].epsYoyPct = pctChange(rows[i].eps, prev?.eps ?? null);
  }
  return rows;
}

function line(id: string, label: string, values: (number | null)[], format: StatementLine["format"] = "compactNpr"): StatementLine {
  return { id, label, values, format };
}

function buildAnnualStatements(annual: NepseAnnualReportRow[]): StatementBlock[] {
  const periods: StatementPeriod[] = annual.map((row) => ({
    id: row.fiscalYear,
    label: fyShort(row.fiscalYear),
  }));
  if (!periods.length) return [];

  const pick = (getter: (row: NepseAnnualReportRow) => number | null) => annual.map(getter);

  return [
    {
      kind: "income",
      title: "Income Statement",
      periods,
      lines: [
        line("revenue", "Revenue", pick((r) => r.revenueNpr)),
        line("operating_profit", "Operating Profit", pick((r) => r.operatingProfitNpr)),
        line("net_profit", "Net Profit", pick((r) => r.netProfitNpr)),
        line("eps", "EPS", pick((r) => r.eps), "number"),
        line("paid_up", "Paid-up Capital", pick((r) => r.paidUpCapitalNpr)),
      ],
    },
    {
      kind: "balance",
      title: "Balance Sheet",
      periods,
      lines: [
        line("assets", "Total Assets", pick((r) => r.assetsNpr)),
        line("liabilities", "Total Liabilities", pick((r) => r.liabilitiesNpr)),
        line("equity", "Equity / Reserves", pick((r) => r.equityNpr)),
        line("borrowings", "Borrowings", pick((r) => r.borrowingsNpr)),
        line("net_worth", "Net Worth / Share", pick((r) => r.netWorthPerShareNpr), "npr"),
        line("paid_up", "Paid-up Capital", pick((r) => r.paidUpCapitalNpr)),
      ],
    },
    {
      kind: "cashflow",
      title: "Cash Flow",
      periods,
      lines: [
        line("cash", "Cash & Cash Equivalents", pick((r) => r.cashNpr)),
        // Full operating / investing / financing cash-flow lines are not published by configured feeds.
        line("cfo", "Cash from Operations", periods.map(() => null)),
        line("cfi", "Cash from Investing", periods.map(() => null)),
        line("cff", "Cash from Financing", periods.map(() => null)),
      ],
    },
  ];
}

function buildQuarterlyStatements(quarterly: NepseQuarterlyReportRow[]): StatementBlock[] {
  const periods: StatementPeriod[] = quarterly.map((row) => ({
    id: `${row.fiscalYear}-${row.quarter}`,
    label: `${row.quarter} ${fyShort(row.fiscalYear)}`,
  }));
  if (!periods.length) return [];

  const pick = (getter: (row: NepseQuarterlyReportRow) => number | null) => quarterly.map(getter);

  return [
    {
      kind: "income",
      title: "Income Statement",
      periods,
      lines: [
        line("revenue", "Revenue", periods.map(() => null)),
        line("operating_profit", "Operating Profit", periods.map(() => null)),
        line("net_profit", "Net Profit", pick((r) => r.netProfitNpr)),
        line("eps", "EPS", pick((r) => r.eps), "number"),
        line("paid_up", "Paid-up Capital", pick((r) => r.paidUpCapitalNpr)),
      ],
    },
    {
      kind: "balance",
      title: "Balance Sheet",
      periods,
      lines: [
        line("assets", "Total Assets", periods.map(() => null)),
        line("liabilities", "Total Liabilities", periods.map(() => null)),
        line("equity", "Equity / Reserves", periods.map(() => null)),
        line("net_worth", "Net Worth / Share", pick((r) => r.netWorthPerShareNpr), "npr"),
        line("paid_up", "Paid-up Capital", pick((r) => r.paidUpCapitalNpr)),
      ],
    },
    {
      kind: "cashflow",
      title: "Cash Flow",
      periods,
      lines: [
        line("cash", "Cash & Cash Equivalents", periods.map(() => null)),
        line("cfo", "Cash from Operations", periods.map(() => null)),
        line("cfi", "Cash from Investing", periods.map(() => null)),
        line("cff", "Cash from Financing", periods.map(() => null)),
      ],
    },
  ];
}

type DbValuationRow = {
  roa_pct?: unknown;
  roe_pct?: unknown;
};

function buildRatios(
  reports: ProviderReport[],
  annual: NepseAnnualReportRow[],
  livePrice: number | null,
  dbValuation: DbValuationRow | null,
): NepseFinancialRatios {
  const latest = sortReportsDesc(reports)[0] ?? null;
  const latestAnnual = annual[0] ?? null;
  const eps = latest?.eps ?? latestAnnual?.eps ?? null;
  const bookValue = latest?.netWorthPerShareNpr ?? latestAnnual?.netWorthPerShareNpr ?? null;
  const revenue = latestAnnual?.revenueNpr ?? null;
  const operatingProfit = latestAnnual?.operatingProfitNpr ?? null;
  const netProfit = latestAnnual?.netProfitNpr ?? latest?.profitNpr ?? null;
  const equity = latestAnnual?.equityNpr ?? null;
  const borrowings = latestAnnual?.borrowingsNpr ?? null;
  const assets = latestAnnual?.assetsNpr ?? null;

  return {
    eps,
    pe: computePe(livePrice, eps) ?? latest?.pe ?? null,
    pb: computePb(livePrice, bookValue),
    bookValuePerShareNpr: bookValue,
    revenueGrowthPct: latestAnnual?.revenueYoyPct ?? null,
    epsGrowthPct: latestAnnual?.epsYoyPct ?? null,
    roePct: toNum(dbValuation?.roe_pct) ?? deriveRoePct(eps, bookValue),
    roaPct:
      toNum(dbValuation?.roa_pct) ??
      (netProfit != null && assets != null && assets > 0 ? (netProfit / assets) * 100 : null),
    netProfitMarginPct: revenue != null && revenue > 0 && netProfit != null ? (netProfit / revenue) * 100 : null,
    operatingMarginPct: revenue != null && revenue > 0 && operatingProfit != null ? (operatingProfit / revenue) * 100 : null,
    debtToEquity: borrowings != null && equity != null && equity > 0 ? borrowings / equity : null,
    // Current / quick ratios need current assets & current liabilities — not published by configured feeds.
    currentRatio: null,
    quickRatio: null,
    asOfPeriod: latest
      ? latest.type === "annual"
        ? `FY ${latest.fiscalYear} (annual)`
        : `${shortQuarterLabel(latest.quarter)} ${latest.fiscalYear}`
      : latestAnnual
        ? `FY ${latestAnnual.fiscalYear}`
        : null,
  };
}

type RightsEventRow = { fiscal_year?: unknown; title?: unknown; action_date?: unknown };

async function loadCloseNearDates(
  symbol: string,
  dates: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const sb = createMarketDataServiceClient();
  const unique = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  if (!sb || !unique.length) return map;

  // Pull a generous window once, then nearest-prior close per date.
  const earliest = unique.slice().sort()[0];
  const { data } = await sb
    .from("nepse_eod_prices")
    .select("trade_date, close_npr")
    .eq("symbol", symbol)
    .gte("trade_date", earliest)
    .order("trade_date", { ascending: true })
    .limit(4000);

  const bars = ((data as { trade_date: string; close_npr: number | null }[] | null) ?? [])
    .map((row) => ({
      date: String(row.trade_date).slice(0, 10),
      close: toNum(row.close_npr),
    }))
    .filter((row) => row.close != null && row.close > 0) as { date: string; close: number }[];

  for (const target of unique) {
    let best: number | null = null;
    for (const bar of bars) {
      if (bar.date <= target) best = bar.close;
      else break;
    }
    if (best != null) map.set(target, best);
  }
  return map;
}

async function buildDividendAnalytics(
  symbol: string,
  dividends: ProviderDividend[],
  annual: NepseAnnualReportRow[],
  livePrice: number | null,
  rightsRows: RightsEventRow[],
): Promise<NepseDividendAnalytics> {
  const dateKeys = dividends
    .flatMap((row) => [row.bookCloseDate, row.announcementDate])
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10));
  const closes = await loadCloseNearDates(symbol, dateKeys);

  const rows = dividends.slice(0, 15).map((row) => {
    const totalPct =
      row.totalPct ?? (row.cashPct != null || row.bonusPct != null ? (row.cashPct ?? 0) + (row.bonusPct ?? 0) : null);
    const priceDate = (row.bookCloseDate ?? row.announcementDate)?.slice(0, 10) ?? null;
    const histPrice = priceDate ? closes.get(priceDate) ?? null : null;
    const priceForYield = histPrice ?? livePrice;
    return {
      fiscalYear: row.fiscalYear,
      cashPct: row.cashPct,
      bonusPct: row.bonusPct,
      totalPct,
      announcementDate: row.announcementDate,
      bookCloseDate: row.bookCloseDate,
      cashYieldPct: row.cashPct != null && priceForYield != null && priceForYield > 0 ? (row.cashPct / priceForYield) * 100 : null,
      totalYieldPct: totalPct != null && priceForYield != null && priceForYield > 0 ? (totalPct / priceForYield) * 100 : null,
    };
  });

  const latest = rows[0] ?? null;
  const byStartYear = new Map<number, number>();
  for (const row of rows) {
    const year = fiscalYearStart(row.fiscalYear);
    if (year != null && row.totalPct != null && !byStartYear.has(year)) byStartYear.set(year, row.totalPct);
  }
  const latestYear = latest ? fiscalYearStart(latest.fiscalYear) : null;
  const cagrOver = (span: number): number | null => {
    if (latestYear == null || latest?.totalPct == null) return null;
    const base = byStartYear.get(latestYear - span);
    return cagrPct(base ?? null, latest.totalPct, span);
  };

  let payoutRatioPct: number | null = null;
  if (latest?.totalPct != null) {
    const matchingAnnual = annual.find(
      (row) =>
        row.fiscalYearNepali != null &&
        normalizeFiscalYear(row.fiscalYearNepali) === normalizeFiscalYear(latest.fiscalYear),
    );
    const eps = matchingAnnual?.eps ?? null;
    if (eps != null && eps > 0) payoutRatioPct = (latest.totalPct / eps) * 100;
  }

  return {
    rows,
    bonusHistory: rows
      .filter((row): row is typeof row & { bonusPct: number } => row.bonusPct != null && row.bonusPct > 0)
      .map((row) => ({
        fiscalYear: row.fiscalYear,
        bonusPct: row.bonusPct,
        announcementDate: row.announcementDate,
        bookCloseDate: row.bookCloseDate,
      })),
    rightsEvents: rightsRows
      .map((row) => ({
        fiscalYear: typeof row.fiscal_year === "string" ? row.fiscal_year : null,
        title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Rights share",
        date: typeof row.action_date === "string" ? row.action_date : null,
      }))
      .slice(0, 10),
    yieldHistory: rows.map((row) => ({
      fiscalYear: row.fiscalYear,
      cashYieldPct: row.cashYieldPct,
      totalYieldPct: row.totalYieldPct,
    })),
    cashYieldPct: latest?.cashYieldPct ?? null,
    totalYieldPct: latest?.totalYieldPct ?? null,
    dividendCagr5yPct: cagrOver(5),
    dividendCagr10yPct: cagrOver(10),
    payoutRatioPct,
    latestFiscalYear: latest?.fiscalYear ?? null,
  };
}

type DbProfileRow = {
  promoter_shares?: unknown;
  public_shares?: unknown;
  listed_shares?: unknown;
};

function buildShareholding(profile: DbProfileRow | null): NepseShareholdingBreakdown {
  const promoter = toNum(profile?.promoter_shares);
  const pub = toNum(profile?.public_shares);
  const listed = toNum(profile?.listed_shares);
  return {
    promoterPct: sharePct(promoter, listed),
    publicPct: sharePct(pub, listed),
    // No configured real provider publishes these ownership splits yet.
    mutualFundsPct: null,
    institutionsPct: null,
    foreignPct: null,
    promoterShares: promoter,
    publicShares: pub,
    listedShares: listed,
  };
}

function buildGrowth(annual: NepseAnnualReportRow[]): NepseGrowthAnalytics {
  const byYear = new Map<number, NepseAnnualReportRow>();
  for (const row of annual) {
    const year = fiscalYearStart(row.fiscalYear);
    if (year != null && !byYear.has(year)) byYear.set(year, row);
  }
  const latestYear = annual.length ? fiscalYearStart(annual[0].fiscalYear) : null;

  const cagrOf = (pick: (row: NepseAnnualReportRow) => number | null, span: number): number | null => {
    if (latestYear == null) return null;
    const latest = byYear.get(latestYear);
    const base = byYear.get(latestYear - span);
    if (!latest || !base) return null;
    return cagrPct(pick(base), pick(latest), span);
  };

  return {
    revenueCagr5yPct: cagrOf((row) => row.revenueNpr, 5),
    revenueCagr10yPct: cagrOf((row) => row.revenueNpr, 10),
    epsCagr5yPct: cagrOf((row) => row.eps, 5),
    epsCagr10yPct: cagrOf((row) => row.eps, 10),
    profitCagr5yPct: cagrOf((row) => row.netProfitNpr, 5),
    profitCagr10yPct: cagrOf((row) => row.netProfitNpr, 10),
    netWorthPerShareCagr5yPct: cagrOf((row) => row.netWorthPerShareNpr, 5),
    assetCagr5yPct: cagrOf((row) => row.assetsNpr, 5),
    annualPeriods: annual.length,
  };
}

function livePriceOf(tick: NepseSecurityTick | undefined): number | null {
  if (!tick) return null;
  if (tick.ltpNpr > 0) return tick.ltpNpr;
  if (tick.previousCloseNpr != null && tick.previousCloseNpr > 0) return tick.previousCloseNpr;
  return null;
}

async function buildPeers(
  symbol: string,
  sector: string | null,
  bySymbol: Record<string, NepseSecurityTick>,
  reportsBySymbol: Map<string, ProviderReport[]>,
  dividendsBySymbol: Map<string, ProviderDividend[]>,
  securities: Map<string, { companyName: string | null }>,
): Promise<NepsePeerRow[]> {
  if (!sector) return [];
  const candidates = Object.values(bySymbol)
    .filter((tick) => tick.sector === sector && tick.symbol !== symbol)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 7);
  const self = bySymbol[symbol];
  const ordered = self ? [self, ...candidates] : candidates;

  return ordered.map((tick) => {
    const price = livePriceOf(tick);
    const latest = sortReportsDesc(reportsBySymbol.get(tick.symbol) ?? [])[0] ?? null;
    const eps = latest?.eps ?? null;
    const bookValue = latest?.netWorthPerShareNpr ?? null;
    const latestDividend = (dividendsBySymbol.get(tick.symbol) ?? [])[0] ?? null;
    const totalPct =
      latestDividend?.totalPct ??
      (latestDividend && (latestDividend.cashPct != null || latestDividend.bonusPct != null)
        ? (latestDividend.cashPct ?? 0) + (latestDividend.bonusPct ?? 0)
        : null);
    return {
      symbol: tick.symbol,
      companyName: securities.get(tick.symbol)?.companyName ?? tick.companyName ?? null,
      isSelf: tick.symbol === symbol,
      ltpNpr: price,
      marketCapNpr: tick.marketCap ?? null,
      pe: computePe(price, eps) ?? latest?.pe ?? null,
      pb: computePb(price, bookValue),
      eps,
      roePct: deriveRoePct(eps, bookValue),
      dividendYieldPct: totalPct != null && price != null && price > 0 ? (totalPct / price) * 100 : null,
      bookValuePerShareNpr: bookValue,
    };
  });
}

export async function loadFinancialIntelligence(symbolRaw: string): Promise<NepseFinancialIntelligencePayload> {
  const symbol = decodeURIComponent(symbolRaw).trim().toUpperCase();

  const [reportsBySymbol, dividendsBySymbol, securities, bundle] = await Promise.all([
    getCompanyReportsBySymbol().catch(() => new Map<string, ProviderReport[]>()),
    getDividendHistoryBySymbol().catch(() => new Map<string, ProviderDividend[]>()),
    getSecuritiesBySymbol().catch(() => new Map()),
    getCachedNepseYonepseBundle().catch(() => null),
  ]);

  const tick = bundle?.bySymbol[symbol];
  const livePrice = livePriceOf(tick);
  const sector = tick?.sector ?? securities.get(symbol)?.sector ?? null;

  const sb = createMarketDataServiceClient();
  let dbFinancials: DbFinancialRow[] = [];
  let dbValuation: DbValuationRow | null = null;
  let dbProfile: DbProfileRow | null = null;
  let rightsRows: RightsEventRow[] = [];
  if (sb) {
    const [financialsRes, valuationRes, profileRes, rightsRes] = await Promise.all([
      sb
        .from("nepse_company_financials")
        .select("fiscal_year, revenue_npr, operating_profit_npr, net_profit_npr, assets_npr, liabilities_npr, reserves_npr, cash_npr, borrowings_npr")
        .eq("symbol", symbol)
        .limit(12),
      sb.from("nepse_company_valuation").select("roe_pct, roa_pct").eq("symbol", symbol).maybeSingle(),
      sb.from("nepse_company_profiles").select("promoter_shares, public_shares, listed_shares").eq("symbol", symbol).maybeSingle(),
      sb
        .from("nepse_company_actions")
        .select("title, action_date")
        .eq("symbol", symbol)
        .eq("action_type", "rights")
        .order("action_date", { ascending: false, nullsFirst: false })
        .limit(10),
    ]);
    dbFinancials = (financialsRes.data as DbFinancialRow[] | null) ?? [];
    dbValuation = (valuationRes.data as DbValuationRow | null) ?? null;
    dbProfile = (profileRes.data as DbProfileRow | null) ?? null;
    rightsRows = (rightsRes.data as RightsEventRow[] | null) ?? [];
  }

  const reports = reportsBySymbol.get(symbol) ?? [];
  const dividends = dividendsBySymbol.get(symbol) ?? [];

  const quarterly = buildQuarterly(reports);
  const annual = buildAnnual(reports, dbFinancials);
  const quarterlyStatements = buildQuarterlyStatements(quarterly);
  const annualStatements = buildAnnualStatements(annual);
  const ratios = buildRatios(reports, annual, livePrice, dbValuation);
  const dividendAnalytics = await buildDividendAnalytics(symbol, dividends, annual, livePrice, rightsRows);
  const shareholding = buildShareholding(dbProfile);
  const growth = buildGrowth(annual);
  const peers = await buildPeers(
    symbol,
    sector,
    bundle?.bySymbol ?? {},
    reportsBySymbol,
    dividendsBySymbol,
    securities,
  );

  const sources: string[] = [];
  if (reports.length) sources.push("NEPSE company filings (Yonepse mirror)");
  if (dividends.length) sources.push("NEPSE dividend announcements (Yonepse mirror)");
  if (dbFinancials.length || dbProfile || dbValuation) sources.push("FIRE Nepal fundamental tables");
  if (dividendAnalytics.yieldHistory.some((row) => row.totalYieldPct != null)) sources.push("nepse_eod_prices (yield history)");

  return {
    symbol,
    sector,
    quarterly,
    annual,
    quarterlyStatements,
    annualStatements,
    ratios,
    dividends: dividendAnalytics,
    shareholding,
    peers,
    growth,
    sources,
    loadedAt: new Date().toISOString(),
  };
}
