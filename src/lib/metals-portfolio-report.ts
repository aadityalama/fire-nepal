/**
 * Gold & Silver portfolio report snapshot builder.
 * Reuses the existing metals calculation engine — no report-specific formulas.
 */

import {
  annualizedCagrFraction,
  calendarDaysInvested,
  formatCagrPct,
  formatHoldingDurationApprox,
  parsePurchaseIso,
} from "@/components/portfolio/holding-stats";
import {
  metalHoldingCalendarDays,
  metalHoldingCalendarDaysForMetal,
  metalRowFirstBuyIso,
  roiPct,
  rollupAllMetals,
  rollupMetalBucket,
  type MetalRatePair,
} from "@/components/portfolio/metals-premium-metrics";
import type { MetalRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { gramsToTolaUi } from "@/lib/portfolio/nepal-metal-ui-convert";
import {
  HAMRO_PATRO_GOLD_SOURCE_URL,
  resolveNepalMarketFreshness,
  type NepalMarketFreshness,
} from "@/services/market/hamropatro-nepal-rates";
import type { GoldSilverPriceResponse } from "@/types/market/bullion";

export type MetalsReportMetalFilter = "all" | "gold" | "silver";

export type MetalsReportSectionId =
  | "summary"
  | "holdings"
  | "purchases"
  | "sales"
  | "performance";

export type MetalsReportSections = Record<MetalsReportSectionId, boolean>;

export const DEFAULT_METALS_REPORT_SECTIONS: MetalsReportSections = {
  summary: true,
  holdings: true,
  purchases: true,
  sales: true,
  performance: true,
};

export type MetalsReportHoldingLine = {
  id: string;
  name: string;
  metal: "gold" | "silver";
  purchaseDate: string | null;
  grams: number;
  tola: number;
  weightUnit: "grams";
  purchasePricePerGram: number | null;
  feesNpr: number | null;
  costBasisNpr: number | null;
  currentValueNpr: number;
  profitLossNpr: number | null;
  roiPct: number | null;
  holdingDays: number | null;
  holdingDurationLabel: string;
  cagrFraction: number | null;
  cagrLabel: string;
  cagrIsAnnualizedShortPeriod: boolean;
};

export type MetalsReportTxnLine = {
  id: string;
  tradeDate: string;
  itemName: string;
  metal: "gold" | "silver";
  txType: "buy" | "sell";
  quantityGrams: number;
  unit: "grams";
  unitPriceNprPerGram: number;
  feesNpr: number;
  totalAmountNpr: number;
  realizedProfitNpr: number | null;
  notes: string | null;
};

export type MetalsReportMetalSummary = {
  metal: "gold" | "silver";
  grams: number;
  tola: number;
  purchaseCostNpr: number;
  currentValueNpr: number;
  profitLossNpr: number | null;
  roiPct: number | null;
  holdingDays: number | null;
  holdingDurationLabel: string;
  cagrFraction: number | null;
  cagrLabel: string;
  cagrIsAnnualizedShortPeriod: boolean;
  holdings: MetalsReportHoldingLine[];
};

export type MetalsReportMarketSnapshot = {
  goldPerGramNpr: number | null;
  goldPerTolaNpr: number | null;
  silverPerGramNpr: number | null;
  silverPerTolaNpr: number | null;
  goldDailyChangeNpr: number | null;
  goldDailyChangePct: number | null;
  silverDailyChangeNpr: number | null;
  silverDailyChangePct: number | null;
  publishedDate: string | null;
  publishedTimeLocal: string | null;
  publishedBsLabel: string | null;
  syncedAtIso: string | null;
  freshness: NepalMarketFreshness;
  statusLabel: string;
  sourceLabel: string;
  sourceUrl: string;
  priceUnavailable: boolean;
  staleDisclosed: boolean;
};

export type MetalsReportSnapshot = {
  reportType: MetalsReportMetalFilter;
  reportTypeLabel: string;
  referenceNumber: string;
  currency: "NPR";
  generatedAt: Date;
  generatedDateLabel: string;
  generatedTimeLabel: string;
  valuationDateLabel: string;
  reportPeriodLabel: string;
  memberFullName: string;
  memberId: string | null;
  sections: MetalsReportSections;
  market: MetalsReportMarketSnapshot;
  summary: {
    totalInvestmentNpr: number;
    currentValueNpr: number;
    profitLossNpr: number | null;
    roiPct: number | null;
    cagrFraction: number | null;
    cagrLabel: string;
    cagrIsAnnualizedShortPeriod: boolean;
    holdingDays: number | null;
    holdingDurationLabel: string;
    goldGrams: number;
    silverGrams: number;
    goldTola: number;
    silverTola: number;
    holdingsCount: number;
    netWorthSharePct: number | null;
    realizedProfitNpr: number;
    unrealizedProfitNpr: number | null;
    totalFeesNpr: number;
  };
  allocation: {
    goldValueNpr: number;
    silverValueNpr: number;
    goldPct: number;
    silverPct: number;
    totalValueNpr: number;
  };
  gold: MetalsReportMetalSummary;
  silver: MetalsReportMetalSummary;
  purchases: MetalsReportTxnLine[];
  sales: MetalsReportTxnLine[];
};

const NEPAL_TZ = "Asia/Kathmandu";

export function formatNepalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NEPAL_TZ,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatNepalTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NEPAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatNepalDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NEPAL_TZ }).format(date);
}

export function metalsReportFilename(generatedAt: Date = new Date()): string {
  return `FIRE-Nepal-Gold-Silver-Report-${formatNepalDateKey(generatedAt)}.pdf`;
}

export function generateMetalsReportReference(generatedAt: Date = new Date()): string {
  const key = formatNepalDateKey(generatedAt).replace(/-/g, "");
  const t = formatNepalTime(generatedAt).replace(/[^0-9]/g, "").slice(0, 6);
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `FN-GS-${key}-${t || "000000"}-${suffix}`;
}

export function metalsReportTypeLabel(filter: MetalsReportMetalFilter): string {
  if (filter === "gold") return "Gold Only Report";
  if (filter === "silver") return "Silver Only Report";
  return "Complete Gold & Silver Report";
}

function freshnessStatusLabel(freshness: NepalMarketFreshness, unavailable: boolean): string {
  if (unavailable || freshness === "unavailable") return "Price Unavailable";
  if (freshness === "stale") return "Stale — last successful sync (disclosed)";
  if (freshness === "updating") return "Updating";
  if (freshness === "updated_today") return "Updated today (Nepal Time)";
  return "Last published market day";
}

function moneyAbs(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function filterRows(rows: readonly MetalRow[], filter: MetalsReportMetalFilter): MetalRow[] {
  if (filter === "all") return rows.slice();
  return rows.filter((r) => r.metal === filter);
}

function holdingFeesFromLedger(rowId: string, ledger: readonly PortfolioLedgerEntry[]): number | null {
  let sum = 0;
  let found = false;
  for (const e of ledger) {
    if (e.bucket !== "metal" || e.rowId !== rowId || e.txType !== "buy") continue;
    const f = e.fees;
    if (typeof f === "number" && Number.isFinite(f) && f > 0) {
      sum += f;
      found = true;
    }
  }
  return found ? sum : null;
}

function buildHoldingLine(
  row: MetalRow,
  ledger: readonly PortfolioLedgerEntry[],
  rates: MetalRatePair,
  asOf: Date,
): MetalsReportHoldingLine | null {
  const grams = row.grams ?? 0;
  if (grams <= 0) return null;
  const rate = row.metal === "gold" ? rates.goldNprPerGram : rates.silverNprPerGram;
  const currentValueNpr = grams * rate;
  const costBasisNpr =
    typeof row.totalCostBasisNpr === "number" && row.totalCostBasisNpr > 0 ? row.totalCostBasisNpr : null;
  const purchasePricePerGram =
    costBasisNpr != null && grams > 0 ? costBasisNpr / grams : row.metalBuyPriceAmount ?? null;
  const firstBuyIso = metalRowFirstBuyIso(row, ledger);
  const start = parsePurchaseIso(firstBuyIso);
  const holdingDays = start ? calendarDaysInvested(start, asOf) : null;
  const cagrFraction =
    costBasisNpr != null && holdingDays != null && holdingDays >= 1
      ? annualizedCagrFraction(costBasisNpr, currentValueNpr, holdingDays)
      : null;
  const pl = costBasisNpr != null ? currentValueNpr - costBasisNpr : null;

  return {
    id: row.id,
    name: row.name?.trim() || (row.metal === "gold" ? "Gold holding" : "Silver holding"),
    metal: row.metal,
    purchaseDate: firstBuyIso ?? null,
    grams,
    tola: gramsToTolaUi(grams),
    weightUnit: "grams",
    purchasePricePerGram:
      purchasePricePerGram != null && Number.isFinite(purchasePricePerGram) ? purchasePricePerGram : null,
    feesNpr: holdingFeesFromLedger(row.id, ledger),
    costBasisNpr,
    currentValueNpr,
    profitLossNpr: pl,
    roiPct: costBasisNpr != null ? roiPct(costBasisNpr, currentValueNpr) : null,
    holdingDays,
    holdingDurationLabel: holdingDays != null ? formatHoldingDurationApprox(holdingDays) : "—",
    cagrFraction,
    cagrLabel: formatCagrPct(cagrFraction, 2),
    cagrIsAnnualizedShortPeriod: holdingDays != null && holdingDays < 365,
  };
}

function buildMetalSummary(
  metal: "gold" | "silver",
  rows: readonly MetalRow[],
  ledger: readonly PortfolioLedgerEntry[],
  rates: MetalRatePair,
  asOf: Date,
): MetalsReportMetalSummary {
  const rollup = rollupMetalBucket(rows, metal, rates);
  const days = metalHoldingCalendarDaysForMetal(rows, metal, ledger);
  const purchase = rollup.basisSumNpr;
  const current = rollup.currentNpr;
  const cagrFraction =
    days != null && days >= 1 && purchase > 0 ? annualizedCagrFraction(purchase, current, days) : null;
  const holdings = rows
    .filter((r) => r.metal === metal)
    .map((r) => buildHoldingLine(r, ledger, rates, asOf))
    .filter((h): h is MetalsReportHoldingLine => h != null)
    .sort((a, b) => (a.purchaseDate ?? "").localeCompare(b.purchaseDate ?? "") || a.name.localeCompare(b.name));

  return {
    metal,
    grams: rollup.grams,
    tola: gramsToTolaUi(rollup.grams),
    purchaseCostNpr: purchase,
    currentValueNpr: current,
    profitLossNpr: purchase > 0 ? current - purchase : null,
    roiPct: roiPct(purchase, current),
    holdingDays: days,
    holdingDurationLabel: days != null ? formatHoldingDurationApprox(days) : "—",
    cagrFraction,
    cagrLabel: formatCagrPct(cagrFraction, 2),
    cagrIsAnnualizedShortPeriod: days != null && days < 365,
    holdings,
  };
}

function txnTotalAmount(e: PortfolioLedgerEntry): number {
  const qty = e.quantity ?? 0;
  const px = e.unitPrice ?? 0;
  const fees = typeof e.fees === "number" && Number.isFinite(e.fees) ? e.fees : 0;
  if (e.txType === "buy") return qty * px + fees;
  return Math.max(0, qty * px - fees);
}

function toTxnLine(e: PortfolioLedgerEntry): MetalsReportTxnLine | null {
  if (e.txType !== "buy" && e.txType !== "sell") return null;
  if (e.metal !== "gold" && e.metal !== "silver") return null;
  const fees = typeof e.fees === "number" && Number.isFinite(e.fees) ? e.fees : 0;
  const notes = typeof e.notes === "string" && e.notes.trim() ? e.notes.trim() : null;
  return {
    id: e.id,
    tradeDate: e.tradeDate,
    itemName: e.assetLabel?.trim() || (e.metal === "gold" ? "Gold" : "Silver"),
    metal: e.metal,
    txType: e.txType,
    quantityGrams: e.quantity ?? 0,
    unit: "grams",
    unitPriceNprPerGram: e.unitPrice ?? 0,
    feesNpr: fees,
    totalAmountNpr: txnTotalAmount(e),
    realizedProfitNpr:
      e.txType === "sell" && typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr)
        ? e.realizedGainNpr
        : null,
    notes,
  };
}

function buildMarketSnapshot(
  bullionSpot: GoldSilverPriceResponse | null | undefined,
  gramRates: MetalRatePair,
  tolaRates: { goldNprPerTola: number; silverNprPerTola: number },
): MetalsReportMarketSnapshot {
  const hasDomestic =
    Boolean(bullionSpot?.nepalDomesticPrimary) &&
    (bullionSpot?.goldPerTolaNPR ?? 0) > 0 &&
    (bullionSpot?.silverPerTolaNPR ?? 0) > 0;
  const unavailable =
    bullionSpot?.domesticProvider === "unavailable" ||
    (!hasDomestic && Boolean(bullionSpot) && !(gramRates.goldNprPerGram > 0 && gramRates.silverNprPerGram > 0));
  const freshness = resolveNepalMarketFreshness({
    publishedDate: bullionSpot?.publishedDate,
    degraded: bullionSpot?.degraded,
    hasPrice: !unavailable && gramRates.goldNprPerGram > 0 && gramRates.silverNprPerGram > 0,
  });
  const priceUnavailable = unavailable || freshness === "unavailable" || !(gramRates.goldNprPerGram > 0);

  return {
    goldPerGramNpr: priceUnavailable ? null : gramRates.goldNprPerGram || null,
    goldPerTolaNpr: priceUnavailable ? null : tolaRates.goldNprPerTola || null,
    silverPerGramNpr: priceUnavailable ? null : gramRates.silverNprPerGram || null,
    silverPerTolaNpr: priceUnavailable ? null : tolaRates.silverNprPerTola || null,
    goldDailyChangeNpr: bullionSpot?.goldDailyChangeNpr ?? null,
    goldDailyChangePct: bullionSpot?.goldDailyChangePct ?? null,
    silverDailyChangeNpr: bullionSpot?.silverDailyChangeNpr ?? null,
    silverDailyChangePct: bullionSpot?.silverDailyChangePct ?? null,
    publishedDate: bullionSpot?.publishedDate ?? null,
    publishedTimeLocal: bullionSpot?.publishedTimeLocal ?? null,
    publishedBsLabel: bullionSpot?.publishedBsLabel ?? null,
    syncedAtIso: bullionSpot?.updatedAt ?? null,
    freshness,
    statusLabel: freshnessStatusLabel(freshness, priceUnavailable),
    sourceLabel: "Hamro Patro",
    sourceUrl: bullionSpot?.sourceUrl ?? HAMRO_PATRO_GOLD_SOURCE_URL,
    priceUnavailable,
    staleDisclosed: freshness === "stale" || Boolean(bullionSpot?.degraded),
  };
}

export type BuildMetalsPortfolioReportInput = {
  rows: readonly MetalRow[];
  ledger?: readonly PortfolioLedgerEntry[];
  gramRates: MetalRatePair;
  tolaRates: { goldNprPerTola: number; silverNprPerTola: number };
  bullionSpot?: GoldSilverPriceResponse | null;
  netWorthNpr?: number | null;
  memberFullName?: string | null;
  memberId?: string | null;
  metalFilter?: MetalsReportMetalFilter;
  sections?: MetalsReportSections;
  generatedAt?: Date;
  referenceNumber?: string;
};

export function buildMetalsPortfolioReportSnapshot(
  input: BuildMetalsPortfolioReportInput,
): MetalsReportSnapshot {
  const generatedAt = input.generatedAt ?? new Date();
  const metalFilter = input.metalFilter ?? "all";
  const sections = { ...DEFAULT_METALS_REPORT_SECTIONS, ...(input.sections ?? {}) };
  const ledgerAll = input.ledger ?? [];
  const rows = filterRows(input.rows, metalFilter);
  const rates = input.gramRates;

  const all = rollupAllMetals(rows, rates);
  const gold = buildMetalSummary("gold", rows, ledgerAll, rates, generatedAt);
  const silver = buildMetalSummary("silver", rows, ledgerAll, rates, generatedAt);
  const days = metalHoldingCalendarDays(rows, ledgerAll);
  const purchase = all.basisSumNpr;
  const current = all.currentNpr;
  const cagrFraction =
    days != null && days >= 1 && purchase > 0 ? annualizedCagrFraction(purchase, current, days) : null;

  const metalLedger = ledgerAll.filter((e) => e.bucket === "metal");
  const scopedMetalLedger = filterLedgerByMetal(metalLedger, metalFilter);

  const realizedProfitNpr = scopedMetalLedger.reduce((acc, e) => {
    if (e.txType !== "sell") return acc;
    const r = e.realizedGainNpr;
    return acc + (typeof r === "number" && Number.isFinite(r) ? r : 0);
  }, 0);

  const totalFeesNpr = scopedMetalLedger.reduce((acc, e) => {
    const f = e.fees;
    return acc + (typeof f === "number" && Number.isFinite(f) ? f : 0);
  }, 0);

  const unrealizedProfitNpr = purchase > 0 ? current - purchase : null;
  const nw = input.netWorthNpr ?? 0;
  const netWorthSharePct = nw > 0 && Number.isFinite(current) ? (current / nw) * 100 : null;

  const goldValue = gold.grams > 0 ? gold.currentValueNpr : 0;
  const silverValue = silver.grams > 0 ? silver.currentValueNpr : 0;
  const allocTotal = goldValue + silverValue;
  const goldPct = allocTotal > 0 ? (goldValue / allocTotal) * 100 : 0;
  const silverPct = allocTotal > 0 ? (silverValue / allocTotal) * 100 : 0;

  const purchases = scopedMetalLedger
    .filter((e) => e.txType === "buy")
    .map(toTxnLine)
    .filter((t): t is MetalsReportTxnLine => t != null)
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.itemName.localeCompare(b.itemName));

  const sales = scopedMetalLedger
    .filter((e) => e.txType === "sell")
    .map(toTxnLine)
    .filter((t): t is MetalsReportTxnLine => t != null)
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.itemName.localeCompare(b.itemName));

  const periodStartCandidates = [
    ...purchases.map((p) => p.tradeDate),
    ...rows.map((r) => metalRowFirstBuyIso(r, ledgerAll)).filter(Boolean),
  ].filter((d): d is string => Boolean(d));
  periodStartCandidates.sort();
  const periodStart = periodStartCandidates[0] ?? null;
  const periodEnd = formatNepalDateKey(generatedAt);
  const reportPeriodLabel = periodStart
    ? `${periodStart} to ${periodEnd} (Nepal Time)`
    : `As of ${periodEnd} (Nepal Time)`;

  const market = buildMarketSnapshot(input.bullionSpot, rates, input.tolaRates);

  return {
    reportType: metalFilter,
    reportTypeLabel: metalsReportTypeLabel(metalFilter),
    referenceNumber: input.referenceNumber ?? generateMetalsReportReference(generatedAt),
    currency: "NPR",
    generatedAt,
    generatedDateLabel: `${formatNepalDate(generatedAt)} (Nepal Time)`,
    generatedTimeLabel: `${formatNepalTime(generatedAt)} Nepal Time`,
    valuationDateLabel: market.publishedDate
      ? `Market published ${market.publishedDate}${market.publishedTimeLocal ? ` ${market.publishedTimeLocal}` : ""} (Nepal Time)`
      : `As of ${formatNepalDate(generatedAt)} (Nepal Time)`,
    reportPeriodLabel,
    memberFullName: (input.memberFullName ?? "").trim() || "FIRE Nepal Member",
    memberId: input.memberId?.trim() || null,
    sections,
    market,
    summary: {
      totalInvestmentNpr: moneyAbs(purchase),
      currentValueNpr: moneyAbs(current),
      profitLossNpr: purchase > 0 ? current - purchase : null,
      roiPct: roiPct(purchase, current),
      cagrFraction,
      cagrLabel: formatCagrPct(cagrFraction, 2),
      cagrIsAnnualizedShortPeriod: days != null && days < 365,
      holdingDays: days,
      holdingDurationLabel: days != null ? formatHoldingDurationApprox(days) : "—",
      goldGrams: gold.grams,
      silverGrams: silver.grams,
      goldTola: gold.tola,
      silverTola: silver.tola,
      holdingsCount: rows.filter((r) => (r.grams ?? 0) > 0).length,
      netWorthSharePct,
      realizedProfitNpr,
      unrealizedProfitNpr,
      totalFeesNpr,
    },
    allocation: {
      goldValueNpr: goldValue,
      silverValueNpr: silverValue,
      goldPct,
      silverPct,
      totalValueNpr: allocTotal,
    },
    gold,
    silver,
    purchases,
    sales,
  };
}

function filterLedgerByMetal(
  ledger: readonly PortfolioLedgerEntry[],
  filter: MetalsReportMetalFilter,
): PortfolioLedgerEntry[] {
  if (filter === "all") return ledger.slice();
  return ledger.filter((e) => e.metal === filter);
}

/** Format NPR for searchable PDF / report text (ASCII-safe). */
export function formatReportNpr(value: number | null | undefined, signed = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(Math.round(value));
  const body = `NPR ${abs.toLocaleString("en-IN")}`;
  if (!signed) return value < 0 ? `-${body}` : body;
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return body;
}

export function formatReportPct(value: number | null | undefined, digits = 2, signed = true): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const body = `${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}%`;
  if (!signed) return value < 0 ? `-${body}` : body;
  if (value > 0) return `+${body}`;
  if (value < 0) return `-${body}`;
  return body;
}
