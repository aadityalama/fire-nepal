import { aggregateFdMonthlyInterestNpr, sumFixedDepositPrincipalNpr } from "@/components/portfolio/banking-fd";
import { mockLiveMultiplier } from "@/components/portfolio/mock-prices";
import type {
  GlobalRetirementAssetRow,
  InvestmentRow,
  LiabilityRow,
  MetalRow,
  RealEstateRow,
  SimpleMoneyLine,
  VehicleRow,
  WealthPortfolioStateV2,
} from "@/components/portfolio/types";
import { resolveLiveUnitNpr } from "@/lib/investment-market/quotes";
import { fallbackMetalRatesFromUsdAnchors, nprPerTolaFromGram } from "@/lib/market/bullion-estimate";
import { amountToNpr, FALLBACK_USD_PER_NPR, type PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { metalsNprPerGramFromSnapshot } from "@/services/market/metal-convert";
import { resolveLiveUnitNprFromSnapshot } from "@/services/portfolio/market-quotes";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";
import type { MarketSnapshot } from "@/types/market";

export type InvestmentValuation = {
  costNpr: number;
  liveValueNpr: number;
  pnlNpr: number;
};

export function lineToNpr(
  amount: number | undefined,
  currency: PortfolioDisplayCurrency,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return amountToNpr(amount ?? 0, currency, krwPerNpr, usdPerNpr);
}

export function sumSimpleLinesNpr(
  lines: SimpleMoneyLine[],
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return lines.reduce((a, l) => a + lineToNpr(l.amount, l.currency, krwPerNpr, usdPerNpr), 0);
}

export function valueInvestmentRow(
  row: InvestmentRow,
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket?: MarketSnapshot | null,
): InvestmentValuation {
  const qty = row.quantity ?? 0;
  const buy = row.buyPrice ?? 0;
  if (qty <= 0) return { costNpr: 0, liveValueNpr: 0, pnlNpr: 0 };

  if (liveMarket) {
    const apiLive = resolveLiveUnitNprFromSnapshot(row, liveMarket, krwPerNpr, usdPerNpr);
    if (apiLive != null && Number.isFinite(apiLive) && buy > 0) {
      const unitBuyNpr = lineToNpr(buy, row.currency, krwPerNpr, usdPerNpr);
      const costNpr = qty * unitBuyNpr;
      const liveValueNpr = qty * apiLive;
      return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
    }
  }

  const masterLive = resolveLiveUnitNpr(row.instrumentKey, usdPerNpr);
  if (masterLive != null && Number.isFinite(masterLive) && buy > 0) {
    const unitBuyNpr = lineToNpr(buy, row.currency, krwPerNpr, usdPerNpr);
    const costNpr = qty * unitBuyNpr;
    const liveValueNpr = qty * masterLive;
    return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
  }

  if (buy <= 0) return { costNpr: 0, liveValueNpr: 0, pnlNpr: 0 };

  const unitBuyNpr = lineToNpr(buy, row.currency, krwPerNpr, usdPerNpr);
  const costNpr = qty * unitBuyNpr;
  /** When a live snapshot is active, avoid deterministic mock drift — hold at cost if no quote. */
  const mult = liveMarket ? 1 : mockLiveMultiplier(row.id, row.kind);
  const liveUnitNpr = unitBuyNpr * mult;
  const liveValueNpr = qty * liveUnitNpr;
  return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
}

export function sumInvestmentsNpr(
  rows: InvestmentRow[],
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket?: MarketSnapshot | null,
): { liveNpr: number; costNpr: number; pnlNpr: number; byKind: Record<string, number> } {
  const byKind: Record<string, number> = {};
  let liveNpr = 0;
  let costNpr = 0;
  for (const r of rows) {
    const v = valueInvestmentRow(r, krwPerNpr, usdPerNpr, liveMarket);
    liveNpr += v.liveValueNpr;
    costNpr += v.costNpr;
    byKind[r.kind] = (byKind[r.kind] ?? 0) + v.liveValueNpr;
  }
  return { liveNpr, costNpr, pnlNpr: liveNpr - costNpr, byKind };
}

export function sumMetalsNpr(
  rows: MetalRow[],
  liveGramRates?: { goldNprPerGram: number; silverNprPerGram: number } | null,
  usdPerNprForFallback?: number,
): number {
  const hasLive =
    liveGramRates != null &&
    liveGramRates.goldNprPerGram > 0 &&
    liveGramRates.silverNprPerGram > 0;
  const anchor = fallbackMetalRatesFromUsdAnchors(usdPerNprForFallback ?? FALLBACK_USD_PER_NPR);
  const rates = hasLive ? liveGramRates : anchor;
  return rows.reduce((a, r) => {
    const g = r.grams ?? 0;
    if (g <= 0) return a;
    const rate = r.metal === "gold" ? rates.goldNprPerGram : rates.silverNprPerGram;
    return a + g * rate;
  }, 0);
}

export function sumRealEstateNpr(rows: RealEstateRow[], krwPerNpr: number, usdPerNpr: number): number {
  return rows.reduce(
    (a, r) => a + lineToNpr(r.estimatedValue, r.currency, krwPerNpr, usdPerNpr),
    0,
  );
}

export function sumVehiclesNpr(rows: VehicleRow[], krwPerNpr: number, usdPerNpr: number): number {
  return rows.reduce((a, r) => a + lineToNpr(r.resaleEstimate, r.currency, krwPerNpr, usdPerNpr), 0);
}

export function sumLiabilitiesNpr(rows: LiabilityRow[], krwPerNpr: number, usdPerNpr: number): number {
  return rows.reduce((a, r) => a + lineToNpr(r.amount, r.currency, krwPerNpr, usdPerNpr), 0);
}

/** Sum current retirement balances in NPR. */
export function sumRetirementBalanceNpr(
  rows: GlobalRetirementAssetRow[],
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return rows.reduce((a, r) => a + lineToNpr(r.currentBalance, r.currency, krwPerNpr, usdPerNpr), 0);
}

/**
 * Future value in NPR: balance grows with optional monthly contributions until retirement age.
 * Uses nominal annual return (default 6%) compounded monthly.
 */
export function projectRetirementRowFvNpr(
  row: GlobalRetirementAssetRow,
  krwPerNpr: number,
  usdPerNpr: number,
  annualNominalReturn = 0.06,
): number {
  const pv = lineToNpr(row.currentBalance, row.currency, krwPerNpr, usdPerNpr);
  const pmt =
    lineToNpr(row.monthlyContribution, row.currency, krwPerNpr, usdPerNpr) +
    lineToNpr(row.employerContribution, row.currency, krwPerNpr, usdPerNpr);
  const retAge = row.expectedRetirementAge ?? 60;
  const curAge = row.currentAge ?? 35;
  const years = Math.max(0, Math.min(55, retAge - curAge));
  const months = Math.round(years * 12);
  const rm = annualNominalReturn / 12;
  if (months <= 0) return Math.max(0, pv);
  const growth = Math.pow(1 + rm, months);
  if (rm < 1e-12) return Math.max(0, pv + pmt * months);
  return Math.max(0, pv * growth + (pmt * (growth - 1)) / rm);
}

/** Top-line retirement KPIs derived from `WealthTotals` (already NPR-normalized). */
export function computeRetirementDashboardSnapshot(t: WealthTotals): {
  allocationOfAssetsPct: number;
  estimatedMonthlyIncomeNpr: number;
  fireNwContributionPct: number;
} {
  const denomA = Math.max(t.totalAssetsNpr, 1e-9);
  return {
    allocationOfAssetsPct: (t.retirementNpr / denomA) * 100,
    estimatedMonthlyIncomeNpr: (t.retirementProjectedFvNpr * 0.04) / 12,
    fireNwContributionPct: t.netWorthNpr > 0 ? (t.retirementNpr / t.netWorthNpr) * 100 : 0,
  };
}

export type WealthTotals = {
  liquidNpr: number;
  /** Principal of term deposits (NPR), separate from liquid cash. */
  fixedDepositsPrincipalNpr: number;
  /** Modelled average monthly interest from active FDs (NPR). */
  fixedDepositsEstimatedMonthlyIncomeNpr: number;
  investmentsLiveNpr: number;
  investmentsCostNpr: number;
  investmentsPnlNpr: number;
  investmentByKindNpr: Record<string, number>;
  metalsNpr: number;
  realEstateNpr: number;
  vehiclesNpr: number;
  retirementNpr: number;
  retirementProjectedFvNpr: number;
  liabilitiesNpr: number;
  totalAssetsNpr: number;
  netWorthNpr: number;
  investableNpr: number;
};

export type ComputeWealthTotalsOptions = {
  /** When set, marks listed investments + bullion to market using server-fetched quotes. */
  liveMarket?: MarketSnapshot | null;
  /** NPR per gram from `/api/market/gold-price` — overrides snapshot-derived bullion when set. */
  bullionGramRatesNpr?: { goldNprPerGram: number; silverNprPerGram: number } | null;
};

export function computeWealthTotals(
  s: WealthPortfolioStateV2,
  krwPerNpr: number,
  usdPerNpr: number,
  opts?: ComputeWealthTotalsOptions | null,
): WealthTotals {
  const liveMarket = opts?.liveMarket ?? null;
  const explicitBullion = opts?.bullionGramRatesNpr;
  const fromSnap = liveMarket ? metalsNprPerGramFromSnapshot(liveMarket, usdPerNpr) : null;
  const metalGramRates =
    explicitBullion != null &&
    explicitBullion.goldNprPerGram > 0 &&
    explicitBullion.silverNprPerGram > 0
      ? explicitBullion
      : fromSnap != null && fromSnap.goldNprPerGram > 0 && fromSnap.silverNprPerGram > 0
        ? fromSnap
        : null;
  const liquidNpr = sumSimpleLinesNpr(s.liquidCash, krwPerNpr, usdPerNpr);
  const fdRows = s.fixedDeposits ?? [];
  const fixedDepositsPrincipalNpr = sumFixedDepositPrincipalNpr(fdRows, krwPerNpr, usdPerNpr);
  const fixedDepositsEstimatedMonthlyIncomeNpr = aggregateFdMonthlyInterestNpr(fdRows, krwPerNpr, usdPerNpr);
  const inv = sumInvestmentsNpr(s.investments, krwPerNpr, usdPerNpr, liveMarket);
  const metalsNpr = sumMetalsNpr(s.metals, metalGramRates, usdPerNpr);
  const realEstateNpr = sumRealEstateNpr(s.realEstate, krwPerNpr, usdPerNpr);
  const vehiclesNpr = sumVehiclesNpr(s.vehicles, krwPerNpr, usdPerNpr);
  const liabilitiesNpr = sumLiabilitiesNpr(s.liabilities, krwPerNpr, usdPerNpr);
  const rows = s.globalRetirementAssets ?? [];
  const retirementNpr = sumRetirementBalanceNpr(rows, krwPerNpr, usdPerNpr);
  const retirementProjectedFvNpr = rows.reduce(
    (a, r) => a + projectRetirementRowFvNpr(r, krwPerNpr, usdPerNpr),
    0,
  );

  const totalAssetsNpr =
    liquidNpr + fixedDepositsPrincipalNpr + inv.liveNpr + metalsNpr + realEstateNpr + vehiclesNpr + retirementNpr;
  const netWorthNpr = totalAssetsNpr - liabilitiesNpr;
  const investableNpr = liquidNpr + inv.liveNpr;

  return {
    liquidNpr,
    fixedDepositsPrincipalNpr,
    fixedDepositsEstimatedMonthlyIncomeNpr,
    investmentsLiveNpr: inv.liveNpr,
    investmentsCostNpr: inv.costNpr,
    investmentsPnlNpr: inv.pnlNpr,
    investmentByKindNpr: inv.byKind,
    metalsNpr,
    realEstateNpr,
    vehiclesNpr,
    retirementNpr,
    retirementProjectedFvNpr,
    liabilitiesNpr,
    totalAssetsNpr,
    netWorthNpr,
    investableNpr,
  };
}

export function allocationPercents(t: WealthTotals): { label: string; value: number; npr: number }[] {
  const a = t.totalAssetsNpr;
  if (a <= 0) {
    return [
      { label: "Liquid", value: 0, npr: 0 },
      { label: "Fixed deposits", value: 0, npr: 0 },
      { label: "Investments", value: 0, npr: 0 },
      { label: "Metals", value: 0, npr: 0 },
      { label: "Real estate", value: 0, npr: 0 },
      { label: "Vehicles", value: 0, npr: 0 },
      { label: "Global retirement", value: 0, npr: 0 },
    ];
  }
  return [
    { label: "Liquid", value: (t.liquidNpr / a) * 100, npr: t.liquidNpr },
    { label: "Fixed deposits", value: (t.fixedDepositsPrincipalNpr / a) * 100, npr: t.fixedDepositsPrincipalNpr },
    { label: "Investments", value: (t.investmentsLiveNpr / a) * 100, npr: t.investmentsLiveNpr },
    { label: "Metals", value: (t.metalsNpr / a) * 100, npr: t.metalsNpr },
    { label: "Real estate", value: (t.realEstateNpr / a) * 100, npr: t.realEstateNpr },
    { label: "Vehicles", value: (t.vehiclesNpr / a) * 100, npr: t.vehiclesNpr },
    { label: "Global retirement", value: (t.retirementNpr / a) * 100, npr: t.retirementNpr },
  ];
}

/** 0–100 composite: lower debt drag + higher investable share + positive net worth + retirement runway. */
export function fireReadinessScore(t: WealthTotals): number {
  const { totalAssetsNpr, liabilitiesNpr, netWorthNpr, investableNpr, retirementNpr } = t;
  const debtRatio = totalAssetsNpr > 0 ? Math.min(1, liabilitiesNpr / totalAssetsNpr) : liabilitiesNpr > 0 ? 1 : 0;
  const investRatio = totalAssetsNpr > 0 ? investableNpr / totalAssetsNpr : 0;
  const nwPositive = netWorthNpr > 0 ? 1 : netWorthNpr > -1 ? 0.5 : 0.2;
  const retirementBoost = totalAssetsNpr > 0 ? Math.min(4, (retirementNpr / totalAssetsNpr) * 22) : 0;
  const raw = (1 - debtRatio) * 36 + investRatio * 40 + nwPositive * 18 + retirementBoost;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function financialHealthFromScore(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Strong", color: "from-emerald-400 to-lime-300" };
  if (score >= 50) return { label: "Balanced", color: "from-lime-400 to-amber-300" };
  if (score >= 30) return { label: "Caution", color: "from-amber-400 to-orange-400" };
  return { label: "At risk", color: "from-orange-500 to-rose-500" };
}

/**
 * Passive income: 4% annual on investable liquid + listed investments (monthly NPR),
 * plus optional recurring cash dividends and modelled FD interest (monthly NPR).
 */
export function passiveIncomeMonthlyNpr(
  investableNpr: number,
  opts?: {
    annualPct?: number;
    monthlyCashDividendNpr?: number;
    monthlyFixedDepositInterestNpr?: number;
  },
): number {
  const pct = opts?.annualPct ?? 4;
  const div = opts?.monthlyCashDividendNpr ?? 0;
  const fd = opts?.monthlyFixedDepositInterestNpr ?? 0;
  return (investableNpr * (pct / 100)) / 12 + div + fd;
}

export function monthlyWealthGrowthNpr(history: { month: string; netWorthNpr: number }[]): number | null {
  if (history.length < 2) return null;
  const cur = history[history.length - 1]?.netWorthNpr ?? 0;
  const prev = history[history.length - 2]?.netWorthNpr ?? 0;
  return cur - prev;
}

/** Month-over-month % change from the last two net worth history points (null if not computable). */
export function netWorthMonthOverMonthPercent(history: { month: string; netWorthNpr: number }[]): number | null {
  if (history.length < 2) return null;
  const cur = history[history.length - 1]?.netWorthNpr;
  const prev = history[history.length - 2]?.netWorthNpr;
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  const absPrev = Math.abs(prev);
  if (absPrev < 1) return null;
  return ((cur - prev) / prev) * 100;
}

/** NPR/g for UI rows — prefers `/api/market/gold-price` payload, else FX-anchored estimate (never zero). */
export function resolveMetalGramRatesForUi(
  bullionSpot: GoldSilverPriceResponse | null,
  usdPerNpr: number,
): { goldNprPerGram: number; silverNprPerGram: number } {
  if (
    bullionSpot &&
    bullionSpot.goldPerGramNPR > 0 &&
    bullionSpot.silverPerGramNPR > 0
  ) {
    return {
      goldNprPerGram: bullionSpot.goldPerGramNPR,
      silverNprPerGram: bullionSpot.silverPerGramNPR,
    };
  }
  return fallbackMetalRatesFromUsdAnchors(usdPerNpr);
}

/** NPR/tola for UI — prefers API payload, else gram rate × Nepal tola. */
export function resolveMetalTolaRatesForUi(
  bullionSpot: GoldSilverPriceResponse | null,
  usdPerNpr: number,
): { goldNprPerTola: number; silverNprPerTola: number } {
  const grams = resolveMetalGramRatesForUi(bullionSpot, usdPerNpr);
  if (
    bullionSpot &&
    typeof bullionSpot.goldPerTolaNPR === "number" &&
    typeof bullionSpot.silverPerTolaNPR === "number" &&
    bullionSpot.goldPerTolaNPR > 0 &&
    bullionSpot.silverPerTolaNPR > 0
  ) {
    return {
      goldNprPerTola: bullionSpot.goldPerTolaNPR,
      silverNprPerTola: bullionSpot.silverPerTolaNPR,
    };
  }
  return {
    goldNprPerTola: nprPerTolaFromGram(grams.goldNprPerGram),
    silverNprPerTola: nprPerTolaFromGram(grams.silverNprPerGram),
  };
}
