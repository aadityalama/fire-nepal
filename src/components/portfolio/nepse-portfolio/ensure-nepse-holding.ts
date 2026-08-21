import type { InvestmentRow, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { portfolioTxnTodayIso } from "@/components/portfolio/transaction-ui/PortfolioTransactionStrip";

function newPortfolioRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Find an existing NEPSE holding or append a zero-quantity watch row so Stock Detail can open.
 * Does not record a ledger buy — the user buys from Stock Detail.
 */
export function ensureNepseHoldingRow(
  state: WealthPortfolioStateV2,
  selection: Pick<InvestmentRow, "instrumentKey" | "name" | "currency">,
): { next: WealthPortfolioStateV2; rowId: string } | null {
  const key = selection.instrumentKey?.trim();
  const name = selection.name.trim();
  if (!key && !name) return null;

  const existing = state.investments.find(
    (r) =>
      r.kind === "nepse" &&
      ((key && r.instrumentKey === key) || (!!name && r.name.trim().toLowerCase() === name.toLowerCase())),
  );
  if (existing) return { next: state, rowId: existing.id };

  const row: InvestmentRow = {
    id: newPortfolioRowId(),
    kind: "nepse",
    name: name || key || "NEPSE",
    quantity: undefined,
    buyPrice: undefined,
    currency: selection.currency ?? "NPR",
    instrumentKey: key,
    purchaseDate: portfolioTxnTodayIso(),
  };
  return { next: { ...state, investments: [...state.investments, row] }, rowId: row.id };
}
