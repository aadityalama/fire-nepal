import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import type { NepseHoldingRow } from "@/components/portfolio/nepse-portfolio/nepse-portfolio-metrics";
import type { EodCloseBar, EquityCurvePoint } from "./types";
import { pctChange } from "./math";

type LotState = { quantity: number; unitCostNpr: number };

function replayUnitsAndCost(
  ledger: readonly PortfolioLedgerEntry[],
  rowId: string,
  asOfDate: string,
): { units: number; costNpr: number } {
  const lots: LotState[] = [];
  const entries = ledger
    .filter((e) => e.bucket === "investment" && e.rowId === rowId && e.tradeDate <= asOfDate)
    .slice()
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.id.localeCompare(b.id));

  for (const e of entries) {
    if (e.txType === "buy" || e.txType === "right_share") {
      const qty = e.quantity > 0 ? e.quantity : 0;
      const unit = e.unitPrice >= 0 ? e.unitPrice : 0;
      const feePer = qty > 0 && e.fees ? e.fees / qty : 0;
      if (qty > 0) lots.push({ quantity: qty, unitCostNpr: unit + feePer });
    } else if (e.txType === "bonus_share") {
      const qty = e.quantity > 0 ? e.quantity : 0;
      if (qty > 0) lots.push({ quantity: qty, unitCostNpr: 0 });
    } else if (e.txType === "sell") {
      let remaining = e.quantity > 0 ? e.quantity : 0;
      while (remaining > 1e-9 && lots.length) {
        const lot = lots[0]!;
        const take = Math.min(lot.quantity, remaining);
        lot.quantity -= take;
        remaining -= take;
        if (lot.quantity <= 1e-9) lots.shift();
      }
    }
  }

  let units = 0;
  let costNpr = 0;
  for (const lot of lots) {
    units += lot.quantity;
    costNpr += lot.quantity * lot.unitCostNpr;
  }
  return { units, costNpr };
}

function closestCloseOnOrBefore(bars: EodCloseBar[], date: string): number | null {
  if (!bars.length) return null;
  let lo = 0;
  let hi = bars.length - 1;
  let ans: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const bar = bars[mid]!;
    if (bar.tradeDate <= date) {
      ans = bar.closeNpr;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Reconstruct daily portfolio equity from real holdings + EOD closes.
 * Skips dates where any open holding lacks a usable close (no fabrication).
 * Open units come from ledger replay — callers should pass `resolveAnalyticsLedger`
 * so holdings without buy rows still reconstruct from declared lots / purchase dates.
 */
export function buildEquityCurve(args: {
  holdings: NepseHoldingRow[];
  ledger: readonly PortfolioLedgerEntry[];
  eodBySymbol: Record<string, EodCloseBar[]>;
  asOfDate: string;
}): EquityCurvePoint[] {
  const { holdings, ledger, eodBySymbol, asOfDate } = args;
  if (!holdings.length) return [];

  const dateSet = new Set<string>();
  for (const h of holdings) {
    for (const bar of eodBySymbol[h.symbol] ?? []) {
      if (bar.tradeDate <= asOfDate) dateSet.add(bar.tradeDate);
    }
  }
  // Include ledger dates so buys before first EOD still appear once prices exist.
  for (const e of ledger) {
    if (e.bucket === "investment" && e.tradeDate <= asOfDate) dateSet.add(e.tradeDate);
  }

  const dates = [...dateSet].sort((a, b) => a.localeCompare(b));
  if (!dates.length) return [];

  const points: EquityCurvePoint[] = [];
  let peak = 0;

  for (const date of dates) {
    let portfolioValueNpr = 0;
    let investedNpr = 0;
    let pricedHoldings = 0;
    let openHoldings = 0;

    for (const h of holdings) {
      const { units, costNpr } = replayUnitsAndCost(ledger, h.row.id, date);
      if (units <= 1e-9) continue;
      openHoldings += 1;
      investedNpr += costNpr;
      const close = closestCloseOnOrBefore(eodBySymbol[h.symbol] ?? [], date);
      if (close == null || close <= 0) continue;
      portfolioValueNpr += units * close;
      pricedHoldings += 1;
    }

    // Require every open holding to have a price on this date (or earlier) before emitting.
    if (openHoldings === 0 || pricedHoldings < openHoldings) continue;
    if (portfolioValueNpr <= 0) continue;

    if (portfolioValueNpr > peak) peak = portfolioValueNpr;
    const drawdownPct = peak > 0 ? ((peak - portfolioValueNpr) / peak) * 100 : 0;
    points.push({
      date,
      portfolioValueNpr,
      investedNpr,
      pnlNpr: portfolioValueNpr - investedNpr,
      drawdownPct,
    });
  }

  return points;
}

export function changeOverLookback(
  curve: EquityCurvePoint[],
  lookbackCalendarDays: number,
): { changePct: number; changeNpr: number } | null {
  if (curve.length < 2) return null;
  const end = curve[curve.length - 1]!;
  const target = end.date;
  // Find first point on or after (end - lookback).
  const [y, m, d] = target.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - lookbackCalendarDays);
  const fromIso = dt.toISOString().slice(0, 10);
  let start: EquityCurvePoint | null = null;
  for (const p of curve) {
    if (p.date <= fromIso) start = p;
    else break;
  }
  // If no point on/before target window, try nearest earlier; else unavailable.
  if (!start) {
    // Allow first point if curve is shorter than window only when lookback is daily (1).
    if (lookbackCalendarDays <= 1 && curve.length >= 2) {
      start = curve[curve.length - 2]!;
    } else {
      return null;
    }
  }
  const changeNpr = end.portfolioValueNpr - start.portfolioValueNpr;
  const changePct = pctChange(start.portfolioValueNpr, end.portfolioValueNpr);
  if (changePct == null) return null;
  return { changePct, changeNpr };
}

export function dailyReturnsFromCurve(curve: EquityCurvePoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1]!.portfolioValueNpr;
    const cur = curve[i]!.portfolioValueNpr;
    if (prev > 0 && Number.isFinite(cur)) out.push((cur - prev) / prev);
  }
  return out;
}

export function filterCurveByRange(
  curve: EquityCurvePoint[],
  range: "7D" | "1M" | "3M" | "1Y" | "ALL",
): EquityCurvePoint[] {
  if (!curve.length || range === "ALL") return curve;
  const end = curve[curve.length - 1]!.date;
  const days = range === "7D" ? 7 : range === "1M" ? 31 : range === "3M" ? 93 : 366;
  const [y, m, d] = end.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const fromIso = dt.toISOString().slice(0, 10);
  return curve.filter((p) => p.date >= fromIso);
}
