"use client";

import { useEffect, useMemo, useState } from "react";
import { CashflowWorkspaceDashboard } from "@/components/cashflow-workspace/CashflowWorkspaceDashboard";
import { useCashflowPersistedState } from "@/components/cashflow/hooks/useCashflowPersistedState";
import { buildCashflowOnlyFinancialCoachSnapshot } from "@/components/financial-coach/coach-snapshot";
import { loadIntelMonthRollups, upsertCurrentMonthRollup } from "@/components/financial-intelligence";
import { PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import { computeCashflowLiveMetrics } from "@/lib/cashflow/cashflow-live-metrics";
import {
  EXPENSE_MODULE_SYNC_EVENT,
  SAVINGS_MODULE_SYNC_EVENT,
} from "@/lib/cashflow/live-sync-events";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";

export function CashflowDashboard() {
  const { user } = useProductAuth();
  const { state, hydrated, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry } = useCashflowPersistedState(user?.id);
  const [coachTick, setCoachTick] = useState(0);
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    const bump = () => setLiveTick((v) => v + 1);
    const onCoach = () => setCoachTick((t) => t + 1);
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, onCoach);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener("storage", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, onCoach);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener("storage", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  const coachSnapshot = useMemo(() => buildCashflowOnlyFinancialCoachSnapshot(state), [state, coachTick]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    upsertCurrentMonthRollup({ cashflow: state, coach: coachSnapshot });
    loadIntelMonthRollups();
  }, [hydrated, state, coachSnapshot, coachTick]);

  const liveMetrics = useMemo(() => {
    void liveTick;
    return computeCashflowLiveMetrics(state);
  }, [state, liveTick]);

  return (
    <CashflowWorkspaceDashboard
      state={state}
      live={liveMetrics}
      hydrated={hydrated}
      onAddIncome={addIncomeEntry}
      onUpdateIncome={updateIncomeEntry}
      onDeleteIncome={deleteIncomeEntry}
    />
  );
}
