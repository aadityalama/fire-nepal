import { computePb, computePe, deriveListedShares, deriveNetWorthTotal, deriveRoePct, sharePct } from "@/lib/market/nepse-fundamentals-format";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import {
  cagrPct,
  fiscalYearStart,
  getCompanyReportsBySymbol,
  getDividendHistoryBySymbol,
  getSecuritiesBySymbol,
  normalizeFiscalYear,
  pickLatestReport,
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

function sortReportsDesc(reports: ProviderReport[]): ProviderReport[] {
  return [...reports].sort((a, b) => {
    const yearDiff = (fiscalYearStart(b.fiscalYear) ?? 0) - (fiscalYearStart(a.fiscalYear) ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return quarterRank(b.quarter) - quarterRank(a.quarter);
  });
}

type DbStatementRow = {
  period_key?: unknown;
  period_type?: unknown;
  fiscal_year?: unknown;
  fiscal_year_nepali?: unknown;
  quarter?: unknown;
  period_label?: unknown;
  submitted_date?: unknown;
  revenue_npr?: unknown;
  operating_revenue_npr?: unknown;
  other_income_npr?: unknown;
  gross_profit_npr?: unknown;
  operating_profit_npr?: unknown;
  ebitda_npr?: unknown;
  ebit_npr?: unknown;
  net_profit_npr?: unknown;
  eps?: unknown;
  diluted_eps?: unknown;
  total_assets_npr?: unknown;
  current_assets_npr?: unknown;
  non_current_assets_npr?: unknown;
  cash_npr?: unknown;
  investments_npr?: unknown;
  inventories_npr?: unknown;
  receivables_npr?: unknown;
  total_equity_npr?: unknown;
  share_capital_npr?: unknown;
  reserves_npr?: unknown;
  retained_earnings_npr?: unknown;
  total_liabilities_npr?: unknown;
  current_liabilities_npr?: unknown;
  non_current_liabilities_npr?: unknown;
  borrowings_npr?: unknown;
  operating_cash_flow_npr?: unknown;
  investing_cash_flow_npr?: unknown;
  financing_cash_flow_npr?: unknown;
  free_cash_flow_npr?: unknown;
  net_cash_movement_npr?: unknown;
  paid_up_capital_npr?: unknown;
  pe?: unknown;
  net_worth_per_share_npr?: unknown;
};

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

function emptyFigures(): import("@/types/market/nepse-financial-intelligence").NepseStatementFigures {
  return {
    revenueNpr: null,
    operatingRevenueNpr: null,
    otherIncomeNpr: null,
    grossProfitNpr: null,
    operatingProfitNpr: null,
    ebitdaNpr: null,
    ebitNpr: null,
    netProfitNpr: null,
    eps: null,
    dilutedEps: null,
    totalAssetsNpr: null,
    currentAssetsNpr: null,
    nonCurrentAssetsNpr: null,
    cashNpr: null,
    investmentsNpr: null,
    inventoriesNpr: null,
    receivablesNpr: null,
    totalEquityNpr: null,
    shareCapitalNpr: null,
    reservesNpr: null,
    retainedEarningsNpr: null,
    totalLiabilitiesNpr: null,
    currentLiabilitiesNpr: null,
    nonCurrentLiabilitiesNpr: null,
    borrowingsNpr: null,
    operatingCashFlowNpr: null,
    investingCashFlowNpr: null,
    financingCashFlowNpr: null,
    freeCashFlowNpr: null,
    netCashMovementNpr: null,
  };
}

function figuresFromDb(row: DbStatementRow | null | undefined) {
  if (!row) return emptyFigures();
  return {
    revenueNpr: toNum(row.revenue_npr),
    operatingRevenueNpr: toNum(row.operating_revenue_npr),
    otherIncomeNpr: toNum(row.other_income_npr),
    grossProfitNpr: toNum(row.gross_profit_npr),
    operatingProfitNpr: toNum(row.operating_profit_npr),
    ebitdaNpr: toNum(row.ebitda_npr),
    ebitNpr: toNum(row.ebit_npr),
    netProfitNpr: toNum(row.net_profit_npr),
    eps: toNum(row.eps),
    dilutedEps: toNum(row.diluted_eps),
    totalAssetsNpr: toNum(row.total_assets_npr),
    currentAssetsNpr: toNum(row.current_assets_npr),
    nonCurrentAssetsNpr: toNum(row.non_current_assets_npr),
    cashNpr: toNum(row.cash_npr),
    investmentsNpr: toNum(row.investments_npr),
    inventoriesNpr: toNum(row.inventories_npr),
    receivablesNpr: toNum(row.receivables_npr),
    totalEquityNpr: toNum(row.total_equity_npr),
    shareCapitalNpr: toNum(row.share_capital_npr),
    reservesNpr: toNum(row.reserves_npr),
    retainedEarningsNpr: toNum(row.retained_earnings_npr),
    totalLiabilitiesNpr: toNum(row.total_liabilities_npr),
    currentLiabilitiesNpr: toNum(row.current_liabilities_npr),
    nonCurrentLiabilitiesNpr: toNum(row.non_current_liabilities_npr),
    borrowingsNpr: toNum(row.borrowings_npr),
    operatingCashFlowNpr: toNum(row.operating_cash_flow_npr),
    investingCashFlowNpr: toNum(row.investing_cash_flow_npr),
    financingCashFlowNpr: toNum(row.financing_cash_flow_npr),
    freeCashFlowNpr: toNum(row.free_cash_flow_npr),
    netCashMovementNpr: toNum(row.net_cash_movement_npr),
  };
}

function mergeFigures(
  base: ReturnType<typeof emptyFigures>,
  overlay: Partial<ReturnType<typeof emptyFigures>>,
) {
  const out = { ...base };
  for (const [key, value] of Object.entries(overlay) as [keyof typeof out, number | null][]) {
    if (value != null) out[key] = value;
  }
  return out;
}

function buildQuarterly(reports: ProviderReport[], dbStatements: DbStatementRow[]): NepseQuarterlyReportRow[] {
  const quarterly = sortReportsDesc(reports.filter((row) => row.type === "quarterly"));
  const byYearQuarter = new Map<string, ProviderReport>();
  for (const row of quarterly) {
    const key = `${fiscalYearStart(row.fiscalYear)}·${quarterRank(row.quarter)}`;
    if (!byYearQuarter.has(key)) byYearQuarter.set(key, row);
  }

  const dbByKey = new Map<string, DbStatementRow>();
  for (const row of dbStatements) {
    if (String(row.period_type ?? "") !== "quarterly") continue;
    const fy = typeof row.fiscal_year === "string" ? normalizeFiscalYear(row.fiscal_year) : "";
    const q = toNum(row.quarter);
    if (!fy || q == null) continue;
    dbByKey.set(`${fiscalYearStart(fy)}·${q}`, row);
  }

  const filingKeys = new Set(quarterly.map((row) => `${fiscalYearStart(row.fiscalYear)}·${quarterRank(row.quarter)}`));
  const dbOnly = [...dbByKey.entries()]
    .filter(([key]) => !filingKeys.has(key))
    .sort((a, b) => {
      const [ay, aq] = a[0].split("·").map(Number);
      const [by, bq] = b[0].split("·").map(Number);
      return by - ay || bq - aq;
    });

  const combined: { key: string; filing: ProviderReport | null; db: DbStatementRow | null }[] = [
    ...quarterly.map((filing) => {
      const key = `${fiscalYearStart(filing.fiscalYear)}·${quarterRank(filing.quarter)}`;
      return { key, filing, db: dbByKey.get(key) ?? null };
    }),
    ...dbOnly.map(([key, db]) => ({ key, filing: null as ProviderReport | null, db })),
  ];

  return combined.slice(0, 12).map(({ filing, db }) => {
    const figures = mergeFigures(figuresFromDb(db), {
      netProfitNpr: filing?.profitNpr ?? null,
      eps: filing?.eps ?? null,
    });
    const fiscalYear = filing?.fiscalYear ?? (typeof db?.fiscal_year === "string" ? db.fiscal_year : "");
    const quarterLabel = filing
      ? shortQuarterLabel(filing.quarter)
      : db?.quarter != null
        ? `Q${db.quarter}`
        : "";
    const prevKey = `${(fiscalYearStart(fiscalYear) ?? 0) - 1}·${filing ? quarterRank(filing.quarter) : toNum(db?.quarter) ?? 0}`;
    const prevFiling = byYearQuarter.get(prevKey);
    const prevDb = dbByKey.get(prevKey);
    const prevProfit = prevFiling?.profitNpr ?? toNum(prevDb?.net_profit_npr);
    const prevEps = prevFiling?.eps ?? toNum(prevDb?.eps);
    return {
      ...figures,
      fiscalYear,
      fiscalYearNepali: filing?.fiscalYearNepali ?? (typeof db?.fiscal_year_nepali === "string" ? db.fiscal_year_nepali : null),
      quarter: quarterLabel,
      pe: filing?.pe ?? toNum(db?.pe),
      netWorthPerShareNpr: filing?.netWorthPerShareNpr ?? toNum(db?.net_worth_per_share_npr),
      paidUpCapitalNpr: filing?.paidUpCapitalNpr ?? toNum(db?.paid_up_capital_npr),
      submittedDate: filing?.submittedDate ?? (typeof db?.submitted_date === "string" ? db.submitted_date : null),
      yoyEpsPct: pctChange(figures.eps, prevEps),
      yoyProfitPct: pctChange(figures.netProfitNpr, prevProfit),
    };
  });
}

function fyShort(fiscalYear: string): string {
  const match = fiscalYear.match(/^(\d{2})?(\d{2})[-/](\d{2})?(\d{2})$/);
  if (match) return `${match[2]}/${match[4]}`;
  return fiscalYear.length > 7 ? fiscalYear.slice(2) : fiscalYear;
}

function buildAnnual(
  reports: ProviderReport[],
  dbStatements: DbStatementRow[],
  dbFinancials: DbFinancialRow[],
): NepseAnnualReportRow[] {
  const annual = sortReportsDesc(reports.filter((row) => row.type === "annual"));
  const deduped: ProviderReport[] = [];
  const seen = new Set<string>();
  for (const row of annual) {
    if (seen.has(row.fiscalYear)) continue;
    seen.add(row.fiscalYear);
    deduped.push(row);
  }

  const dbByYear = new Map<string, DbStatementRow>();
  for (const row of dbStatements) {
    if (String(row.period_type ?? "") !== "annual") continue;
    const fy = typeof row.fiscal_year === "string" ? normalizeFiscalYear(row.fiscal_year) : null;
    if (fy) dbByYear.set(fy, row);
  }
  // Legacy annual table fallback when statements migration not yet filled.
  const legacyByYear = new Map<string, DbFinancialRow>();
  for (const row of dbFinancials) {
    const fy = typeof row.fiscal_year === "string" ? normalizeFiscalYear(row.fiscal_year) : null;
    if (fy) legacyByYear.set(fy, row);
  }

  const filingYears = new Set(deduped.map((row) => normalizeFiscalYear(row.fiscalYear)));
  const dbOnlyYears = [...new Set([...dbByYear.keys(), ...legacyByYear.keys()])]
    .filter((fy) => !filingYears.has(fy))
    .sort((a, b) => (fiscalYearStart(b) ?? 0) - (fiscalYearStart(a) ?? 0));

  const combinedSources: { fiscalYear: string; filing: ProviderReport | null; db: DbStatementRow | null; legacy: DbFinancialRow | null }[] = [
    ...deduped.map((filing) => ({
      fiscalYear: filing.fiscalYear,
      filing,
      db:
        dbByYear.get(normalizeFiscalYear(filing.fiscalYear)) ??
        (filing.fiscalYearNepali ? dbByYear.get(normalizeFiscalYear(filing.fiscalYearNepali)) : undefined) ??
        null,
      legacy:
        legacyByYear.get(normalizeFiscalYear(filing.fiscalYear)) ??
        (filing.fiscalYearNepali ? legacyByYear.get(normalizeFiscalYear(filing.fiscalYearNepali)) : undefined) ??
        null,
    })),
    ...dbOnlyYears.map((fy) => ({
      fiscalYear: fy,
      filing: null as ProviderReport | null,
      db: dbByYear.get(fy) ?? null,
      legacy: legacyByYear.get(fy) ?? null,
    })),
  ];

  const rows = combinedSources.slice(0, 10).map(({ fiscalYear, filing, db, legacy }) => {
    const listed = deriveListedShares(filing?.paidUpCapitalNpr ?? toNum(db?.paid_up_capital_npr), "Equity");
    const equityFromFiling = deriveNetWorthTotal(filing?.netWorthPerShareNpr ?? toNum(db?.net_worth_per_share_npr), listed);
    const figures = mergeFigures(
      mergeFigures(figuresFromDb(db), {
        revenueNpr: toNum(legacy?.revenue_npr),
        operatingProfitNpr: toNum(legacy?.operating_profit_npr),
        netProfitNpr: toNum(legacy?.net_profit_npr),
        totalAssetsNpr: toNum(legacy?.assets_npr),
        totalLiabilitiesNpr: toNum(legacy?.liabilities_npr),
        totalEquityNpr: toNum(legacy?.reserves_npr),
        cashNpr: toNum(legacy?.cash_npr),
        borrowingsNpr: toNum(legacy?.borrowings_npr),
        reservesNpr: toNum(legacy?.reserves_npr),
      }),
      {
        netProfitNpr: filing?.profitNpr ?? null,
        eps: filing?.eps ?? null,
      },
    );
    const equityNpr = figures.totalEquityNpr ?? figures.reservesNpr ?? equityFromFiling;
    return {
      ...figures,
      fiscalYear,
      fiscalYearNepali: filing?.fiscalYearNepali ?? (typeof db?.fiscal_year_nepali === "string" ? db.fiscal_year_nepali : null),
      pe: filing?.pe ?? toNum(db?.pe),
      netWorthPerShareNpr: filing?.netWorthPerShareNpr ?? toNum(db?.net_worth_per_share_npr),
      paidUpCapitalNpr: filing?.paidUpCapitalNpr ?? toNum(db?.paid_up_capital_npr) ?? figures.shareCapitalNpr,
      assetsNpr: figures.totalAssetsNpr,
      liabilitiesNpr: figures.totalLiabilitiesNpr,
      equityNpr,
      totalEquityNpr: equityNpr,
      submittedDate: filing?.submittedDate ?? (typeof db?.submitted_date === "string" ? db.submitted_date : null),
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
        line("operating_revenue", "Operating Revenue", pick((r) => r.operatingRevenueNpr)),
        line("other_income", "Other Income", pick((r) => r.otherIncomeNpr)),
        line("gross_profit", "Gross Profit", pick((r) => r.grossProfitNpr)),
        line("operating_profit", "Operating Profit", pick((r) => r.operatingProfitNpr)),
        line("ebitda", "EBITDA", pick((r) => r.ebitdaNpr)),
        line("ebit", "EBIT", pick((r) => r.ebitNpr)),
        line("net_profit", "Net Profit", pick((r) => r.netProfitNpr)),
        line("eps", "EPS", pick((r) => r.eps), "number"),
        line("diluted_eps", "Diluted EPS", pick((r) => r.dilutedEps), "number"),
      ],
    },
    {
      kind: "balance",
      title: "Balance Sheet",
      periods,
      lines: [
        line("assets", "Total Assets", pick((r) => r.totalAssetsNpr ?? r.assetsNpr)),
        line("current_assets", "Current Assets", pick((r) => r.currentAssetsNpr)),
        line("non_current_assets", "Non-current Assets", pick((r) => r.nonCurrentAssetsNpr)),
        line("cash", "Cash & Cash Equivalents", pick((r) => r.cashNpr)),
        line("investments", "Investments", pick((r) => r.investmentsNpr)),
        line("inventories", "Inventories", pick((r) => r.inventoriesNpr)),
        line("receivables", "Receivables", pick((r) => r.receivablesNpr)),
        line("equity", "Total Equity", pick((r) => r.totalEquityNpr ?? r.equityNpr)),
        line("share_capital", "Share Capital", pick((r) => r.shareCapitalNpr ?? r.paidUpCapitalNpr)),
        line("reserves", "Reserves", pick((r) => r.reservesNpr)),
        line("retained_earnings", "Retained Earnings", pick((r) => r.retainedEarningsNpr)),
        line("liabilities", "Total Liabilities", pick((r) => r.totalLiabilitiesNpr ?? r.liabilitiesNpr)),
        line("current_liabilities", "Current Liabilities", pick((r) => r.currentLiabilitiesNpr)),
        line("non_current_liabilities", "Non-current Liabilities", pick((r) => r.nonCurrentLiabilitiesNpr)),
        line("borrowings", "Borrowings", pick((r) => r.borrowingsNpr)),
      ],
    },
    {
      kind: "cashflow",
      title: "Cash Flow",
      periods,
      lines: [
        line("cfo", "Operating Cash Flow", pick((r) => r.operatingCashFlowNpr)),
        line("cfi", "Investing Cash Flow", pick((r) => r.investingCashFlowNpr)),
        line("cff", "Financing Cash Flow", pick((r) => r.financingCashFlowNpr)),
        line("fcf", "Free Cash Flow", pick((r) => r.freeCashFlowNpr)),
        line("net_cash", "Net Cash Movement", pick((r) => r.netCashMovementNpr)),
        line("cash", "Cash & Cash Equivalents", pick((r) => r.cashNpr)),
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
        line("revenue", "Revenue", pick((r) => r.revenueNpr)),
        line("operating_revenue", "Operating Revenue", pick((r) => r.operatingRevenueNpr)),
        line("other_income", "Other Income", pick((r) => r.otherIncomeNpr)),
        line("gross_profit", "Gross Profit", pick((r) => r.grossProfitNpr)),
        line("operating_profit", "Operating Profit", pick((r) => r.operatingProfitNpr)),
        line("ebitda", "EBITDA", pick((r) => r.ebitdaNpr)),
        line("ebit", "EBIT", pick((r) => r.ebitNpr)),
        line("net_profit", "Net Profit", pick((r) => r.netProfitNpr)),
        line("eps", "EPS", pick((r) => r.eps), "number"),
        line("diluted_eps", "Diluted EPS", pick((r) => r.dilutedEps), "number"),
      ],
    },
    {
      kind: "balance",
      title: "Balance Sheet",
      periods,
      lines: [
        line("assets", "Total Assets", pick((r) => r.totalAssetsNpr)),
        line("current_assets", "Current Assets", pick((r) => r.currentAssetsNpr)),
        line("non_current_assets", "Non-current Assets", pick((r) => r.nonCurrentAssetsNpr)),
        line("cash", "Cash & Cash Equivalents", pick((r) => r.cashNpr)),
        line("investments", "Investments", pick((r) => r.investmentsNpr)),
        line("inventories", "Inventories", pick((r) => r.inventoriesNpr)),
        line("receivables", "Receivables", pick((r) => r.receivablesNpr)),
        line("equity", "Total Equity", pick((r) => r.totalEquityNpr)),
        line("share_capital", "Share Capital", pick((r) => r.shareCapitalNpr ?? r.paidUpCapitalNpr)),
        line("reserves", "Reserves", pick((r) => r.reservesNpr)),
        line("retained_earnings", "Retained Earnings", pick((r) => r.retainedEarningsNpr)),
        line("liabilities", "Total Liabilities", pick((r) => r.totalLiabilitiesNpr)),
        line("current_liabilities", "Current Liabilities", pick((r) => r.currentLiabilitiesNpr)),
        line("non_current_liabilities", "Non-current Liabilities", pick((r) => r.nonCurrentLiabilitiesNpr)),
        line("borrowings", "Borrowings", pick((r) => r.borrowingsNpr)),
      ],
    },
    {
      kind: "cashflow",
      title: "Cash Flow",
      periods,
      lines: [
        line("cfo", "Operating Cash Flow", pick((r) => r.operatingCashFlowNpr)),
        line("cfi", "Investing Cash Flow", pick((r) => r.investingCashFlowNpr)),
        line("cff", "Financing Cash Flow", pick((r) => r.financingCashFlowNpr)),
        line("fcf", "Free Cash Flow", pick((r) => r.freeCashFlowNpr)),
        line("net_cash", "Net Cash Movement", pick((r) => r.netCashMovementNpr)),
        line("cash", "Cash & Cash Equivalents", pick((r) => r.cashNpr)),
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
  const equity = latestAnnual?.totalEquityNpr ?? latestAnnual?.equityNpr ?? null;
  const borrowings = latestAnnual?.borrowingsNpr ?? null;
  const assets = latestAnnual?.totalAssetsNpr ?? latestAnnual?.assetsNpr ?? null;

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
    currentRatio:
      latestAnnual?.currentAssetsNpr != null &&
      latestAnnual.currentLiabilitiesNpr != null &&
      latestAnnual.currentLiabilitiesNpr > 0
        ? latestAnnual.currentAssetsNpr / latestAnnual.currentLiabilitiesNpr
        : null,
    quickRatio:
      latestAnnual?.currentAssetsNpr != null &&
      latestAnnual.currentLiabilitiesNpr != null &&
      latestAnnual.currentLiabilitiesNpr > 0
        ? ((latestAnnual.currentAssetsNpr - (latestAnnual.inventoriesNpr ?? 0)) /
            latestAnnual.currentLiabilitiesNpr)
        : null,
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

function buildShareholding(profile: DbProfileRow | null, latest: ProviderReport | null, industry: string | null): NepseShareholdingBreakdown {
  let listed = toNum(profile?.listed_shares);
  const promoter = toNum(profile?.promoter_shares);
  const pub = toNum(profile?.public_shares);
  if (listed == null) {
    listed = deriveListedShares(latest?.paidUpCapitalNpr ?? null, industry);
  }
  return {
    promoterPct: sharePct(promoter, listed),
    publicPct: sharePct(pub, listed),
    // NEPSE publishes promoter/public only. Mutual-fund / institutional / foreign
    // splits are not in any configured official feed — never estimate them.
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
    assetCagr5yPct: cagrOf((row) => row.totalAssetsNpr ?? row.assetsNpr, 5),
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
  let dbStatements: DbStatementRow[] = [];
  let dbValuation: DbValuationRow | null = null;
  let dbProfile: DbProfileRow | null = null;
  let rightsRows: RightsEventRow[] = [];
  if (sb) {
    const [financialsRes, statementsRes, valuationRes, profileRes, rightsRes] = await Promise.all([
      sb
        .from("nepse_company_financials")
        .select("fiscal_year, revenue_npr, operating_profit_npr, net_profit_npr, assets_npr, liabilities_npr, reserves_npr, cash_npr, borrowings_npr")
        .eq("symbol", symbol)
        .limit(12),
      sb.from("nepse_company_statements").select("*").eq("symbol", symbol).limit(40),
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
    // Table may be absent until migration is applied — treat as empty, never fabricate.
    dbStatements =
      statementsRes.error && /nepse_company_statements|schema cache|does not exist/i.test(statementsRes.error.message)
        ? []
        : ((statementsRes.data as DbStatementRow[] | null) ?? []);
    dbValuation = (valuationRes.data as DbValuationRow | null) ?? null;
    dbProfile = (profileRes.data as DbProfileRow | null) ?? null;
    rightsRows = (rightsRes.data as RightsEventRow[] | null) ?? [];
  }

  const reports = reportsBySymbol.get(symbol) ?? [];
  const dividends = dividendsBySymbol.get(symbol) ?? [];
  const latest = pickLatestReport(reports);

  const quarterly = buildQuarterly(reports, dbStatements);
  const annual = buildAnnual(reports, dbStatements, dbFinancials);
  const quarterlyStatements = buildQuarterlyStatements(quarterly);
  const annualStatements = buildAnnualStatements(annual);
  const ratios = buildRatios(reports, annual, livePrice, dbValuation);
  const dividendAnalytics = await buildDividendAnalytics(symbol, dividends, annual, livePrice, rightsRows);
  const shareholding = buildShareholding(dbProfile, latest, securities.get(symbol)?.instrumentType ?? sector);
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
  if (dbStatements.length) sources.push("Official NEPSE fiscal reports + statement PDFs");
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
