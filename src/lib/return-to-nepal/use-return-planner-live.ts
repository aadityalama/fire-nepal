"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useColPlanState } from "@/hooks/useColPlanState";
import {
  EXPENSE_MODULE_SYNC_EVENT,
  INSURANCE_MODULE_SYNC_EVENT,
  SAVINGS_MODULE_SYNC_EVENT,
} from "@/lib/cashflow/live-sync-events";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import { fetchModuleSnapshot } from "@/lib/module-snapshots/api";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";
import { buildEffectiveReturnPlannerState, type ReturnPlannerLiveBundle } from "@/lib/return-to-nepal/live-inputs";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { fetchSavingsWorkspace } from "@/lib/savings/savings-api";
import {
  loadSavingsWorkspaceState,
  sanitizeSavingsWorkspaceState,
} from "@/lib/savings/savings-storage";
import type { SavingsWorkspaceState } from "@/lib/savings/savings-types";
import {
  DEFAULT_SSF_PENSION_WORKSPACE_STATE,
  loadSsfPensionWorkspace,
  sanitizeSsfPensionWorkspace,
  type SsfPensionWorkspaceState,
} from "@/lib/ssf-pension/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Live Return Planner inputs — auto-merges Income, Expenses, Portfolio, COL, Savings, SSF, etc.
 * Authenticated: portfolio/cashflow/COL/SSF/savings come from Supabase-backed APIs/hooks.
 */
export function useReturnPlannerLive(stored: ReturnToNepalPlannerState): {
  bundle: ReturnPlannerLiveBundle;
  tick: number;
  resync: () => void;
} {
  const { user } = useProductAuth();
  const uid = user?.id;
  const { summary, portfolio, cashflow, ratesLoading, resync: resyncCloud } = useUnifiedFireSummary();
  const { plan: colPlan } = useColPlanState();
  const [tick, setTick] = useState(0);
  const [savings, setSavings] = useState<SavingsWorkspaceState>(() => sanitizeSavingsWorkspaceState(null));
  const [ssf, setSsf] = useState<SsfPensionWorkspaceState>(DEFAULT_SSF_PENSION_WORKSPACE_STATE);

  const resync = useCallback(() => {
    setTick((n) => n + 1);
    resyncCloud();
  }, [resyncCloud]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (uid && isSupabaseConfigured()) {
        try {
          const [remoteSavings, remoteSsf] = await Promise.all([
            fetchSavingsWorkspace(),
            fetchModuleSnapshot<unknown>("ssf_pension"),
          ]);
          if (cancelled) return;
          setSavings(remoteSavings ?? sanitizeSavingsWorkspaceState(null));
          setSsf(remoteSsf == null ? DEFAULT_SSF_PENSION_WORKSPACE_STATE : sanitizeSsfPensionWorkspace(remoteSsf));
        } catch {
          if (!cancelled) {
            setSavings(sanitizeSavingsWorkspaceState(null));
            setSsf(DEFAULT_SSF_PENSION_WORKSPACE_STATE);
          }
        }
        return;
      }
      if (!cancelled) {
        setSavings(loadSavingsWorkspaceState());
        setSsf(loadSsfPensionWorkspace());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);

  useEffect(() => {
    const bump = () => resync();
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, [resync]);

  const bundle = useMemo((): ReturnPlannerLiveBundle => {
    void tick;
    void ratesLoading;
    const wealth = summary.wealthTotals;
    const onboarding = loadProductOnboarding();
    const krwPerNpr = FALLBACK_KRW_PER_NPR;

    return buildEffectiveReturnPlannerState(stored, {
      portfolio,
      wealth,
      cashflow,
      colPlan,
      savingsGoals: savings.goals,
      ssf,
      summary,
      onboarding,
      krwPerNpr,
    });
  }, [tick, stored, portfolio, cashflow, summary, ratesLoading, colPlan, savings, ssf]);

  return { bundle, tick, resync };
}
