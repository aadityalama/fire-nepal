import type { PortfolioLedgerEntry, PortfolioLedgerBucket, PortfolioLedgerTxType } from "@/components/portfolio/types";

export type LedgerScopeView = "all" | "adds" | "sells" | "dividends";

export function txToneClass(tx: PortfolioLedgerTxType): string {
  if (tx === "buy" || tx === "right_share" || tx === "bonus_share") {
    return "border-lime-400/40 bg-lime-500/10 text-lime-200";
  }
  if (tx === "cash_dividend") {
    return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";
  }
  return "border-rose-400/35 bg-rose-500/10 text-rose-100";
}

export function isAcquirePositionTx(tx: PortfolioLedgerTxType): boolean {
  return tx === "buy" || tx === "right_share" || tx === "bonus_share";
}

export function isAcquireInvestmentTx(tx: PortfolioLedgerTxType, bucket: PortfolioLedgerEntry["bucket"]): boolean {
  if (bucket !== "investment") return false;
  return isAcquirePositionTx(tx);
}

export function bucketLabel(e: PortfolioLedgerEntry): string {
  switch (e.bucket) {
    case "metal":
      return e.metal === "gold" ? "Gold" : "Silver";
    case "investment":
      return e.investmentKind?.replace(/_/g, " ") ?? "Investment";
    case "liquid_cash":
      return "Banking / cash";
    case "real_estate":
      return "Real estate";
    case "vehicle":
      return "Vehicle";
    case "liability":
      return "Liability";
    case "retirement":
      return "Retirement";
    default:
      return e.bucket;
  }
}

export function masterBucketFilterLabel(b: PortfolioLedgerBucket | "all"): string {
  if (b === "all") return "All";
  switch (b) {
    case "metal":
      return "Gold & Silver";
    case "liquid_cash":
      return "Banking";
    case "real_estate":
      return "Real estate";
    case "vehicle":
      return "Vehicles";
    case "investment":
      return "Investments";
    case "liability":
      return "Liabilities";
    case "retirement":
      return "Retirement";
    default:
      return b;
  }
}

export function filterLedgerByBucket(
  ledger: readonly PortfolioLedgerEntry[],
  bucket: PortfolioLedgerBucket,
): PortfolioLedgerEntry[] {
  return ledger.filter((e) => e.bucket === bucket);
}

export function entryMatchesScopeView(e: PortfolioLedgerEntry, view: LedgerScopeView): boolean {
  if (view === "all") return true;
  if (view === "dividends") return e.txType === "cash_dividend";
  if (view === "sells") return e.txType === "sell";
  if (view === "adds") return isAcquirePositionTx(e.txType);
  return true;
}

/** Master ledger when "All assets" is selected: "Adds" tab matches legacy unified ledger (investment adds only). */
export function entryMatchesMasterView(
  e: PortfolioLedgerEntry,
  view: LedgerScopeView,
  bucketFilter: PortfolioLedgerBucket | "all",
): boolean {
  if (view === "all") return true;
  if (view === "dividends") return e.txType === "cash_dividend";
  if (view === "sells") return e.txType === "sell";
  if (view === "adds") {
    if (bucketFilter === "all") return isAcquireInvestmentTx(e.txType, e.bucket);
    return isAcquirePositionTx(e.txType);
  }
  return true;
}

export function sortLedgerByTradeDate(
  ledger: readonly PortfolioLedgerEntry[],
  order: "asc" | "desc",
): PortfolioLedgerEntry[] {
  const mult = order === "desc" ? -1 : 1;
  return [...ledger].sort((a, b) => {
    const d = a.tradeDate.localeCompare(b.tradeDate) * mult;
    if (d !== 0) return d;
    return (a.id < b.id ? -1 : 1) * mult;
  });
}

export function entryMatchesSearch(e: PortfolioLedgerEntry, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const meta = e.meta && typeof e.meta === "object" ? (e.meta as Record<string, unknown>) : null;
  const metalTxItemName = typeof meta?.metalTxItemName === "string" ? meta.metalTxItemName : "";
  const hay = [
    e.assetLabel,
    e.notes,
    e.ledgerAction,
    e.rowId,
    bucketLabel(e),
    e.tradeDate,
    e.investmentKind,
    metalTxItemName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}
