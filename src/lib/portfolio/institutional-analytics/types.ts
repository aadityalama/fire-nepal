import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import type { NepseHoldingRow, NepsePortfolioSummary } from "@/components/portfolio/nepse-portfolio/nepse-portfolio-metrics";

export type EodCloseBar = {
  tradeDate: string;
  closeNpr: number;
};

export type IndexEodBar = {
  tradeDate: string;
  closeValue: number;
};

export type SymbolProfileContext = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  marketCapNpr: number | null;
  industry: string | null;
};

export type SymbolDividendContext = {
  symbol: string;
  fiscalYear: string;
  cashPct: number | null;
  bonusPct: number | null;
  bookCloseDate: string | null;
  agmDate: string | null;
};

export type LiveIndexTick = {
  indexKey: string;
  indexName: string;
  value: number | null;
  changePct: number | null;
};

export type PortfolioMarketContext = {
  eodBySymbol: Record<string, EodCloseBar[]>;
  profiles: Record<string, SymbolProfileContext>;
  dividends: Record<string, SymbolDividendContext[]>;
  indexEod: Record<string, { indexName: string; bars: IndexEodBar[] }>;
  liveIndices: LiveIndexTick[];
  loadedAt: string;
};

export type AllocationSlice = {
  key: string;
  label: string;
  valueNpr: number;
  weightPct: number;
};

export type EquityCurvePoint = {
  date: string;
  portfolioValueNpr: number;
  investedNpr: number;
  pnlNpr: number;
  drawdownPct: number;
};

export type PerformanceDashboard = {
  totalPortfolioValueNpr: number;
  totalInvestedNpr: number;
  unrealizedGainNpr: number;
  realizedGainNpr: number;
  totalReturnPct: number | null;
  xirrPct: number | null;
  cagrPct: number | null;
  annualizedReturnPct: number | null;
  dailyChangePct: number | null;
  dailyChangeNpr: number | null;
  weeklyChangePct: number | null;
  weeklyChangeNpr: number | null;
  monthlyChangePct: number | null;
  monthlyChangeNpr: number | null;
  yearlyChangePct: number | null;
  yearlyChangeNpr: number | null;
};

export type RiskAnalysis = {
  portfolioBeta: number | null;
  portfolioVolatilityPct: number | null;
  maximumDrawdownPct: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  diversificationScore: number | null;
  concentrationRiskPct: number | null;
  riskScore: number | null;
};

export type IncomeAnalytics = {
  dividendIncomeMonthlyNpr: number | null;
  dividendIncomeYearlyNpr: number | null;
  dividendYieldPct: number | null;
  yieldOnCostPct: number | null;
  upcomingDividends: {
    symbol: string;
    fiscalYear: string;
    bookCloseDate: string | null;
    cashPct: number | null;
    expectedCashNpr: number | null;
  }[];
  dividendContribution: { symbol: string; amountNpr: number; weightPct: number }[];
  monthlyHistory: { month: string; amountNpr: number }[];
  yearlyHistory: { year: string; amountNpr: number }[];
};

export type DeterministicIntelligence = {
  portfolioHealthScore: number | null;
  diversificationScore: number | null;
  riskSummary: string;
  sectorConcentration: string;
  topPerforming: { symbol: string; returnPct: number | null; pnlNpr: number }[];
  worstPerforming: { symbol: string; returnPct: number | null; pnlNpr: number }[];
  strengths: string[];
  weaknesses: string[];
  suggestedRebalancing: string[];
  dividendOpportunities: string[];
  valueOpportunities: string[];
  growthOpportunities: string[];
};

export type ScenarioAssumptions = {
  bullReturnPct: number;
  baseReturnPct: number;
  bearReturnPct: number;
  inflationPct: number;
  crashLevelsPct: number[];
  recoveryHorizonYears: number;
  note: string;
};

export type ScenarioAnalysis = {
  assumptions: ScenarioAssumptions;
  bullValueNpr: number;
  baseValueNpr: number;
  bearValueNpr: number;
  inflationImpactNpr: number;
  crashImpacts: { dropPct: number; valueNpr: number; lossNpr: number }[];
  recoveryValues: { afterYears: number; fromCrashPct: number; valueNpr: number }[];
};

export type BenchmarkComparison = {
  label: string;
  indexKey: string;
  indexReturnPct: number | null;
  portfolioReturnPct: number | null;
  relativeReturnPct: number | null;
  alphaPct: number | null;
  outperformance: boolean | null;
  status: "ok" | "unavailable";
  message?: string;
};

/** Why a history-dependent metric/chart is unavailable (never fabricated). */
export type AnalyticsHistoryCoverage = {
  equityPointCount: number;
  dailyReturnCount: number;
  synthesizedBuyCount: number;
  missingEodSymbols: string[];
  hasMarketContext: boolean;
  /** Shared copy for Sharpe / Sortino / Beta when history is too short. */
  needMoreHistoryMessage: string;
  /** Shared copy for performance charts when <2 equity points. */
  chartsUnavailableMessage: string;
  riskUnavailable: {
    portfolioBeta: string | null;
    portfolioVolatilityPct: string | null;
    maximumDrawdownPct: string | null;
    sharpeRatio: string | null;
    sortinoRatio: string | null;
    riskScore: string | null;
  };
};

export type InstitutionalPortfolioAnalytics = {
  asOf: string;
  performance: PerformanceDashboard;
  allocation: {
    sector: AllocationSlice[];
    company: AllocationSlice[];
    marketCap: AllocationSlice[];
    assetClass: AllocationSlice[];
    topConcentrationPct: number | null;
    herfindahl: number | null;
  };
  risk: RiskAnalysis;
  charts: {
    growth: EquityCurvePoint[];
    investedVsCurrent: { date: string; investedNpr: number; currentNpr: number }[];
    pnlHistory: { date: string; pnlNpr: number }[];
    dailyEquity: EquityCurvePoint[];
    drawdown: { date: string; drawdownPct: number }[];
    dividendIncome: { period: string; amountNpr: number }[];
  };
  income: IncomeAnalytics;
  intelligence: DeterministicIntelligence;
  scenarios: ScenarioAnalysis;
  benchmarks: BenchmarkComparison[];
  history: AnalyticsHistoryCoverage;
};

export type BuildAnalyticsInput = {
  summary: NepsePortfolioSummary;
  holdings: NepseHoldingRow[];
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
  market: PortfolioMarketContext | null;
  todayIso?: string;
};
