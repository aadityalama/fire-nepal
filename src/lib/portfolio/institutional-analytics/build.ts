import { annualizedCagrFraction } from "@/components/portfolio/holding-stats";
import { faceValueNpr } from "@/lib/market/nepse-fundamentals-format";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";
import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import { missingEodSymbols, resolveAnalyticsLedger } from "./analytics-ledger";
import {
  buildEquityCurve,
  changeOverLookback,
  dailyReturnsFromCurve,
} from "./equity-curve";
import {
  clamp,
  computeXirr,
  daysBetweenIso,
  linearRegressionBeta,
  maxDrawdownPct,
  mean,
  pctChange,
  sampleStdev,
  sharpeFromDailyReturns,
  sortinoFromDailyReturns,
} from "./math";
import type {
  AllocationSlice,
  AnalyticsHistoryCoverage,
  BenchmarkComparison,
  BuildAnalyticsInput,
  DeterministicIntelligence,
  IncomeAnalytics,
  InstitutionalPortfolioAnalytics,
  PerformanceDashboard,
  RiskAnalysis,
  ScenarioAnalysis,
  SymbolDividendContext,
} from "./types";

export const NEED_MORE_HISTORY =
  "Need more historical portfolio data to calculate this metric.";
export const NEED_PURCHASE_HISTORY =
  "Add purchase dates or buy transactions so a portfolio equity curve can be rebuilt.";
export const NEED_MARKET_CONTEXT =
  "Published EOD market history is still loading or unavailable.";

const MIN_RATIO_RETURNS = 20;

function weightSlices(raw: Map<string, number>, total: number): AllocationSlice[] {
  if (total <= 0) return [];
  return [...raw.entries()]
    .filter(([, v]) => v > 0)
    .map(([key, valueNpr]) => ({
      key,
      label: key,
      valueNpr,
      weightPct: (valueNpr / total) * 100,
    }))
    .sort((a, b) => b.valueNpr - a.valueNpr);
}

function marketCapBucket(cap: number | null): string {
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return "Unclassified";
  // NPR thresholds from published market caps (crore-scale common on NEPSE feeds).
  if (cap >= 50_000_000_000) return "Large cap";
  if (cap >= 10_000_000_000) return "Mid cap";
  return "Small cap";
}

function assetClassForHolding(rowId: string, instrumentKey: string | undefined, kind: string): string {
  const inst = instrumentKey ? getInstrumentByKey(instrumentKey) : null;
  if (inst?.universe === "closed_end_mf" || inst?.universe === "open_end_mf") return "Mutual funds";
  if (inst?.universe === "nepse" || kind === "nepse") return "NEPSE equities";
  if (kind === "sip") return "SIP / funds";
  if (kind === "us_stock" || kind === "etf") return "Global equities";
  if (kind === "crypto") return "Crypto";
  void rowId;
  return "Other";
}

function buildAllocation(input: BuildAnalyticsInput) {
  const total = input.summary.portfolioValueNpr;
  const sector = new Map<string, number>();
  const company = new Map<string, number>();
  const marketCap = new Map<string, number>();
  const assetClass = new Map<string, number>();
  const profiles = input.market?.profiles ?? {};

  for (const h of input.holdings) {
    if (h.liveNpr <= 0) continue;
    const profile = profiles[h.symbol];
    const sectorLabel = profile?.sector?.trim() || "Unclassified";
    sector.set(sectorLabel, (sector.get(sectorLabel) ?? 0) + h.liveNpr);
    company.set(h.symbol, (company.get(h.symbol) ?? 0) + h.liveNpr);
    const capBucket = marketCapBucket(profile?.marketCapNpr ?? null);
    marketCap.set(capBucket, (marketCap.get(capBucket) ?? 0) + h.liveNpr);
    const ac = assetClassForHolding(h.row.id, h.row.instrumentKey, h.row.kind);
    assetClass.set(ac, (assetClass.get(ac) ?? 0) + h.liveNpr);
  }

  const companySlices = weightSlices(company, total);
  const topConcentrationPct = companySlices[0]?.weightPct ?? null;
  const herfindahl =
    companySlices.length > 0
      ? companySlices.reduce((sum, s) => sum + (s.weightPct / 100) ** 2, 0)
      : null;

  return {
    sector: weightSlices(sector, total),
    company: companySlices,
    marketCap: weightSlices(marketCap, total),
    assetClass: weightSlices(assetClass, total),
    topConcentrationPct,
    herfindahl,
  };
}

function buildXirrCashflows(
  ledger: readonly PortfolioLedgerEntry[],
  holdingsRowIds: Set<string>,
  terminalValueNpr: number,
  asOf: string,
): { date: string; amount: number }[] {
  const flows: { date: string; amount: number }[] = [];
  for (const e of ledger) {
    if (e.bucket !== "investment" || !holdingsRowIds.has(e.rowId)) continue;
    if (e.txType === "buy" || e.txType === "right_share") {
      const amount = -(e.quantity * e.unitPrice + (e.fees ?? 0));
      if (amount !== 0) flows.push({ date: e.tradeDate, amount });
    } else if (e.txType === "sell") {
      const amount = e.quantity * e.unitPrice - (e.fees ?? 0);
      if (amount !== 0) flows.push({ date: e.tradeDate, amount });
    } else if (e.txType === "cash_dividend") {
      const amount = e.quantity * (e.unitPrice || 1);
      if (amount !== 0) flows.push({ date: e.tradeDate, amount });
    }
  }
  if (terminalValueNpr > 0) flows.push({ date: asOf, amount: terminalValueNpr });
  return flows;
}

function earliestPurchaseDate(ledger: readonly PortfolioLedgerEntry[], rowIds: Set<string>): string | null {
  let min: string | null = null;
  for (const e of ledger) {
    if (e.bucket !== "investment" || !rowIds.has(e.rowId)) continue;
    if (e.txType !== "buy" && e.txType !== "right_share") continue;
    if (!min || e.tradeDate < min) min = e.tradeDate;
  }
  return min;
}

function buildPerformance(
  input: BuildAnalyticsInput,
  curve: ReturnType<typeof buildEquityCurve>,
  analyticsLedger: readonly PortfolioLedgerEntry[],
): PerformanceDashboard {
  const s = input.summary;
  const asOf = input.todayIso ?? new Date().toISOString().slice(0, 10);
  const rowIds = new Set(input.holdings.map((h) => h.row.id));
  const xirr = computeXirr(buildXirrCashflows(analyticsLedger, rowIds, s.portfolioValueNpr, asOf));
  const start = earliestPurchaseDate(analyticsLedger, rowIds);
  const days = start ? daysBetweenIso(start, asOf) : null;
  const cagrFrac =
    days != null && days >= 30 && s.costNpr > 0
      ? annualizedCagrFraction(s.costNpr, s.portfolioValueNpr, days)
      : null;

  const daily = changeOverLookback(curve, 1);
  const weekly = changeOverLookback(curve, 7);
  const monthly = changeOverLookback(curve, 30);
  const yearly = changeOverLookback(curve, 365);

  // Prefer live session day change when available; fall back to equity curve.
  const dailyChangeNpr = s.todayGainPct != null ? s.todayGainNpr : daily?.changeNpr ?? null;
  const dailyChangePct = s.todayGainPct != null ? s.todayGainPct : daily?.changePct ?? null;

  return {
    totalPortfolioValueNpr: s.portfolioValueNpr,
    totalInvestedNpr: s.costNpr,
    unrealizedGainNpr: s.unrealizedGainNpr,
    realizedGainNpr: s.realizedGainNpr,
    totalReturnPct: s.portfolioReturnPct,
    xirrPct: xirr != null ? xirr * 100 : null,
    cagrPct: cagrFrac != null ? cagrFrac * 100 : null,
    annualizedReturnPct: cagrFrac != null ? cagrFrac * 100 : xirr != null ? xirr * 100 : null,
    dailyChangePct,
    dailyChangeNpr,
    weeklyChangePct: weekly?.changePct ?? null,
    weeklyChangeNpr: weekly?.changeNpr ?? null,
    monthlyChangePct: monthly?.changePct ?? null,
    monthlyChangeNpr: monthly?.changeNpr ?? null,
    yearlyChangePct: yearly?.changePct ?? null,
    yearlyChangeNpr: yearly?.changeNpr ?? null,
  };
}

function diversificationFromWeights(weights: number[]): number | null {
  if (!weights.length) return null;
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  // 1 holding → 0, equal N → approaches 100
  const n = weights.length;
  const minHhi = 1 / n;
  const score = ((1 - hhi) / (1 - minHhi)) * 100;
  return clamp(score, 0, 100);
}

function buildRisk(
  allocation: ReturnType<typeof buildAllocation>,
  curve: ReturnType<typeof buildEquityCurve>,
  alignedBench: { asset: number[]; bench: number[] } | null,
): RiskAnalysis {
  const daily = dailyReturnsFromCurve(curve);
  const volDaily = sampleStdev(daily);
  const volAnn = volDaily != null ? volDaily * Math.sqrt(252) * 100 : null;
  const mdd = maxDrawdownPct(curve.map((p) => p.portfolioValueNpr));
  const sharpe = sharpeFromDailyReturns(daily);
  const sortino = sortinoFromDailyReturns(daily);
  const weights = allocation.company.map((s) => s.weightPct / 100);
  const diversificationScore = diversificationFromWeights(weights);
  const concentrationRiskPct = allocation.topConcentrationPct;
  const beta =
    alignedBench && alignedBench.asset.length >= 20
      ? linearRegressionBeta(alignedBench.asset, alignedBench.bench)
      : null;

  // Risk score 0–100 from concentration, vol, drawdown (deterministic).
  let riskScore: number | null = null;
  const parts: number[] = [];
  if (concentrationRiskPct != null) parts.push(clamp(concentrationRiskPct, 0, 100));
  if (volAnn != null) parts.push(clamp(volAnn * 2, 0, 100));
  if (mdd != null) parts.push(clamp(mdd * 1.5, 0, 100));
  if (parts.length >= 2) riskScore = Math.round(mean(parts)!);

  return {
    portfolioBeta: beta,
    portfolioVolatilityPct: volAnn,
    maximumDrawdownPct: mdd,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    diversificationScore,
    concentrationRiskPct,
    riskScore,
  };
}

function cashDividendAmount(e: PortfolioLedgerEntry): number {
  return e.quantity * (e.unitPrice || 1);
}

function buildIncome(input: BuildAnalyticsInput): IncomeAnalytics {
  const asOf = input.todayIso ?? new Date().toISOString().slice(0, 10);
  const year = asOf.slice(0, 4);
  const month = asOf.slice(0, 7);
  const rowIds = new Set(input.holdings.map((h) => h.row.id));
  const symbolByRow = new Map(input.holdings.map((h) => [h.row.id, h.symbol]));

  const monthlyMap = new Map<string, number>();
  const yearlyMap = new Map<string, number>();
  const byCompany = new Map<string, number>();
  let yearTotal = 0;
  let monthTotal = 0;

  for (const e of input.ledger) {
    if (e.bucket !== "investment" || e.txType !== "cash_dividend" || !rowIds.has(e.rowId)) continue;
    const amount = cashDividendAmount(e);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const ym = e.tradeDate.slice(0, 7);
    const yy = e.tradeDate.slice(0, 4);
    monthlyMap.set(ym, (monthlyMap.get(ym) ?? 0) + amount);
    yearlyMap.set(yy, (yearlyMap.get(yy) ?? 0) + amount);
    const sym = symbolByRow.get(e.rowId) ?? "—";
    byCompany.set(sym, (byCompany.get(sym) ?? 0) + amount);
    if (yy === year) yearTotal += amount;
    if (ym === month) monthTotal += amount;
  }

  const totalDiv = [...byCompany.values()].reduce((a, b) => a + b, 0);
  const dividendContribution = [...byCompany.entries()]
    .map(([symbol, amountNpr]) => ({
      symbol,
      amountNpr,
      weightPct: totalDiv > 0 ? (amountNpr / totalDiv) * 100 : 0,
    }))
    .sort((a, b) => b.amountNpr - a.amountNpr);

  // Expected cash from latest published cash_pct × face × open units.
  const upcoming: IncomeAnalytics["upcomingDividends"] = [];
  let expectedAnnualFromPublished = 0;
  let expectedKnown = false;
  for (const h of input.holdings) {
    if (h.currentUnits <= 0) continue;
    const rows = input.market?.dividends[h.symbol] ?? [];
    const latest = pickLatestDividend(rows);
    if (!latest || latest.cashPct == null) continue;
    const face = faceValueNpr(input.market?.profiles[h.symbol]?.industry);
    const perShare = (latest.cashPct / 100) * face;
    const expected = perShare * h.currentUnits;
    expectedAnnualFromPublished += expected;
    expectedKnown = true;
    const upcomingDate = latest.bookCloseDate;
    if (upcomingDate && upcomingDate >= asOf) {
      upcoming.push({
        symbol: h.symbol,
        fiscalYear: latest.fiscalYear,
        bookCloseDate: upcomingDate,
        cashPct: latest.cashPct,
        expectedCashNpr: expected,
      });
    }
  }
  upcoming.sort((a, b) => (a.bookCloseDate ?? "").localeCompare(b.bookCloseDate ?? ""));

  const portfolioValue = input.summary.portfolioValueNpr;
  const cost = input.summary.costNpr;
  const dividendYieldPct =
    expectedKnown && portfolioValue > 0 ? (expectedAnnualFromPublished / portfolioValue) * 100 : null;
  const yieldOnCostPct = expectedKnown && cost > 0 ? (expectedAnnualFromPublished / cost) * 100 : null;

  return {
    dividendIncomeMonthlyNpr: monthTotal > 0 || monthlyMap.has(month) ? monthTotal : monthTotal === 0 && input.holdings.length ? 0 : null,
    dividendIncomeYearlyNpr: yearTotal > 0 || yearlyMap.has(year) ? yearTotal : yearTotal === 0 && input.holdings.length ? 0 : null,
    dividendYieldPct,
    yieldOnCostPct,
    upcomingDividends: upcoming,
    dividendContribution,
    monthlyHistory: [...monthlyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, amountNpr]) => ({ month: monthKey, amountNpr })),
    yearlyHistory: [...yearlyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([yearKey, amountNpr]) => ({ year: yearKey, amountNpr })),
  };
}

function pickLatestDividend(rows: SymbolDividendContext[]): SymbolDividendContext | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const da = a.bookCloseDate ?? a.fiscalYear;
    const db = b.bookCloseDate ?? b.fiscalYear;
    return db.localeCompare(da);
  })[0]!;
}

function buildIntelligence(
  input: BuildAnalyticsInput,
  allocation: ReturnType<typeof buildAllocation>,
  risk: RiskAnalysis,
  income: IncomeAnalytics,
  performance: PerformanceDashboard,
): DeterministicIntelligence {
  const holdings = input.holdings.filter((h) => h.currentUnits > 0 || h.liveNpr > 0);
  const ranked = holdings
    .map((h) => ({
      symbol: h.symbol,
      returnPct: h.costNpr > 0 ? (h.pnlNpr / h.costNpr) * 100 : null,
      pnlNpr: h.pnlNpr,
    }))
    .sort((a, b) => (b.returnPct ?? -Infinity) - (a.returnPct ?? -Infinity));

  const topPerforming = ranked.filter((r) => (r.returnPct ?? 0) > 0).slice(0, 5);
  const worstPerforming = [...ranked].reverse().filter((r) => (r.returnPct ?? 0) < 0).slice(0, 5);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestedRebalancing: string[] = [];
  const dividendOpportunities: string[] = [];
  const valueOpportunities: string[] = [];
  const growthOpportunities: string[] = [];

  if ((risk.diversificationScore ?? 0) >= 60) {
    strengths.push(`Diversification score ${risk.diversificationScore!.toFixed(0)}/100 from current holding weights.`);
  } else if (risk.diversificationScore != null) {
    weaknesses.push(`Diversification score ${risk.diversificationScore.toFixed(0)}/100 — portfolio is concentrated.`);
  }

  if ((allocation.topConcentrationPct ?? 0) >= 40) {
    const top = allocation.company[0];
    weaknesses.push(
      `Top holding ${top?.label ?? "—"} is ${(allocation.topConcentrationPct ?? 0).toFixed(1)}% of portfolio value.`,
    );
    if (top) {
      suggestedRebalancing.push(
        `Reduce ${top.label} toward ≤25% of portfolio (currently ${top.weightPct.toFixed(1)}%) using future contributions.`,
      );
    }
  } else if (allocation.topConcentrationPct != null) {
    strengths.push(`Top-name concentration is ${allocation.topConcentrationPct.toFixed(1)}% — within a moderate band.`);
  }

  if ((performance.totalReturnPct ?? 0) > 0) {
    strengths.push(`Unrealized portfolio return ${performance.totalReturnPct!.toFixed(1)}% on invested cost.`);
  } else if (performance.totalReturnPct != null && performance.totalReturnPct < 0) {
    weaknesses.push(`Portfolio is down ${performance.totalReturnPct.toFixed(1)}% vs invested cost.`);
  }

  if ((income.dividendYieldPct ?? 0) >= 3) {
    strengths.push(`Published dividend yield on current value ≈ ${income.dividendYieldPct!.toFixed(1)}%.`);
  }

  const sectorTop = allocation.sector[0];
  const sectorConcentration =
    sectorTop != null
      ? `${sectorTop.label} ${sectorTop.weightPct.toFixed(1)}% of portfolio`
      : DATA_UNAVAILABLE;

  if (sectorTop && sectorTop.weightPct >= 50) {
    weaknesses.push(`Sector concentration: ${sectorConcentration}.`);
    suggestedRebalancing.push(`Add names outside ${sectorTop.label} to cut sector weight below 40%.`);
  }

  // Dividend / value / growth from published profile fields only.
  for (const h of holdings) {
    const divs = input.market?.dividends[h.symbol] ?? [];
    const latest = pickLatestDividend(divs);
    const returnPct = h.costNpr > 0 ? (h.pnlNpr / h.costNpr) * 100 : null;
    if (latest?.cashPct != null && latest.cashPct >= 15 && (income.dividendContribution.find((d) => d.symbol === h.symbol)?.weightPct ?? 0) < 20) {
      dividendOpportunities.push(`${h.symbol}: latest published cash dividend ${latest.cashPct}% (FY ${latest.fiscalYear}).`);
    }
    if (returnPct != null && returnPct < -15) {
      valueOpportunities.push(`${h.symbol}: trading ${returnPct.toFixed(1)}% below your cost basis.`);
    }
    if (returnPct != null && returnPct > 25) {
      growthOpportunities.push(`${h.symbol}: +${returnPct.toFixed(1)}% vs cost — leading contributor.`);
    }
  }

  if (!dividendOpportunities.length) dividendOpportunities.push(DATA_UNAVAILABLE);
  if (!valueOpportunities.length) valueOpportunities.push(DATA_UNAVAILABLE);
  if (!growthOpportunities.length) growthOpportunities.push(DATA_UNAVAILABLE);
  if (!suggestedRebalancing.length) suggestedRebalancing.push("No rebalancing signal from concentration rules.");
  if (!strengths.length) strengths.push(DATA_UNAVAILABLE);
  if (!weaknesses.length) weaknesses.push(DATA_UNAVAILABLE);

  const healthParts: number[] = [];
  if (risk.diversificationScore != null) healthParts.push(risk.diversificationScore);
  if (performance.totalReturnPct != null) healthParts.push(clamp(50 + performance.totalReturnPct, 0, 100));
  if (risk.riskScore != null) healthParts.push(100 - risk.riskScore);
  if (income.dividendYieldPct != null) healthParts.push(clamp(income.dividendYieldPct * 10, 0, 100));
  const portfolioHealthScore = healthParts.length >= 2 ? Math.round(mean(healthParts)!) : null;

  const riskSummary =
    risk.riskScore == null
      ? DATA_UNAVAILABLE
      : risk.riskScore >= 70
        ? `Elevated risk (${risk.riskScore}/100) from volatility and/or concentration.`
        : risk.riskScore >= 40
          ? `Moderate risk (${risk.riskScore}/100) based on holdings and history.`
          : `Contained risk (${risk.riskScore}/100) from current weights and drawdown history.`;

  return {
    portfolioHealthScore,
    diversificationScore: risk.diversificationScore,
    riskSummary,
    sectorConcentration,
    topPerforming: topPerforming.length ? topPerforming : [],
    worstPerforming: worstPerforming.length ? worstPerforming : [],
    strengths,
    weaknesses,
    suggestedRebalancing,
    dividendOpportunities,
    valueOpportunities,
    growthOpportunities,
  };
}

function buildScenarios(portfolioValueNpr: number): ScenarioAnalysis {
  const assumptions = {
    bullReturnPct: 20,
    baseReturnPct: 8,
    bearReturnPct: -15,
    inflationPct: 6,
    crashLevelsPct: [10, 20, 30],
    recoveryHorizonYears: 3,
    note: "Scenarios apply fixed percentage shocks to current holdings value only. They are illustrative assumptions, not forecasts or fabricated history.",
  };
  const crashImpacts = assumptions.crashLevelsPct.map((dropPct) => {
    const valueNpr = portfolioValueNpr * (1 - dropPct / 100);
    return { dropPct, valueNpr, lossNpr: portfolioValueNpr - valueNpr };
  });
  const recoveryValues = assumptions.crashLevelsPct.map((fromCrashPct) => {
    const crashed = portfolioValueNpr * (1 - fromCrashPct / 100);
    // Recover at base assumption compounded for horizon years.
    const valueNpr = crashed * Math.pow(1 + assumptions.baseReturnPct / 100, assumptions.recoveryHorizonYears);
    return { afterYears: assumptions.recoveryHorizonYears, fromCrashPct, valueNpr };
  });

  return {
    assumptions,
    bullValueNpr: portfolioValueNpr * (1 + assumptions.bullReturnPct / 100),
    baseValueNpr: portfolioValueNpr * (1 + assumptions.baseReturnPct / 100),
    bearValueNpr: portfolioValueNpr * (1 + assumptions.bearReturnPct / 100),
    inflationImpactNpr: portfolioValueNpr * (1 - assumptions.inflationPct / 100),
    crashImpacts,
    recoveryValues,
  };
}

/**
 * Pair portfolio and index daily returns on shared trade dates only.
 * Skips gaps instead of truncating early (avoids misaligned beta).
 * Requires ≥20 paired observations — otherwise null (Data unavailable).
 */
function alignedBenchmarkReturns(
  curve: ReturnType<typeof buildEquityCurve>,
  bars: { tradeDate: string; closeValue: number }[],
): { asset: number[]; bench: number[] } | null {
  if (curve.length < 21 || bars.length < 2) return null;
  const byDate = new Map(bars.map((b) => [b.tradeDate, b.closeValue]));
  const asset: number[] = [];
  const bench: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const d0 = curve[i - 1]!.date;
    const d1 = curve[i]!.date;
    const v0 = byDate.get(d0);
    const v1 = byDate.get(d1);
    const p0 = curve[i - 1]!.portfolioValueNpr;
    const p1 = curve[i]!.portfolioValueNpr;
    if (v0 == null || v1 == null || v0 <= 0 || p0 <= 0 || !Number.isFinite(p1)) continue;
    asset.push((p1 - p0) / p0);
    bench.push((v1 - v0) / v0);
  }
  if (asset.length < 20) return null;
  return { asset, bench };
}

/** Minimum overlapping index bars to treat a benchmark window as historical (not session). */
const MIN_HISTORY_BARS = 5;

function buildBenchmarks(
  input: BuildAnalyticsInput,
  curve: ReturnType<typeof buildEquityCurve>,
  performance: PerformanceDashboard,
): BenchmarkComparison[] {
  const out: BenchmarkComparison[] = [];
  const indexEod = input.market?.indexEod ?? {};
  const live = input.market?.liveIndices ?? [];

  const specs: { label: string; indexKey: string; match: (name: string) => boolean }[] = [
    {
      label: "NEPSE Index",
      indexKey: "NEPSE",
      match: (n) => /nepse/i.test(n) && !/sensitive|float|sub/i.test(n),
    },
    {
      label: "Sensitive Index",
      indexKey: "SENSITIVE",
      match: (n) => /sensitive/i.test(n) && !/float/i.test(n),
    },
  ];

  const dominantSector = (() => {
    const slices = buildAllocation(input).sector;
    return slices[0]?.label && slices[0].label !== "Unclassified" ? slices[0].label : null;
  })();
  if (dominantSector) {
    specs.push({
      label: `Sector · ${dominantSector}`,
      indexKey: `SECTOR:${dominantSector.toUpperCase()}`,
      match: (n) => n.toLowerCase().includes(dominantSector.toLowerCase().replace(/ sector$/i, "")),
    });
  } else {
    out.push({
      label: "Sector Index",
      indexKey: "SECTOR",
      indexReturnPct: null,
      portfolioReturnPct: performance.totalReturnPct,
      relativeReturnPct: null,
      alphaPct: null,
      outperformance: null,
      status: "unavailable",
      message: DATA_UNAVAILABLE,
    });
  }

  for (const spec of specs) {
    const series =
      indexEod[spec.indexKey] ??
      Object.entries(indexEod).find(([, v]) => spec.match(v.indexName))?.[1] ??
      null;

    const liveTick = live.find((t) => spec.match(t.indexName) || t.indexKey === spec.indexKey);

    let indexReturnPct: number | null = null;
    let portfolioReturnPct: number | null = null;
    let window: "history" | "session" | "none" = "none";

    if (series && curve.length >= 2) {
      const startDate = curve[0]!.date;
      const endDate = curve[curve.length - 1]!.date;
      const bars = series.bars.filter((b) => b.tradeDate >= startDate && b.tradeDate <= endDate);
      if (bars.length >= MIN_HISTORY_BARS) {
        // Align portfolio endpoints to first/last overlapping index dates.
        const firstIdx = bars[0]!.tradeDate;
        const lastIdx = bars[bars.length - 1]!.tradeDate;
        const portStart = curve.find((p) => p.date >= firstIdx) ?? curve[0]!;
        const portEnd = [...curve].reverse().find((p) => p.date <= lastIdx) ?? curve[curve.length - 1]!;
        indexReturnPct = pctChange(bars[0]!.closeValue, bars[bars.length - 1]!.closeValue);
        portfolioReturnPct = pctChange(portStart.portfolioValueNpr, portEnd.portfolioValueNpr);
        if (indexReturnPct != null && portfolioReturnPct != null) window = "history";
      }
    }

    // Session-only relative return when history missing but live change published.
    if (window === "none" && liveTick?.changePct != null && performance.dailyChangePct != null) {
      indexReturnPct = liveTick.changePct;
      portfolioReturnPct = performance.dailyChangePct;
      window = "session";
    }

    if (indexReturnPct == null || portfolioReturnPct == null || window === "none") {
      out.push({
        label: spec.label,
        indexKey: spec.indexKey,
        indexReturnPct: null,
        portfolioReturnPct: performance.totalReturnPct,
        relativeReturnPct: null,
        alphaPct: null,
        outperformance: null,
        status: "unavailable",
        message: DATA_UNAVAILABLE,
      });
      continue;
    }

    const relative = portfolioReturnPct - indexReturnPct;
    out.push({
      label: spec.label + (window === "session" ? " (session)" : ""),
      indexKey: spec.indexKey,
      indexReturnPct,
      portfolioReturnPct,
      relativeReturnPct: relative,
      // Without risk-free / CAPM beta-adjusted alpha inputs, reported alpha ≡ relative return
      // on the same verified window (history or session).
      alphaPct: relative,
      outperformance: relative > 0,
      status: "ok",
      message:
        window === "session"
          ? "Compared on today's published session change only — historical index EOD insufficient."
          : undefined,
    });
  }

  return out;
}

function buildHistoryCoverage(args: {
  curve: ReturnType<typeof buildEquityCurve>;
  risk: RiskAnalysis;
  synthesizedBuyCount: number;
  missingEod: string[];
  hasMarketContext: boolean;
  hadReplayableBuys: boolean;
}): AnalyticsHistoryCoverage {
  const dailyReturnCount = dailyReturnsFromCurve(args.curve).length;
  const equityPointCount = args.curve.length;
  const missingLabel =
    args.missingEod.length > 0
      ? `Historical EOD prices missing for ${args.missingEod.join(", ")}.`
      : null;

  let chartsUnavailableMessage: string;
  if (!args.hasMarketContext) chartsUnavailableMessage = NEED_MARKET_CONTEXT;
  else if (missingLabel) chartsUnavailableMessage = missingLabel;
  else if (!args.hadReplayableBuys) chartsUnavailableMessage = NEED_PURCHASE_HISTORY;
  else chartsUnavailableMessage = NEED_MORE_HISTORY;

  const ratioMsg =
    !args.hasMarketContext
      ? NEED_MARKET_CONTEXT
      : missingLabel
        ? missingLabel
        : !args.hadReplayableBuys
          ? NEED_PURCHASE_HISTORY
          : dailyReturnCount < MIN_RATIO_RETURNS
            ? NEED_MORE_HISTORY
            : null;

  const curveMsg =
    !args.hasMarketContext
      ? NEED_MARKET_CONTEXT
      : missingLabel
        ? missingLabel
        : !args.hadReplayableBuys
          ? NEED_PURCHASE_HISTORY
          : equityPointCount < 2
            ? NEED_MORE_HISTORY
            : null;

  return {
    equityPointCount,
    dailyReturnCount,
    synthesizedBuyCount: args.synthesizedBuyCount,
    missingEodSymbols: args.missingEod,
    hasMarketContext: args.hasMarketContext,
    needMoreHistoryMessage: NEED_MORE_HISTORY,
    chartsUnavailableMessage,
    riskUnavailable: {
      portfolioBeta: args.risk.portfolioBeta == null ? ratioMsg : null,
      portfolioVolatilityPct: args.risk.portfolioVolatilityPct == null ? curveMsg : null,
      maximumDrawdownPct: args.risk.maximumDrawdownPct == null ? curveMsg : null,
      sharpeRatio: args.risk.sharpeRatio == null ? ratioMsg : null,
      sortinoRatio: args.risk.sortinoRatio == null ? ratioMsg : null,
      riskScore: args.risk.riskScore == null ? curveMsg ?? ratioMsg : null,
    },
  };
}

export function buildInstitutionalPortfolioAnalytics(input: BuildAnalyticsInput): InstitutionalPortfolioAnalytics {
  const asOf = input.todayIso ?? new Date().toISOString().slice(0, 10);
  const { ledger: analyticsLedger, synthesizedBuyCount } = resolveAnalyticsLedger(
    input.holdings,
    input.ledger,
  );
  const eodBySymbol = input.market?.eodBySymbol ?? {};
  const missingEod = missingEodSymbols(input.holdings, eodBySymbol);
  const hadReplayableBuys = analyticsLedger.some(
    (e) =>
      e.bucket === "investment" &&
      (e.txType === "buy" || e.txType === "right_share") &&
      e.quantity > 0,
  );

  const curve = buildEquityCurve({
    holdings: input.holdings,
    ledger: analyticsLedger,
    eodBySymbol,
    asOfDate: asOf,
  });

  // Append today's live mark if curve ends before asOf and we have live values.
  // Only append onto an existing reconstructed curve — a lone live point is not history.
  if (
    curve.length > 0 &&
    input.summary.portfolioValueNpr > 0 &&
    curve[curve.length - 1]!.date < asOf
  ) {
    const invested = input.summary.costNpr;
    const value = input.summary.portfolioValueNpr;
    const peak = Math.max(value, ...curve.map((p) => p.portfolioValueNpr), value);
    curve.push({
      date: asOf,
      portfolioValueNpr: value,
      investedNpr: invested,
      pnlNpr: value - invested,
      drawdownPct: peak > 0 ? ((peak - value) / peak) * 100 : 0,
    });
  }

  const allocation = buildAllocation(input);
  const performance = buildPerformance(input, curve, analyticsLedger);

  const nepseBars = input.market?.indexEod.NEPSE?.bars ?? null;
  const alignedBench = nepseBars ? alignedBenchmarkReturns(curve, nepseBars) : null;
  const risk = buildRisk(allocation, curve, alignedBench);
  const income = buildIncome(input);
  const intelligence = buildIntelligence(input, allocation, risk, income, performance);
  const scenarios = buildScenarios(input.summary.portfolioValueNpr);
  const benchmarks = buildBenchmarks(input, curve, performance);
  const history = buildHistoryCoverage({
    curve,
    risk,
    synthesizedBuyCount,
    missingEod,
    hasMarketContext: input.market != null,
    hadReplayableBuys,
  });

  return {
    asOf,
    performance,
    allocation,
    risk,
    charts: {
      growth: curve,
      investedVsCurrent: curve.map((p) => ({
        date: p.date,
        investedNpr: p.investedNpr,
        currentNpr: p.portfolioValueNpr,
      })),
      pnlHistory: curve.map((p) => ({ date: p.date, pnlNpr: p.pnlNpr })),
      dailyEquity: curve,
      drawdown: curve.map((p) => ({ date: p.date, drawdownPct: p.drawdownPct })),
      dividendIncome: income.monthlyHistory.map((m) => ({ period: m.month, amountNpr: m.amountNpr })),
    },
    income,
    intelligence,
    scenarios,
    benchmarks,
    history,
  };
}
