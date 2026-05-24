import type { FdCompounding, FixedDepositRow } from "@/components/portfolio/types";
import { amountToNpr, type PortfolioDisplayCurrency } from "@/lib/portfolio-convert";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function compoundingPeriodsPerYear(c: FdCompounding): number {
  switch (c) {
    case "simple":
      return 0;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annual":
      return 1;
    default:
      return 4;
  }
}

/** Fractional years between two ISO calendar dates (value-date style). */
export function fdYearsBetween(openIso: string, maturityIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openIso) || !/^\d{4}-\d{2}-\d{2}$/.test(maturityIso)) return null;
  const t0 = Date.parse(`${openIso}T12:00:00`);
  const t1 = Date.parse(`${maturityIso}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
  return (t1 - t0) / (365.25 * 24 * 3600 * 1000);
}

/** Maturity amount in same currency as principal. */
export function fdMaturityAmount(
  principal: number,
  annualRatePct: number,
  compounding: FdCompounding,
  years: number,
): number {
  if (principal <= 0 || !Number.isFinite(principal)) return 0;
  if (years <= 0 || !Number.isFinite(years)) return principal;
  const r = annualRatePct / 100;
  if (r <= 0 || !Number.isFinite(r)) return principal;
  if (compounding === "simple") return principal * (1 + r * years);
  const n = compoundingPeriodsPerYear(compounding);
  if (n <= 0) return principal;
  return principal * Math.pow(1 + r / n, n * years);
}

export function fdEffectiveAnnualReturnPct(
  principal: number,
  maturityAmount: number,
  years: number,
): number | null {
  if (principal <= 0 || years <= 0 || !Number.isFinite(years)) return null;
  if (maturityAmount <= 0 || !Number.isFinite(maturityAmount)) return null;
  return (Math.pow(maturityAmount / principal, 1 / years) - 1) * 100;
}

export type FdDerivedMetrics = {
  maturityAmount: number;
  totalInterest: number;
  estimatedMonthlyInterest: number;
  estimatedAnnualReturnPct: number | null;
  termYears: number;
  termMonths: number;
  isActive: boolean;
};

/**
 * Derives FD economics for one row. Uses `openedDate` when set, otherwise **today**
 * as booking date (remaining term to maturity).
 */
export function fdDerivedMetricsForRow(row: FixedDepositRow, asOfIso = todayIso()): FdDerivedMetrics | null {
  const principal = row.principal ?? 0;
  const rate = row.interestRatePct ?? 0;
  const maturity = row.maturityDate;
  if (!maturity || principal <= 0 || !Number.isFinite(principal)) return null;
  const opened = row.openedDate && /^\d{4}-\d{2}-\d{2}$/.test(row.openedDate) ? row.openedDate : asOfIso;
  const years = fdYearsBetween(opened, maturity);
  if (years == null) return null;
  const maturityAmount = fdMaturityAmount(principal, rate, row.compounding, years);
  const totalInterest = Math.max(0, maturityAmount - principal);
  const termMonths = Math.max(years * 12, 1e-9);
  const isActive = maturity >= asOfIso;
  const estimatedMonthlyInterest = isActive ? totalInterest / termMonths : 0;
  const estimatedAnnualReturnPct = fdEffectiveAnnualReturnPct(principal, maturityAmount, years);
  return {
    maturityAmount,
    totalInterest,
    estimatedMonthlyInterest,
    estimatedAnnualReturnPct,
    termYears: years,
    termMonths,
    isActive,
  };
}

function lineToNprLocal(
  amount: number | undefined,
  currency: PortfolioDisplayCurrency,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return amountToNpr(amount ?? 0, currency, krwPerNpr, usdPerNpr);
}

export function sumFixedDepositPrincipalNpr(
  rows: FixedDepositRow[] | undefined,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  if (!rows?.length) return 0;
  return rows.reduce((a, r) => a + lineToNprLocal(r.principal, r.currency, krwPerNpr, usdPerNpr), 0);
}

/** Sum of modelled average monthly interest across FDs, converted to NPR (active FDs only). */
export function aggregateFdMonthlyInterestNpr(
  rows: FixedDepositRow[] | undefined,
  krwPerNpr: number,
  usdPerNpr: number,
  asOfIso = todayIso(),
): number {
  if (!rows?.length) return 0;
  let sum = 0;
  for (const r of rows) {
    const m = fdDerivedMetricsForRow(r, asOfIso);
    if (!m || !m.isActive) continue;
    sum += lineToNprLocal(m.estimatedMonthlyInterest, r.currency, krwPerNpr, usdPerNpr);
  }
  return sum;
}
