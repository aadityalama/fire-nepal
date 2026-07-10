import { sumFixedDepositPrincipalNpr } from "@/components/portfolio/banking-fd";
import { mockLiveMultiplier } from "@/components/portfolio/mock-prices";
import type { FixedDepositRow, InvestmentKind, InvestmentRow } from "@/components/portfolio/types";
import { resolveLiveUnitNpr } from "@/lib/investment-market/quotes";
import { amountToNpr, type PortfolioDisplayCurrency } from "@/lib/portfolio-convert";
import { resolveLiveUnitNprFromSnapshot } from "@/services/portfolio/market-quotes";
import type { MarketSnapshot } from "@/types/market";

export type InvestmentValuation = {
  costNpr: number;
  liveValueNpr: number;
  pnlNpr: number;
};

export type InvestmentAggregationOptions = {
  krwPerNpr: number;
  usdPerNpr: number;
  liveMarket?: MarketSnapshot | null;
};

export type InvestmentAggregationResult = {
  /** Listed securities / funds / crypto from the investments workspace (all rows, all kinds). */
  listedLiveNpr: number;
  listedCostNpr: number;
  listedPnlNpr: number;
  byKindNpr: Record<string, number>;
  /** Active fixed-deposit principal (investment-class banking assets). */
  fixedDepositsNpr: number;
  /** Canonical portfolio investment total = listed holdings + active FD principal. */
  totalInvestmentNpr: number;
  activeListedRowCount: number;
  listedRowCount: number;
};

const ALL_INVESTMENT_KINDS: InvestmentKind[] = [
  "nepse",
  "us_stock",
  "etf",
  "sip",
  "closed_end_mf",
  "crypto",
];

export function normalizeInvestmentKind(kind: unknown): InvestmentKind | "unknown" {
  if (typeof kind === "string" && (ALL_INVESTMENT_KINDS as string[]).includes(kind)) {
    return kind as InvestmentKind;
  }
  return "unknown";
}

function lineToNpr(
  amount: number | undefined,
  currency: PortfolioDisplayCurrency,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  return amountToNpr(amount ?? 0, currency, krwPerNpr, usdPerNpr);
}

/** Effective open quantity — prefers `quantity`, falls back to FIFO lot sum. */
export function resolveInvestmentQuantity(row: InvestmentRow): number {
  const qty = row.quantity ?? 0;
  if (qty > 0 && Number.isFinite(qty)) return qty;
  const fifoQty = (row.fifoLots ?? []).reduce((acc, lot) => {
    const q = lot.quantity ?? 0;
    return acc + (q > 0 && Number.isFinite(q) ? q : 0);
  }, 0);
  return fifoQty > 0 ? fifoQty : 0;
}

/** Weighted average unit cost in NPR from FIFO lots or legacy buy price. */
export function resolveInvestmentUnitCostNpr(
  row: InvestmentRow,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  const lots = row.fifoLots ?? [];
  if (lots.length > 0) {
    let totalQty = 0;
    let totalCostNpr = 0;
    for (const lot of lots) {
      const q = lot.quantity ?? 0;
      if (q <= 0 || !Number.isFinite(q)) continue;
      totalQty += q;
      totalCostNpr += lineToNpr(q * (lot.unitCost ?? 0), lot.currency, krwPerNpr, usdPerNpr);
    }
    if (totalQty > 0) return totalCostNpr / totalQty;
  }
  const buy = row.buyPrice ?? 0;
  if (buy > 0 && Number.isFinite(buy)) {
    return lineToNpr(buy, row.currency, krwPerNpr, usdPerNpr);
  }
  return 0;
}

/** A holding is active when it has positive quantity (direct or via FIFO). */
export function isActiveInvestmentRow(row: InvestmentRow): boolean {
  return resolveInvestmentQuantity(row) > 0;
}

/**
 * All investment rows from Supabase/local state — no category filter, pagination, or kind limit.
 * Pass the full `state.investments` array.
 */
export function allInvestmentRows(rows: InvestmentRow[]): InvestmentRow[] {
  return Array.isArray(rows) ? rows : [];
}

export function valueInvestmentRow(
  row: InvestmentRow,
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket?: MarketSnapshot | null,
): InvestmentValuation {
  const qty = resolveInvestmentQuantity(row);
  if (qty <= 0) return { costNpr: 0, liveValueNpr: 0, pnlNpr: 0 };

  const unitBuyNpr = resolveInvestmentUnitCostNpr(row, krwPerNpr, usdPerNpr);
  const costNpr = qty * unitBuyNpr;

  if (liveMarket) {
    const apiLive = resolveLiveUnitNprFromSnapshot(row, liveMarket, krwPerNpr, usdPerNpr);
    if (apiLive != null && Number.isFinite(apiLive) && apiLive > 0) {
      const liveValueNpr = qty * apiLive;
      return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
    }
  }

  const masterLive = resolveLiveUnitNpr(row.instrumentKey, usdPerNpr);
  if (masterLive != null && Number.isFinite(masterLive) && masterLive > 0 && unitBuyNpr > 0) {
    const liveValueNpr = qty * masterLive;
    return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
  }

  if (unitBuyNpr <= 0) return { costNpr: 0, liveValueNpr: 0, pnlNpr: 0 };

  const kind = normalizeInvestmentKind(row.kind);
  const multKind: InvestmentKind = kind === "unknown" ? "nepse" : kind;
  const mult = liveMarket ? 1 : mockLiveMultiplier(row.id, multKind);
  const liveUnitNpr = unitBuyNpr * mult;
  const liveValueNpr = qty * liveUnitNpr;
  return { costNpr, liveValueNpr, pnlNpr: liveValueNpr - costNpr };
}

/** Sum every listed investment row — matches the Investment workspace position total. */
export function sumListedInvestmentsNpr(
  rows: InvestmentRow[],
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket?: MarketSnapshot | null,
): { liveNpr: number; costNpr: number; pnlNpr: number; byKind: Record<string, number> } {
  const allRows = allInvestmentRows(rows);
  const byKind: Record<string, number> = {};
  let liveNpr = 0;
  let costNpr = 0;

  for (const row of allRows) {
    const v = valueInvestmentRow(row, krwPerNpr, usdPerNpr, liveMarket);
    liveNpr += v.liveValueNpr;
    costNpr += v.costNpr;
    const kind = normalizeInvestmentKind(row.kind);
    byKind[kind] = (byKind[kind] ?? 0) + v.liveValueNpr;
  }

  return { liveNpr, costNpr, pnlNpr: liveNpr - costNpr, byKind };
}

/**
 * Canonical investment aggregation for Portfolio Summary, dashboards, AI, and Return Planner.
 * Includes every investment record (all kinds) plus active fixed-deposit principal.
 */
export function aggregateInvestmentTotals(
  investments: InvestmentRow[],
  fixedDeposits: FixedDepositRow[] | undefined | null,
  opts: InvestmentAggregationOptions,
): InvestmentAggregationResult {
  const listed = sumListedInvestmentsNpr(investments, opts.krwPerNpr, opts.usdPerNpr, opts.liveMarket);
  const allRows = allInvestmentRows(investments);
  const activeListedRowCount = allRows.filter(isActiveInvestmentRow).length;
  const fixedDepositsNpr = sumFixedDepositPrincipalNpr(fixedDeposits ?? [], opts.krwPerNpr, opts.usdPerNpr);

  return {
    listedLiveNpr: listed.liveNpr,
    listedCostNpr: listed.costNpr,
    listedPnlNpr: listed.pnlNpr,
    byKindNpr: listed.byKind,
    fixedDepositsNpr,
    /** Matches Investment workspace position total (all listed rows, every kind). */
    totalInvestmentNpr: listed.liveNpr,
    activeListedRowCount,
    listedRowCount: allRows.length,
  };
}

/** @deprecated Use `sumListedInvestmentsNpr` — kept for existing imports. */
export function sumInvestmentsNpr(
  rows: InvestmentRow[],
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket?: MarketSnapshot | null,
) {
  return sumListedInvestmentsNpr(rows, krwPerNpr, usdPerNpr, liveMarket);
}
