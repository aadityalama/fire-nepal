"use client";

import { useEffect, useMemo, useState } from "react";
import { CashflowWorkspaceDashboard } from "@/components/cashflow-workspace/CashflowWorkspaceDashboard";
import { useCashflowPersistedState } from "@/components/cashflow/hooks/useCashflowPersistedState";
import { buildCashflowOnlyFinancialCoachSnapshot } from "@/components/financial-coach/coach-snapshot";
import {
  buildFinancialIntelligenceModel,
  loadIntelMonthRollups,
  upsertCurrentMonthRollup,
} from "@/components/financial-intelligence";
import { PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import { useProductAuth } from "@/contexts/ProductAuthContext";

export function CashflowDashboard() {
  const { user } = useProductAuth();
  const { state, metrics, hydrated } = useCashflowPersistedState(user?.id);
  const [coachTick, setCoachTick] = useState(0);
  const [intelRollups, setIntelRollups] = useState(() => loadIntelMonthRollups());

  useEffect(() => {
    const on = () => setCoachTick((t) => t + 1);
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, on);
    return () => window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, on);
  }, []);

  const coachSnapshot = useMemo(() => buildCashflowOnlyFinancialCoachSnapshot(state), [state, coachTick]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    upsertCurrentMonthRollup({ cashflow: state, coach: coachSnapshot });
    setIntelRollups(loadIntelMonthRollups());
  }, [hydrated, state, coachSnapshot, coachTick]);

  const intelModel = useMemo(
    () =>
      buildFinancialIntelligenceModel({
        cashflow: state,
        coach: coachSnapshot,
        monthRollups: intelRollups,
        netWorthHistory: [],
      }),
    [state, coachSnapshot, intelRollups],
  );

  return (
    <CashflowWorkspaceDashboard
      state={state}
      metrics={metrics}
      intelModel={intelModel}
      intelRollups={intelRollups}
      hydrated={hydrated}
    />
  );
}
