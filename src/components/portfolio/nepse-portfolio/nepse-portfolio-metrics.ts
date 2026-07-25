import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";
import {
  resolveInvestmentQuantity,
  resolveInvestmentUnitCostNpr,
  valueInvestmentRow,
  sumListedInvestmentsNpr,
} from "@/services/portfolio/investment-aggregation";
import { buildHoldingRealtimeMetrics } from "@/services/portfolio/live-holdings-intel";
import type { MarketSnapshot } from "@/types/market";

export type NepseHoldingRow = {
  row: InvestmentRow;
  symbol: string;
  companyName: string;
  costNpr: number;
  liveNpr: number;
  pnlNpr: number;
  dayChangePct: number | null;
  dayChangeNpr: number | null;
  waccNpr: number;
  currentUnits: number;
  soldUnits: number;
  soldValueNpr: number;
  realizedGainNpr: number;
  dividendNpr: number;
};

export type NepsePortfolioSummary = {
  portfolioValueNpr: number;
  costNpr: number;
  overallPnlNpr: number;
  portfolioReturnPct: number | null;
  todayGainNpr: number;
  todayGainPct: number | null;
  unrealizedGainNpr: number;
  realizedGainNpr: number;
  sparkline: number[];
  holdings: NepseHoldingRow[];
};

function resolveSymbolAndName(row: InvestmentRow): { symbol: string; companyName: string } {
  const inst = getInstrumentByKey(row.instrumentKey);
  if (inst?.universe === "nepse") {
    return { symbol: inst.symbol.toUpperCase(), companyName: inst.companyName || row.name };
  }
  if (inst?.universe === "closed_end_mf") {
    return { symbol: inst.ticker.toUpperCase(), companyName: inst.fundName || row.name };
  }
  if (inst?.universe === "open_end_mf") {
    const code = inst.key.split(":").pop()?.toUpperCase() ?? row.name.slice(0, 6).toUpperCase();
    return { symbol: code, companyName: inst.fundName || row.name };
  }
  if (inst?.universe === "us_stock" || inst?.universe === "etf") {
    return {
      symbol: inst.symbol.toUpperCase(),
      companyName: ("companyName" in inst ? inst.companyName : inst.name) || row.name,
    };
  }
  const raw = row.name.trim();
  const token = raw.split(/\s+/)[0] || "—";
  const symbol = token.length <= 8 ? token.toUpperCase() : token.slice(0, 6).toUpperCase();
  return { symbol, companyName: raw || "Untitled" };
}

function dayGainFromLive(liveNpr: number, dayChangePct: number | null): number | null {
  if (dayChangePct == null || !Number.isFinite(dayChangePct) || !Number.isFinite(liveNpr)) return null;
  const denom = 1 + dayChangePct / 100;
  if (denom === 0) return null;
  const prior = liveNpr / denom;
  return liveNpr - prior;
}

function ledgerStatsForRow(ledger: readonly PortfolioLedgerEntry[], rowId: string) {
  let soldUnits = 0;
  let soldValueNpr = 0;
  let realizedGainNpr = 0;
  let dividendNpr = 0;
  for (const e of ledger) {
    if (e.bucket !== "investment" || e.rowId !== rowId) continue;
    if (e.txType === "sell") {
      soldUnits += e.quantity > 0 ? e.quantity : 0;
      soldValueNpr += (e.quantity || 0) * (e.unitPrice || 0);
      if (typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr)) {
        realizedGainNpr += e.realizedGainNpr;
      }
    }
    if (e.txType === "cash_dividend") {
      dividendNpr += (e.quantity || 0) * (e.unitPrice || 0);
    }
  }
  return { soldUnits, soldValueNpr, realizedGainNpr, dividendNpr };
}

export function buildNepsePortfolioSummary(
  rows: InvestmentRow[],
  ledger: readonly PortfolioLedgerEntry[],
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket: MarketSnapshot | null,
  netWorthLiveNpr: number | null,
): NepsePortfolioSummary {
  const totals = sumListedInvestmentsNpr(rows, krwPerNpr, usdPerNpr, liveMarket);
  const nw = netWorthLiveNpr != null && netWorthLiveNpr > 0 ? netWorthLiveNpr : Math.max(totals.liveNpr, 1e-9);
  const metrics = buildHoldingRealtimeMetrics(rows, krwPerNpr, usdPerNpr, liveMarket, nw);
  const metricsById = new Map(metrics.map((m) => [m.rowId, m]));

  const holdings: NepseHoldingRow[] = rows
    .map((row) => {
      const v = valueInvestmentRow(row, krwPerNpr, usdPerNpr, liveMarket);
      const m = metricsById.get(row.id);
      const { symbol, companyName } = resolveSymbolAndName(row);
      const dayChangePct = m?.dayChangePct ?? null;
      const dayChangeNpr = dayGainFromLive(v.liveValueNpr, dayChangePct);
      const stats = ledgerStatsForRow(ledger, row.id);
      return {
        row,
        symbol,
        companyName,
        costNpr: v.costNpr,
        liveNpr: v.liveValueNpr,
        pnlNpr: v.pnlNpr,
        dayChangePct,
        dayChangeNpr,
        waccNpr: resolveInvestmentUnitCostNpr(row, krwPerNpr, usdPerNpr),
        currentUnits: resolveInvestmentQuantity(row),
        soldUnits: stats.soldUnits,
        soldValueNpr: stats.soldValueNpr,
        realizedGainNpr: stats.realizedGainNpr,
        dividendNpr: stats.dividendNpr,
      };
    })
    .sort((a, b) => b.liveNpr - a.liveNpr);

  let todayGainNpr = 0;
  let todayGainKnown = false;
  for (const h of holdings) {
    if (h.dayChangeNpr != null) {
      todayGainNpr += h.dayChangeNpr;
      todayGainKnown = true;
    }
  }

  const portfolioValueNpr = totals.liveNpr;
  const costNpr = totals.costNpr;
  const overallPnlNpr = totals.pnlNpr;
  const portfolioReturnPct = costNpr > 0 ? (overallPnlNpr / costNpr) * 100 : null;
  const todayGainPct =
    todayGainKnown && portfolioValueNpr - todayGainNpr > 0
      ? (todayGainNpr / (portfolioValueNpr - todayGainNpr)) * 100
      : null;

  const realizedGainNpr = holdings.reduce((a, h) => a + h.realizedGainNpr, 0);
  const prior = portfolioValueNpr - (todayGainKnown ? todayGainNpr : 0);
  const sparkline =
    holdings.length === 0
      ? [0, 0, 0, 0, 0, 0, 0, 0]
      : [
          prior * 0.97,
          prior * 0.985,
          prior * 0.99,
          prior * 1.002,
          prior * 0.998,
          prior * 1.01,
          prior,
          portfolioValueNpr,
        ];

  return {
    portfolioValueNpr,
    costNpr,
    overallPnlNpr,
    portfolioReturnPct,
    todayGainNpr: todayGainKnown ? todayGainNpr : 0,
    todayGainPct,
    unrealizedGainNpr: overallPnlNpr,
    realizedGainNpr,
    sparkline,
    holdings,
  };
}

export function formatSignedPct(p: number | null | undefined, digits = 2): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
}

export function investmentLedgerEntries(
  ledger: readonly PortfolioLedgerEntry[],
  rowId?: string,
): PortfolioLedgerEntry[] {
  return ledger
    .filter((e) => e.bucket === "investment" && (rowId == null || e.rowId === rowId))
    .slice()
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}

export const TRADE_TX_TYPES = new Set(["buy", "sell"]);
export const CORPORATE_TX_TYPES = new Set(["cash_dividend", "bonus_share", "right_share"]);

export function isIpoOrFpo(entry: PortfolioLedgerEntry): boolean {
  const action = (entry.ledgerAction ?? "").toLowerCase();
  const notes = (entry.notes ?? "").toLowerCase();
  const flow = String(entry.meta?.ledgerFlow ?? "").toLowerCase();
  return action.includes("ipo") || notes.includes("fpo") || notes.includes("ipo") || flow === "ipo";
}
