import type { BizTransactionRow, PurchaseRow, SaleRow } from "@/lib/fire-biz/types";

export type ProfitLossReport = {
  revenue: number;
  purchases: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  from: string;
  to: string;
};

export function computeProfitLoss(
  sales: SaleRow[],
  purchases: PurchaseRow[],
  transactions: BizTransactionRow[],
  from: string,
  to: string,
): ProfitLossReport {
  const inRange = (date: string) => date >= from && date <= to;

  const revenue = sales
    .filter((s) => inRange(s.sale_date))
    .reduce((sum, s) => sum + Number(s.total_amount), 0);

  const purchaseTotal = purchases
    .filter((p) => inRange(p.purchase_date))
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  const expenses = transactions
    .filter((t) => t.transaction_type === "expense" && inRange(t.transaction_date))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const grossProfit = revenue - purchaseTotal;
  const netProfit = grossProfit - expenses;

  return { revenue, purchases: purchaseTotal, expenses, grossProfit, netProfit, from, to };
}

export function defaultProfitLossRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = now;
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
