import type {
  InvestmentKind,
  InvestmentRow,
  PortfolioLedgerEntry,
} from "@/components/portfolio/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";
import {
  resolveInvestmentQuantity,
  resolveInvestmentUnitCostNpr,
  sumListedInvestmentsNpr,
  valueInvestmentRow,
} from "@/services/portfolio/investment-aggregation";
import { buildHoldingRealtimeMetrics } from "@/services/portfolio/live-holdings-intel";
import { resolveLiveUnitNprFromSnapshot } from "@/services/portfolio/market-quotes";
import type { MarketSnapshot, NepseSecurityTick } from "@/types/market";

export type HoldingFilterId = "all" | "profit" | "loss" | "dividend_pending";

export type ChartRangeId = "7D" | "1M" | "1Y" | "ALL";

export type InvestmentCardModel = {
  row: InvestmentRow;
  symbol: string;
  companyName: string;
  sector: string | null;
  kind: InvestmentKind;
  units: number;
  waccNpr: number;
  ltpNpr: number | null;
  costNpr: number;
  currentValueNpr: number;
  totalPnlNpr: number;
  totalPnlPct: number | null;
  todayPct: number | null;
  todayPnlNpr: number | null;
  allocPct: number;
  fireImpactPct: number | null;
  cagrPct: number | null;
  sipIrrPct: number | null;
  dividendsNetNpr: number;
  realizedGainNpr: number;
  hasDividendPending: boolean;
  tick: NepseSecurityTick | null;
  initials: string;
  accentHue: number;
};

export type InvestmentPortfolioSummary = {
  portfolioValueNpr: number;
  costNpr: number;
  overallPnlNpr: number;
  portfolioReturnPct: number | null;
  todayGainLossNpr: number;
  todayGainLossPct: number | null;
  holdingCount: number;
  dividendTotalNpr: number;
  realizedGainNpr: number;
};

const KIND_LABEL: Record<InvestmentKind, string> = {
  nepse: "NEPSE",
  us_stock: "US Stock",
  etf: "ETF",
  sip: "Mutual Fund",
  closed_end_mf: "Closed MF",
  crypto: "Crypto",
};

export function kindLabel(kind: InvestmentKind): string {
  return KIND_LABEL[kind] ?? kind;
}

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

function symbolFromRow(row: InvestmentRow): string {
  const inst = getInstrumentByKey(row.instrumentKey);
  if (inst?.universe === "nepse") return inst.symbol.toUpperCase();
  if (inst?.universe === "closed_end_mf") return inst.ticker.toUpperCase();
  if (inst?.universe === "us_stock" || inst?.universe === "etf") return inst.symbol.toUpperCase();
  if (inst?.universe === "open_end_mf") {
    const code = inst.key.split(":").pop()?.toUpperCase();
    if (code) return code;
  }
  const fromKey = row.instrumentKey?.split(":").pop()?.toUpperCase();
  if (fromKey && /^[A-Z0-9.-]{2,12}$/.test(fromKey)) return fromKey;
  const tokens = row.name.trim().split(/\s+/);
  const first = tokens[0]?.toUpperCase() ?? "—";
  return first.slice(0, 8) || "—";
}

function companyNameFromRow(row: InvestmentRow, symbol: string, tick: NepseSecurityTick | null): string {
  if (tick?.companyName?.trim()) return tick.companyName.trim();
  const inst = getInstrumentByKey(row.instrumentKey);
  if (inst?.universe === "nepse" && inst.companyName) return inst.companyName;
  if (inst?.universe === "open_end_mf") return inst.fundName;
  if (inst?.universe === "closed_end_mf") return inst.fundName;
  if (inst?.universe === "us_stock") return inst.companyName;
  if (inst?.universe === "etf") return inst.name;
  const name = row.name.trim();
  if (name && name.toUpperCase() !== symbol) return name;
  return name || symbol;
}

function sectorFromRow(row: InvestmentRow, tick: NepseSecurityTick | null): string | null {
  if (tick?.sector?.trim()) return tick.sector.trim();
  const inst = getInstrumentByKey(row.instrumentKey);
  if (inst?.universe === "nepse") return inst.sector;
  if (inst?.universe === "open_end_mf" || inst?.universe === "closed_end_mf") return inst.category;
  return kindLabel(row.kind);
}

function ledgerForRow(ledger: readonly PortfolioLedgerEntry[], rowId: string): PortfolioLedgerEntry[] {
  return ledger.filter((e) => e.bucket === "investment" && e.rowId === rowId);
}

function dividendNetNpr(entries: readonly PortfolioLedgerEntry[]): number {
  return entries
    .filter((e) => e.txType === "cash_dividend")
    .reduce((sum, e) => {
      const meta = e.meta && typeof e.meta === "object" ? (e.meta as Record<string, unknown>) : null;
      const net = meta && typeof meta.dividendNetNpr === "number" ? meta.dividendNetNpr : null;
      if (net != null && Number.isFinite(net)) return sum + net;
      return sum + (Number.isFinite(e.quantity) ? e.quantity : 0);
    }, 0);
}

function realizedGainSum(entries: readonly PortfolioLedgerEntry[]): number {
  return entries
    .filter((e) => e.txType === "sell")
    .reduce((sum, e) => sum + (typeof e.realizedGainNpr === "number" && Number.isFinite(e.realizedGainNpr) ? e.realizedGainNpr : 0), 0);
}

/** Heuristic: notes/meta mention pending dividend, or dividend recorded without a clear settlement cue. */
function hasDividendPendingFlag(entries: readonly PortfolioLedgerEntry[], row: InvestmentRow): boolean {
  const pendingHint = (s: string | undefined) =>
    !!s && /pending|book\s*clos|unpaid|declared|to\s*receive/i.test(s);

  for (const e of entries) {
    if (pendingHint(e.notes) || pendingHint(e.ledgerAction)) return true;
    const meta = e.meta && typeof e.meta === "object" ? (e.meta as Record<string, unknown>) : null;
    if (meta?.dividendPending === true) return true;
    if (typeof meta?.status === "string" && pendingHint(meta.status)) return true;
  }

  const mf = row.mfDividendHistory ?? [];
  return mf.some((d) => pendingHint(d.date) || (d.amountNpr > 0 && !d.date));
}

function initialsFromSymbol(symbol: string, companyName: string): string {
  if (symbol && symbol !== "—") return symbol.slice(0, 2).toUpperCase();
  return companyName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export function buildInvestmentCardModels(
  rows: InvestmentRow[],
  ledger: readonly PortfolioLedgerEntry[],
  krwPerNpr: number,
  usdPerNpr: number,
  liveMarket: MarketSnapshot | null,
  netWorthLiveNpr: number | null,
): InvestmentCardModel[] {
  const totals = sumListedInvestmentsNpr(rows, krwPerNpr, usdPerNpr, liveMarket);
  const nw = netWorthLiveNpr != null && netWorthLiveNpr > 0 ? netWorthLiveNpr : Math.max(totals.liveNpr, 1e-9);
  const liveMetrics = buildHoldingRealtimeMetrics(rows, krwPerNpr, usdPerNpr, liveMarket, nw);
  const byId = new Map(liveMetrics.map((m) => [m.rowId, m]));

  return rows.map((row) => {
    const v = valueInvestmentRow(row, krwPerNpr, usdPerNpr, liveMarket);
    const units = resolveInvestmentQuantity(row);
    const waccNpr = resolveInvestmentUnitCostNpr(row, krwPerNpr, usdPerNpr);
    const symbol = symbolFromRow(row);
    const tick = liveMarket?.nepseBySymbol?.[symbol] ?? null;
    const companyName = companyNameFromRow(row, symbol, tick);
    const m = byId.get(row.id);
    const todayPct = m?.dayChangePct ?? tick?.changePct ?? null;
    const todayPnlNpr =
      todayPct != null && Number.isFinite(todayPct) ? (v.liveValueNpr * todayPct) / 100 : null;
    const ltp =
      liveMarket != null
        ? resolveLiveUnitNprFromSnapshot(row, liveMarket, krwPerNpr, usdPerNpr) ?? tick?.ltpNpr ?? null
        : tick?.ltpNpr ?? null;
    const entries = ledgerForRow(ledger, row.id);
    const dividendsNetNpr = dividendNetNpr(entries);
    const realizedGainNpr = realizedGainSum(entries);
    const totalPnlPct = v.costNpr > 0 ? (v.pnlNpr / v.costNpr) * 100 : null;

    return {
      row,
      symbol,
      companyName,
      sector: sectorFromRow(row, tick),
      kind: row.kind,
      units,
      waccNpr,
      ltpNpr: ltp != null && Number.isFinite(ltp) ? ltp : null,
      costNpr: v.costNpr,
      currentValueNpr: v.liveValueNpr,
      totalPnlNpr: v.pnlNpr,
      totalPnlPct,
      todayPct: todayPct != null && Number.isFinite(todayPct) ? todayPct : null,
      todayPnlNpr,
      allocPct: m?.allocationVsInvestmentsPct ?? (totals.liveNpr > 0 ? (v.liveValueNpr / totals.liveNpr) * 100 : 0),
      fireImpactPct: m?.fireNetWorthImpactPct ?? null,
      cagrPct: m?.cagrAnnualizedPct ?? null,
      sipIrrPct: m?.sipGrowthIrrPct ?? null,
      dividendsNetNpr,
      realizedGainNpr,
      hasDividendPending: hasDividendPendingFlag(entries, row),
      tick,
      initials: initialsFromSymbol(symbol, companyName),
      accentHue: hashHue(symbol || row.id),
    };
  });
}

export function summarizeInvestmentPortfolio(models: InvestmentCardModel[]): InvestmentPortfolioSummary {
  const portfolioValueNpr = models.reduce((s, m) => s + m.currentValueNpr, 0);
  const costNpr = models.reduce((s, m) => s + m.costNpr, 0);
  const overallPnlNpr = portfolioValueNpr - costNpr;
  const todayGainLossNpr = models.reduce((s, m) => s + (m.todayPnlNpr ?? 0), 0);
  const valueForToday = models.reduce((s, m) => (m.todayPnlNpr != null ? s + m.currentValueNpr : s), 0);
  const todayGainLossPct =
    valueForToday > 0 ? (todayGainLossNpr / Math.max(valueForToday - todayGainLossNpr, 1e-9)) * 100 : null;

  return {
    portfolioValueNpr,
    costNpr,
    overallPnlNpr,
    portfolioReturnPct: costNpr > 0 ? (overallPnlNpr / costNpr) * 100 : null,
    todayGainLossNpr,
    todayGainLossPct,
    holdingCount: models.length,
    dividendTotalNpr: models.reduce((s, m) => s + m.dividendsNetNpr, 0),
    realizedGainNpr: models.reduce((s, m) => s + m.realizedGainNpr, 0),
  };
}

export function filterInvestmentCards(
  models: InvestmentCardModel[],
  query: string,
  filter: HoldingFilterId,
): InvestmentCardModel[] {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (filter === "profit" && !(m.totalPnlNpr > 0)) return false;
    if (filter === "loss" && !(m.totalPnlNpr < 0)) return false;
    if (filter === "dividend_pending" && !m.hasDividendPending) return false;
    if (!q) return true;
    return (
      m.symbol.toLowerCase().includes(q) ||
      m.companyName.toLowerCase().includes(q) ||
      m.row.name.toLowerCase().includes(q) ||
      (m.sector?.toLowerCase().includes(q) ?? false) ||
      kindLabel(m.kind).toLowerCase().includes(q)
    );
  });
}

export function investmentLedgerForRow(
  ledger: readonly PortfolioLedgerEntry[],
  rowId: string,
): PortfolioLedgerEntry[] {
  return sortByTradeDateDesc(ledgerForRow(ledger, rowId));
}

export function sortByTradeDateDesc(entries: readonly PortfolioLedgerEntry[]): PortfolioLedgerEntry[] {
  return [...entries].sort((a, b) => {
    const d = b.tradeDate.localeCompare(a.tradeDate);
    if (d !== 0) return d;
    return a.id < b.id ? 1 : -1;
  });
}

export function isIpoEntry(e: PortfolioLedgerEntry): boolean {
  if (e.meta && typeof e.meta === "object" && (e.meta as Record<string, unknown>).ledgerFlow === "ipo") return true;
  return /ipo/i.test(e.ledgerAction ?? "") || /ipo/i.test(e.notes ?? "");
}

export function isFpoEntry(e: PortfolioLedgerEntry): boolean {
  if (e.meta && typeof e.meta === "object" && (e.meta as Record<string, unknown>).ledgerFlow === "fpo") return true;
  return /fpo/i.test(e.ledgerAction ?? "") || /fpo/i.test(e.notes ?? "");
}

export function isAuctionEntry(e: PortfolioLedgerEntry): boolean {
  if (e.meta && typeof e.meta === "object" && (e.meta as Record<string, unknown>).ledgerFlow === "auction") return true;
  return /auction/i.test(e.ledgerAction ?? "") || /auction/i.test(e.notes ?? "");
}

export function classifyLedgerBucket(
  e: PortfolioLedgerEntry,
):
  | "buy"
  | "sell"
  | "dividend"
  | "bonus"
  | "right"
  | "ipo"
  | "fpo"
  | "auction"
  | "other" {
  if (e.txType === "cash_dividend") return "dividend";
  if (e.txType === "bonus_share") return "bonus";
  if (e.txType === "right_share") return "right";
  if (e.txType === "sell") return "sell";
  if (isAuctionEntry(e)) return "auction";
  if (isIpoEntry(e)) return "ipo";
  if (isFpoEntry(e)) return "fpo";
  if (e.txType === "buy") return "buy";
  return "other";
}

/**
 * Synthetic performance series from cost → current mark.
 * Used when no historical price feed is available (UI-only; does not change valuations).
 */
export function buildPerformanceSeries(
  costNpr: number,
  currentValueNpr: number,
  range: ChartRangeId,
): { label: string; value: number }[] {
  const points =
    range === "7D" ? 7 : range === "1M" ? 30 : range === "1Y" ? 12 : Math.max(8, 24);
  const start = Math.max(0, costNpr);
  const end = Math.max(0, currentValueNpr);
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < points; i += 1) {
    const t = points === 1 ? 1 : i / (points - 1);
    const eased = t * t * (3 - 2 * t);
    const noise = Math.sin(i * 1.7) * 0.012 * (end || start || 1);
    const value = start + (end - start) * eased + noise * (i === points - 1 ? 0 : 1);
    const label =
      range === "1Y" || range === "ALL"
        ? `P${i + 1}`
        : `D${i + 1}`;
    out.push({ label, value: Math.max(0, value) });
  }
  if (out.length) out[out.length - 1]!.value = end;
  return out;
}

export function formatCompactNpr(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(2)} L`;
  return `${sign}${abs.toLocaleString("en-NP", { maximumFractionDigits: 0 })}`;
}

export function formatSignedPct(p: number | null | undefined, digits = 2): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
}
