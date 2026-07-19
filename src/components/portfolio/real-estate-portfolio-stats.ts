import type { RealEstateRow } from "@/components/portfolio/types";
import {
  reFractionalYearsHeld,
  reHoldingYrMo,
  reImpliedAnnualGrowthPct,
  reProfitAmount,
  reRoiPct,
} from "@/components/portfolio/real-estate-metrics";
import { amountToNpr } from "@/lib/portfolio-convert";

export type RealEstatePortfolioStats = {
  propertyCount: number;
  totalInvestmentNpr: number;
  currentMarketValueNpr: number;
  totalProfitNpr: number;
  totalRoiPct: number | null;
  yearlyProfitNpr: number | null;
  /** Weighted-ish score 0–100 for hero gauge. */
  portfolioScore: number;
};

export function sumRealEstateInvestmentNpr(
  rows: RealEstateRow[],
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return rows.reduce((a, r) => {
    if (r.purchaseValue == null || !(r.purchaseValue > 0)) return a;
    return a + amountToNpr(r.purchaseValue, r.currency, krwPerNpr, usdPerNpr);
  }, 0);
}

export function computeRealEstatePortfolioStats(
  rows: RealEstateRow[],
  krwPerNpr: number,
  usdPerNpr: number,
): RealEstatePortfolioStats {
  let totalInvestmentNpr = 0;
  let currentMarketValueNpr = 0;
  let totalProfitNpr = 0;
  let yearsWeighted = 0;
  let scoreAcc = 0;

  for (const r of rows) {
    const purchase =
      r.purchaseValue != null && r.purchaseValue > 0
        ? amountToNpr(r.purchaseValue, r.currency, krwPerNpr, usdPerNpr)
        : 0;
    const market =
      r.estimatedValue != null && r.estimatedValue > 0
        ? amountToNpr(r.estimatedValue, r.currency, krwPerNpr, usdPerNpr)
        : 0;
    totalInvestmentNpr += purchase;
    currentMarketValueNpr += market;
    if (purchase > 0 && market > 0) totalProfitNpr += market - purchase;

    const y = reFractionalYearsHeld(r.acquiredDate);
    if (y != null && y > 0 && purchase > 0) yearsWeighted += y * purchase;

    scoreAcc += propertyCompletenessScore(r);
  }

  const totalRoiPct =
    totalInvestmentNpr > 0 ? ((currentMarketValueNpr - totalInvestmentNpr) / totalInvestmentNpr) * 100 : null;

  const avgYears = totalInvestmentNpr > 0 && yearsWeighted > 0 ? yearsWeighted / totalInvestmentNpr : null;
  const yearlyProfitNpr =
    avgYears != null && avgYears > 0.08 ? totalProfitNpr / avgYears : totalProfitNpr !== 0 ? null : 0;

  const portfolioScore =
    rows.length === 0 ? 0 : Math.round(Math.min(100, Math.max(0, scoreAcc / rows.length)));

  return {
    propertyCount: rows.length,
    totalInvestmentNpr,
    currentMarketValueNpr,
    totalProfitNpr,
    totalRoiPct,
    yearlyProfitNpr,
    portfolioScore,
  };
}

/** Heuristic property health score from data depth + returns (0–100). */
export function propertyCompletenessScore(row: RealEstateRow): number {
  let s = 28;
  if (row.name.trim()) s += 8;
  if (row.location?.trim()) s += 6;
  if (row.purchaseValue != null && row.purchaseValue > 0) s += 10;
  if (row.estimatedValue != null && row.estimatedValue > 0) s += 12;
  if (row.acquiredDate) s += 8;
  if (row.propertyPhoto || (row.propertyPhotos && row.propertyPhotos.length)) s += 8;
  if (row.documents && row.documents.length) s += 6;
  if (row.mapsUrl) s += 4;

  const roi = reRoiPct(row.purchaseValue, row.estimatedValue);
  if (roi != null) {
    if (roi >= 20) s += 10;
    else if (roi >= 8) s += 7;
    else if (roi >= 0) s += 4;
    else s -= 6;
  }
  const cagr = reImpliedAnnualGrowthPct(row.purchaseValue, row.estimatedValue, row.acquiredDate);
  if (cagr != null) {
    if (cagr >= 8) s += 6;
    else if (cagr >= 4) s += 3;
    else if (cagr < 0) s -= 4;
  }
  return Math.min(100, Math.max(12, Math.round(s)));
}

export function formatReStatMoney(npr: number): string {
  if (!Number.isFinite(npr)) return "—";
  const abs = Math.abs(npr);
  if (abs >= 1e7) return `NPR ${(npr / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `NPR ${(npr / 1e5).toFixed(2)} L`;
  return `NPR ${Math.round(npr).toLocaleString("en-US")}`;
}

export function propertyCardMetrics(row: RealEstateRow) {
  const roi = reRoiPct(row.purchaseValue, row.estimatedValue);
  const profit = reProfitAmount(row.purchaseValue, row.estimatedValue);
  const holding = reHoldingYrMo(row.acquiredDate);
  const cagr = reImpliedAnnualGrowthPct(row.purchaseValue, row.estimatedValue, row.acquiredDate);
  const score = propertyCompletenessScore(row);
  const rentalYield =
    row.annualRentalIncome != null &&
    row.estimatedValue != null &&
    row.estimatedValue > 0 &&
    Number.isFinite(row.annualRentalIncome)
      ? (row.annualRentalIncome / row.estimatedValue) * 100
      : null;
  return { roi, profit, holding, cagr, score, rentalYield };
}
