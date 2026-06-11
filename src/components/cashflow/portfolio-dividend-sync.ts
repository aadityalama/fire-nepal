import { loadCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";

/** Fired after programmatic cashflow localStorage updates (e.g. portfolio dividend sync). */
export const CASHFLOW_EXTERNAL_SYNC_EVENT = "fire-nepal-cashflow-sync";

/**
 * Adds net NPR from a portfolio cash dividend into Cashflow `income.dividendIncome`
 * (same monthly field users edit on the Cashflow dashboard).
 */
export function addDividendIncomeToCashflowStorage(netDividendNpr: number, userId?: string | null): void {
  if (typeof window === "undefined" || !Number.isFinite(netDividendNpr) || netDividendNpr <= 0) return;
  try {
    const cur = loadCashflowState(userId);
    const prev = cur.income.dividendIncome ?? 0;
    const next = {
      ...cur,
      income: { ...cur.income, dividendIncome: prev + netDividendNpr },
    };
    saveCashflowState(next, userId);
    window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));
  } catch {
    /* ignore */
  }
}
