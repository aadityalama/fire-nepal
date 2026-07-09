"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { computeWealthTotals } from "@/components/portfolio/calculations";
import { loadWealthPortfolioState } from "@/components/portfolio/storage";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  EXPENSE_MODULE_SYNC_EVENT,
  INSURANCE_MODULE_SYNC_EVENT,
  SAVINGS_MODULE_SYNC_EVENT,
} from "@/lib/cashflow/live-sync-events";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import { loadColPlanDocument } from "@/lib/nepal-col-storage";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";
import { buildEffectiveReturnPlannerState, type ReturnPlannerLiveBundle } from "@/lib/return-to-nepal/live-inputs";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";

/**
 * Live Return Planner inputs — auto-merges Income, Expenses, Portfolio, COL, Savings, SSF, etc.
 * Listens for module sync events and Supabase-backed portfolio/cashflow refresh via unified summary.
 */
export function useReturnPlannerLive(stored: ReturnToNepalPlannerState): {
  bundle: ReturnPlannerLiveBundle;
  tick: number;
  resync: () => void;
} {
  const { user } = useProductAuth();
  const uid = user?.id;
  const { summary, portfolio, cashflow, ratesLoading } = useUnifiedFireSummary();
  const [tick, setTick] = useState(0);

  const resync = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const bump = () => resync();
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener("storage", bump);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener("storage", bump);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, [resync]);

  const bundle = useMemo((): ReturnPlannerLiveBundle => {
    void tick;
    const pf = portfolio ?? loadWealthPortfolioState(uid);
    const cf = cashflow ?? loadCashflowState(uid);
    const krwPerNpr = FALLBACK_KRW_PER_NPR;
    const wealth = computeWealthTotals(pf, krwPerNpr, FALLBACK_USD_PER_NPR);
    const colPlan = loadColPlanDocument(uid).plan;
    const savings = loadSavingsWorkspaceState();
    const ssf = loadSsfPensionWorkspace();
    const onboarding = loadProductOnboarding();

    return buildEffectiveReturnPlannerState(stored, {
      portfolio: pf,
      wealth,
      cashflow: cf,
      colPlan,
      savingsGoals: savings.goals,
      ssf,
      summary,
      onboarding,
      krwPerNpr,
    });
  }, [tick, stored, uid, portfolio, cashflow, summary, ratesLoading]);

  return { bundle, tick, resync };
}
