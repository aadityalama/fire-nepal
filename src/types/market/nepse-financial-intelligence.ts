/**
 * Premium Financial Intelligence contracts for Company Details (Phase 3).
 * Every nullable field means the value is not published by any configured real
 * provider/table — the UI must render "Data unavailable". Values are never invented;
 * derived ratios (PE, PB, ROE, yield, CAGR) are computed only from real inputs.
 */

export type NepseQuarterlyReportRow = {
  fiscalYear: string;
  fiscalYearNepali: string | null;
  quarter: string;
  eps: number | null;
  pe: number | null;
  netProfitNpr: number | null;
  netWorthPerShareNpr: number | null;
  paidUpCapitalNpr: number | null;
  submittedDate: string | null;
  /** YoY vs the same quarter of the previous fiscal year — only when both real values exist. */
  yoyEpsPct: number | null;
  yoyProfitPct: number | null;
};

export type NepseAnnualReportRow = {
  fiscalYear: string;
  fiscalYearNepali: string | null;
  eps: number | null;
  pe: number | null;
  netProfitNpr: number | null;
  netWorthPerShareNpr: number | null;
  paidUpCapitalNpr: number | null;
  /** Provider does not publish these — merged from nepse_company_financials when ingested. */
  revenueNpr: number | null;
  assetsNpr: number | null;
  liabilitiesNpr: number | null;
  equityNpr: number | null;
  submittedDate: string | null;
  profitYoyPct: number | null;
};

export type NepseFinancialRatios = {
  eps: number | null;
  pe: number | null;
  pb: number | null;
  bookValuePerShareNpr: number | null;
  roePct: number | null;
  roaPct: number | null;
  netProfitMarginPct: number | null;
  operatingMarginPct: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  /** Period label of the report the ratios come from, e.g. "Q3 2025-2026". */
  asOfPeriod: string | null;
};

export type NepseDividendHistoryRow = {
  fiscalYear: string;
  cashPct: number | null;
  bonusPct: number | null;
  totalPct: number | null;
  announcementDate: string | null;
  bookCloseDate: string | null;
};

export type NepseDividendAnalytics = {
  rows: NepseDividendHistoryRow[];
  /** Rights share events from structured corporate actions (empty until ingested). */
  rightsEvents: { fiscalYear: string | null; title: string; date: string | null }[];
  /** Cash dividend of the latest FY as % of live price (face value NPR 100 convention). */
  cashYieldPct: number | null;
  totalYieldPct: number | null;
  dividendCagr5yPct: number | null;
  dividendCagr10yPct: number | null;
  /** Latest FY total dividend per share ÷ matching annual EPS. */
  payoutRatioPct: number | null;
  latestFiscalYear: string | null;
};

export type NepseShareholdingBreakdown = {
  promoterPct: number | null;
  publicPct: number | null;
  mutualFundsPct: number | null;
  institutionsPct: number | null;
  foreignPct: number | null;
  promoterShares: number | null;
  publicShares: number | null;
  listedShares: number | null;
};

export type NepsePeerRow = {
  symbol: string;
  companyName: string | null;
  isSelf: boolean;
  ltpNpr: number | null;
  marketCapNpr: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  roePct: number | null;
  dividendYieldPct: number | null;
  bookValuePerShareNpr: number | null;
};

export type NepseGrowthAnalytics = {
  revenueCagr5yPct: number | null;
  revenueCagr10yPct: number | null;
  epsCagr5yPct: number | null;
  epsCagr10yPct: number | null;
  profitCagr5yPct: number | null;
  profitCagr10yPct: number | null;
  netWorthPerShareCagr5yPct: number | null;
  assetCagr5yPct: number | null;
  /** Number of annual reports backing the CAGR math. */
  annualPeriods: number;
};

export type NepseFinancialIntelligencePayload = {
  symbol: string;
  sector: string | null;
  quarterly: NepseQuarterlyReportRow[];
  annual: NepseAnnualReportRow[];
  ratios: NepseFinancialRatios;
  dividends: NepseDividendAnalytics;
  shareholding: NepseShareholdingBreakdown;
  peers: NepsePeerRow[];
  growth: NepseGrowthAnalytics;
  sources: string[];
  loadedAt: string;
};
