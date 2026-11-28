"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const BUDGET_FETCH_TIMEOUT_MS = 12_000;

async function fetchBudgetsWithTimeout(): Promise<BudgetRecord[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchBudgetRecords(),
      new Promise<BudgetRecord[]>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Timed out loading budgets.")),
          BUDGET_FETCH_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Live Return Planner inputs — auto-merges Income, Expenses, Portfolio, COL, Savings, SSF,
 * and canonical Emergency Fund 3.0.
 *
 * Emergency Fund settings use the same `useCloudDocumentState("emergency_fund")` path as the
 * Emergency Fund dashboard. Hydrate-cache writes stay silent (no sync event) so listeners cannot
 * re-enter hydrate and leave the checklist stuck on LOADING.
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
  const emergencySyncBusyRef = useRef(false);

  const loadEmergencyLocal = useCallback(
    () => loadEmergencyFundSettingsLocal(uid),
    [uid],
  );
  // Silent cache write — never emit sync here (hydrate would loop forever).
  const saveEmergencyLocal = useCallback(
    (next: ReturnType<typeof defaultEmergencyFundSettings>) => {
      saveEmergencyFundSettingsLocal(next, uid, { emitSync: false });
    },
    [uid],
  );
  const clearEmergencyLocal = useCallback(() => {
    clearEmergencyFundSettingsLocal(uid);
  }, [uid]);

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
    loadLocal: loadEmergencyLocal,
    saveLocal: saveEmergencyLocal,
    clearLocal: clearEmergencyLocal,
    saveDebounceMs: 600,
  });

  const resync = useCallback(() => {
    setTick((n) => n + 1);
    resyncCloud();
  }, [resyncCloud]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
          const rows = await fetchBudgetsWithTimeout();
          if (cancelled) return;
          setBudgets(rows);
          setBudgetsFailed(false);
          setBudgetsReady(true);
        } catch {
          if (cancelled) return;
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
      // User-initiated EF notify only (emitSync from dashboard mutations).
      // Guard against overlapping retries; never chain off silent hydrate cache writes.
      if (emergencySyncBusyRef.current) return;
      emergencySyncBusyRef.current = true;
      invalidateModuleSnapshotCache("emergency_fund");
      retryEmergencyHydrate();
      setTick((n) => n + 1);
      window.setTimeout(() => {
        emergencySyncBusyRef.current = false;
      }, 1500);
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
      // EF settings cloud hydrate is the readiness gate. Budgets may arrive later and
      // recalculate runway — do not block forever on budgetsReady (cancelled fetches).
      if (!emergencyHydrated || !emergencyCloudReady) return "loading";
      return "ready";
    }
    if (!emergencyHydrated) return "loading";
    return "ready";
  }, [authLoading, uid, emergencyHydrateError, emergencyHydrated, emergencyCloudReady]);

  const bundle = useMemo((): ReturnPlannerLiveBundle => {
    void tick;
    void ratesLoading;
    void budgetsReady;
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
    budgetsReady,
    budgetsFailed,
    emergencyLoadState,
  ]);

  return { bundle, tick, resync };
}
