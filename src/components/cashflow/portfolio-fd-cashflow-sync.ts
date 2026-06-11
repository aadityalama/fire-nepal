import {
  CASHFLOW_EXTERNAL_SYNC_EVENT,
} from "@/components/cashflow/portfolio-dividend-sync";
import { loadCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";

/**
 * Writes modelled aggregate monthly FD interest (NPR) into cashflow
 * `income.depositInterestIncome`. Portfolio is the source of truth for this field;
 * editing FD rows on the wealth dashboard updates cashflow on the next debounced sync.
 */
export function replaceDepositInterestIncomeFromPortfolioNpr(monthlyNpr: number, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const cur = loadCashflowState(userId);
    const v = Number.isFinite(monthlyNpr) && monthlyNpr > 0 ? monthlyNpr : 0;
    const next = {
      ...cur,
      income: {
        ...cur.income,
        depositInterestIncome: v > 0 ? v : undefined,
      },
    };
    saveCashflowState(next, userId);
    window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));
  } catch {
    /* ignore */
  }
}
