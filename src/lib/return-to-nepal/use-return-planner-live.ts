"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";
import { useColPlanState } from "@/hooks/useColPlanState";
import { fetchBudgetRecords } from "@/lib/budget/budget-api";
import type { BudgetRecord } from "@/lib/budget/types";
import {
  BUDGET_MODULE_SYNC_EVENT,
  EMERGENCY_FUND_MODULE_SYNC_EVENT,
  EXPENSE_MODULE_SYNC_EVENT,
  INSURANCE_MODULE_SYNC_EVENT,
  SAVINGS_MODULE_SYNC_EVENT,
} from "@/lib/cashflow/live-sync-events";
import {
  clearEmergencyFundSettingsLocal,
  defaultEmergencyFundSettings,
  loadEmergencyFundSettingsLocal,
  sanitizeEmergencyFundSettings,
  saveEmergencyFundSettingsLocal,
} from "@/lib/emergency-fund/settings";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import { fetchModuleSnapshot, invalidateModuleSnapshotCache } from "@/lib/module-snapshots/api";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";
import {
  computeCanonicalEmergencyFundForReturn,
  emptyCanonicalEmergencyFundSnapshot,
  RETURN_PLANNER_DEFAULT_EMERGENCY_MONTHS,
  type CanonicalEmergencyFundLoadState,
} from "@/lib/return-to-nepal/canonical-emergency-fund";
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
 * Live Return Planner inputs — auto-merges Income, Expenses, Portfolio, COL, Savings, SSF,
 * and canonical Emergency Fund 3.0.
 *
 * Emergency Fund settings use the same `useCloudDocumentState("emergency_fund")` path as the
 * Emergency Fund dashboard (auth-gated hydrate, cloud SoT, optional local cache).
 */
export function useReturnPlannerLive(stored: ReturnToNepalPlannerState): {
  bundle: ReturnPlannerLiveBundle;
  tick: number;
  resync: () => void;
} {
  const { user, loading: authLoading } = useProductAuth();
  const uid = user?.id;
  const { summary, portfolio, cashflow, ratesLoading, resync: resyncCloud } = useUnifiedFireSummary();
  const { plan: colPlan } = useColPlanState();
  const [tick, setTick] = useState(0);
  const [savings, setSavings] = useState<SavingsWorkspaceState>(() => sanitizeSavingsWorkspaceState(null));
  const [ssf, setSsf] = useState<SsfPensionWorkspaceState>(DEFAULT_SSF_PENSION_WORKSPACE_STATE);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [budgetsReady, setBudgetsReady] = useState(false);
  const [budgetsFailed, setBudgetsFailed] = useState(false);

  // Same persisted loader as EmergencyFundDashboard — do not invent a parallel fetch path.
  const {
    state: emergencySettings,
    hydrated: emergencyHydrated,
    cloudReady: emergencyCloudReady,
    hydrateError: emergencyHydrateError,
    retryHydrate: retryEmergencyHydrate,
  } = useCloudDocumentState({
    moduleKey: "emergency_fund",
    getDefault: defaultEmergencyFundSettings,
    sanitize: sanitizeEmergencyFundSettings,
    loadLocal: () => loadEmergencyFundSettingsLocal(uid),
    saveLocal: (next) => saveEmergencyFundSettingsLocal(next, uid),
    clearLocal: () => clearEmergencyFundSettingsLocal(uid),
    saveDebounceMs: 600,
  });

  const resync = useCallback(() => {
    setTick((n) => n + 1);
    resyncCloud();
    if (emergencyHydrateError) retryEmergencyHydrate();
  }, [resyncCloud, emergencyHydrateError, retryEmergencyHydrate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Match Emergency Fund dashboard: never hit cloud APIs while auth is unresolved.
      if (authLoading) return;

      if (uid && isSupabaseConfigured()) {
        try {
          const [remoteSavings, remoteSsf] = await Promise.all([
            fetchSavingsWorkspace(),
            fetchModuleSnapshot<unknown>("ssf_pension"),
          ]);
          if (cancelled) return;
          setSavings(remoteSavings ?? sanitizeSavingsWorkspaceState(null));
          setSsf(
            remoteSsf == null
              ? DEFAULT_SSF_PENSION_WORKSPACE_STATE
              : sanitizeSsfPensionWorkspace(remoteSsf),
          );
        } catch {
          if (!cancelled) {
            setSavings(sanitizeSavingsWorkspaceState(null));
            setSsf(DEFAULT_SSF_PENSION_WORKSPACE_STATE);
          }
        }

        try {
          const rows = await fetchBudgetRecords();
          if (cancelled) return;
          setBudgets(rows);
          setBudgetsFailed(false);
          setBudgetsReady(true);
        } catch {
          if (cancelled) return;
          // Budget failure alone must not mark EF DATA UNAVAILABLE — keep prior rows if any.
          setBudgetsFailed(true);
          setBudgetsReady(true);
        }
        return;
      }

      if (!cancelled) {
        setSavings(loadSavingsWorkspaceState());
        setSsf(loadSsfPensionWorkspace());
        setBudgets([]);
        setBudgetsFailed(false);
        setBudgetsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tick, authLoading]);

  useEffect(() => {
    const bump = () => resync();
    const bumpEmergency = () => {
      // EF ledger/mode/period changed elsewhere — force the shared cloud document to re-hydrate.
      invalidateModuleSnapshotCache("emergency_fund");
      retryEmergencyHydrate();
      resync();
    };
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener(EMERGENCY_FUND_MODULE_SYNC_EVENT, bumpEmergency);
    window.addEventListener(BUDGET_MODULE_SYNC_EVENT, bump);
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, bump);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener(EMERGENCY_FUND_MODULE_SYNC_EVENT, bumpEmergency);
      window.removeEventListener(BUDGET_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, bump);
    };
  }, [resync, retryEmergencyHydrate]);

  const emergencyLoadState: CanonicalEmergencyFundLoadState = useMemo(() => {
    if (authLoading) return "loading";
    if (uid && isSupabaseConfigured()) {
      if (emergencyHydrateError) return "unavailable";
      // cloudReady flips true after success OR failure; hydrateError distinguishes failure.
      if (!emergencyHydrated || !emergencyCloudReady || !budgetsReady) return "loading";
      return "ready";
    }
    // Guest: local settings are authoritative once shell hydrated.
    if (!emergencyHydrated || !budgetsReady) return "loading";
    return "ready";
  }, [
    authLoading,
    uid,
    emergencyHydrateError,
    emergencyHydrated,
    emergencyCloudReady,
    budgetsReady,
  ]);

  const bundle = useMemo((): ReturnPlannerLiveBundle => {
    void tick;
    void ratesLoading;
    void budgetsFailed;
    const wealth = summary.wealthTotals;
    const onboarding = loadProductOnboarding();
    const krwPerNpr = FALLBACK_KRW_PER_NPR;

    const base = buildEffectiveReturnPlannerState(stored, {
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

    const requiredMonths =
      base.effectiveState.emergencyMonthsTarget > 0
        ? base.effectiveState.emergencyMonthsTarget
        : RETURN_PLANNER_DEFAULT_EMERGENCY_MONTHS;

    const canonicalEmergencyFund =
      emergencyLoadState === "loading"
        ? emptyCanonicalEmergencyFundSnapshot(requiredMonths, "loading")
        : emergencyLoadState === "unavailable"
          ? emptyCanonicalEmergencyFundSnapshot(requiredMonths, "unavailable")
          : computeCanonicalEmergencyFundForReturn({
              settings: emergencySettings,
              budgets,
              cashflow,
              savingsGoals: savings.goals,
              requiredProtectionMonths: requiredMonths,
              loadState: "ready",
            });

    return {
      ...base,
      emergencyCashReserveNpr:
        canonicalEmergencyFund.loadState === "ready" && canonicalEmergencyFund.hasReserveData
          ? canonicalEmergencyFund.currentEmergencyReserveNpr
          : canonicalEmergencyFund.loadState === "unavailable"
            ? null
            : base.emergencyCashReserveNpr,
      canonicalEmergencyFund,
    };
  }, [
    tick,
    stored,
    portfolio,
    cashflow,
    summary,
    ratesLoading,
    colPlan,
    savings,
    ssf,
    emergencySettings,
    budgets,
    budgetsFailed,
    emergencyLoadState,
  ]);

  return { bundle, tick, resync };
}
