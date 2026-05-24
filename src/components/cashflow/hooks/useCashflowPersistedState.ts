"use client";

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import {
  coverageMonths,
  fireSpeedScore,
  investableCashflow,
  monthlyBurn,
  savingsRatePct,
  sumExpenseCategories,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";
import {
  CASHFLOW_STORAGE_KEY,
  defaultCashflowState,
  loadCashflowState,
  sanitizeCashflowState,
} from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState, ExpenseCategoryKey, IncomeSourceKey } from "@/components/cashflow/types";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";

/** Derived FIRE metrics — always recomputed from persisted `state` (no drift vs stored inputs). */
export type CashflowDerivedMetrics = {
  totalIncome: number;
  categoryExpenseTotal: number;
  monthlyBurn: number;
  savingsRatePct: number | null;
  investableCashflow: number;
  fireSpeedScore: number | null;
  coverageMonths: number | null;
};

export type UseCashflowPersistedStateResult = {
  state: CashflowDashboardState;
  setState: Dispatch<SetStateAction<CashflowDashboardState>>;
  hydrated: boolean;
  metrics: CashflowDerivedMetrics;
  patchIncome: (key: IncomeSourceKey, amount: number | undefined) => void;
  patchExpense: (key: ExpenseCategoryKey, amount: number | undefined) => void;
};

/**
 * Cashflow dashboard persistence: all income keys, expense keys, emergency reserve,
 * and monthly burn override are saved to `localStorage` and restored on refresh.
 * FIRE metric tiles read from `metrics`, which is derived from that same persisted state.
 */
export function useCashflowPersistedState(): UseCashflowPersistedStateResult {
  const [state, setState, hydrated] = useLocalStorageJsonState<CashflowDashboardState>({
    storageKey: CASHFLOW_STORAGE_KEY,
    getDefault: defaultCashflowState,
    sanitize: sanitizeCashflowState,
  });

  useEffect(() => {
    const onExternal = () => setState(loadCashflowState());
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    return () => window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
  }, [setState]);

  const metrics = useMemo((): CashflowDerivedMetrics => {
    return {
      totalIncome: sumIncome(state),
      categoryExpenseTotal: sumExpenseCategories(state),
      monthlyBurn: monthlyBurn(state),
      savingsRatePct: savingsRatePct(state),
      investableCashflow: investableCashflow(state),
      fireSpeedScore: fireSpeedScore(state),
      coverageMonths: coverageMonths(state),
    };
  }, [state]);

  const patchIncome = useCallback(
    (key: IncomeSourceKey, amount: number | undefined) => {
      setState((s) => {
        const next = { ...s, income: { ...s.income, [key]: amount } };
        return next;
      });
    },
    [setState],
  );

  const patchExpense = useCallback(
    (key: ExpenseCategoryKey, amount: number | undefined) => {
      setState((s) => {
        const next = { ...s, expenses: { ...s.expenses, [key]: amount } };
        return next;
      });
    },
    [setState],
  );

  return { state, setState, hydrated, metrics, patchIncome, patchExpense };
}
