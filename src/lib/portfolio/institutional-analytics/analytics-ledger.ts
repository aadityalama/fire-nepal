import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import type { NepseHoldingRow } from "@/components/portfolio/nepse-portfolio/nepse-portfolio-metrics";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isUsableOpenedAt(value: string | undefined): value is string {
  return !!value && ISO_DATE.test(value) && value !== "1970-01-01";
}

function rowHasInvestmentBuy(ledger: readonly PortfolioLedgerEntry[], rowId: string): boolean {
  return ledger.some(
    (e) =>
      e.bucket === "investment" &&
      e.rowId === rowId &&
      (e.txType === "buy" || e.txType === "right_share") &&
      e.quantity > 0,
  );
}

/**
 * Analytics equity curve replays ledger buys/sells. Many portfolios store open
 * quantity on the investment row (and optional FIFO lots) without matching buy
 * ledger rows — especially older / edited holdings. Without buys, the curve is
 * empty and every history-dependent metric becomes unavailable.
 *
 * This synthesizes buy legs only when a row has no investment buys, using the
 * user's declared lots / quantity / cost / purchase date. It never invents
 * prices or dates.
 */
export function resolveAnalyticsLedger(
  holdings: NepseHoldingRow[],
  ledger: readonly PortfolioLedgerEntry[],
): { ledger: PortfolioLedgerEntry[]; synthesizedBuyCount: number } {
  const out: PortfolioLedgerEntry[] = [...ledger];
  let synthesizedBuyCount = 0;

  for (const h of holdings) {
    if (rowHasInvestmentBuy(ledger, h.row.id)) continue;

    const lots = (h.row.fifoLots ?? []).filter((lot) => lot.quantity > 0 && Number.isFinite(lot.quantity));
    if (lots.length) {
      let added = 0;
      for (const lot of lots) {
        const tradeDate = isUsableOpenedAt(lot.openedAt)
          ? lot.openedAt
          : isUsableOpenedAt(h.row.purchaseDate)
            ? h.row.purchaseDate!
            : null;
        if (!tradeDate) continue;
        const unitPrice = Number.isFinite(lot.unitCost) && lot.unitCost >= 0 ? lot.unitCost : h.waccNpr;
        if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
        out.push({
          id: `analytics-synth-${h.row.id}-${lot.id}`,
          txType: "buy",
          bucket: "investment",
          rowId: h.row.id,
          assetLabel: h.symbol,
          investmentKind: h.row.kind,
          quantity: lot.quantity,
          unitPrice,
          currency: lot.currency ?? h.row.currency ?? "NPR",
          tradeDate,
          fees: lot.fees,
          meta: { analyticsSynthetic: true, source: "fifo_lot" },
        });
        added += 1;
      }
      synthesizedBuyCount += added;
      continue;
    }

    const qty =
      h.currentUnits > 0
        ? h.currentUnits
        : typeof h.row.quantity === "number" && h.row.quantity > 0
          ? h.row.quantity
          : 0;
    const unitPrice =
      h.waccNpr > 0
        ? h.waccNpr
        : typeof h.row.buyPrice === "number" && h.row.buyPrice >= 0
          ? h.row.buyPrice
          : h.avgCostNpr;
    const tradeDate = isUsableOpenedAt(h.row.purchaseDate) ? h.row.purchaseDate! : null;
    if (qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !tradeDate) continue;

    out.push({
      id: `analytics-synth-${h.row.id}-position`,
      txType: "buy",
      bucket: "investment",
      rowId: h.row.id,
      assetLabel: h.symbol,
      investmentKind: h.row.kind,
      quantity: qty,
      unitPrice,
      currency: h.row.currency ?? "NPR",
      tradeDate,
      meta: { analyticsSynthetic: true, source: "position" },
    });
    synthesizedBuyCount += 1;
  }

  return { ledger: out, synthesizedBuyCount };
}

export function missingEodSymbols(
  holdings: NepseHoldingRow[],
  eodBySymbol: Record<string, { tradeDate: string; closeNpr: number }[]>,
): string[] {
  const missing: string[] = [];
  for (const h of holdings) {
    if (h.currentUnits <= 1e-9 && h.liveNpr <= 0) continue;
    const bars = eodBySymbol[h.symbol] ?? [];
    if (!bars.length) missing.push(h.symbol);
  }
  return [...new Set(missing)].sort();
}
