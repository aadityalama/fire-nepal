"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { useProductAuth } from "@/contexts/ProductAuthContext";
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
  defaultEmergencyFundSettings,
  loadEmergencyFundSettingsLocal,
  sanitizeEmergencyFundSettings,
} from "@/lib/emergency-fund/settings";
import type { EmergencyFundSettingsState } from "@/lib/emergency-fund/types";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
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

type EmergencyFundLivePayload = {
  settings: EmergencyFundSettingsState;
  budgets: BudgetRecord[];
  loadState: CanonicalEmergencyFundLoadState;
};

/**
 * Live Return Planner inputs — auto-merges Income, Expenses, Portfolio, COL, Savings, SSF,
 * and canonical Emergency Fund 3.0 (budget basis + ledger reserve).
 * Authenticated: portfolio/cashflow/COL/SSF/savings/EF come from Supabase-backed APIs/hooks.
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
  const [emergencyPayload, setEmergencyPayload] = useState<EmergencyFundLivePayload>(() => ({
    settings: defaultEmergencyFundSettings(),
    budgets: [],
    loadState: "loading",
  }));

  const resync = useCallback(() => {
    setTick((n) => n + 1);
    resyncCloud();
  }, [resyncCloud]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (uid && isSupabaseConfigured()) {
        // Force-refresh EF snapshot so Return Planner does not reuse a stale TTL cache
        // after Emergency Fund deposits / mode / period changes.
        invalidateModuleSnapshotCache("emergency_fund");

        const [savingsResult, ssfResult, efResult, budgetsResult] = await Promise.allSettled([
          fetchSavingsWorkspace(),
          fetchModuleSnapshot<unknown>("ssf_pension"),
          fetchModuleSnapshot<unknown>("emergency_fund", { force: true }),
          fetchBudgetRecords(),
        ]);
        if (cancelled) return;

        if (savingsResult.status === "fulfilled") {
          setSavings(savingsResult.value ?? sanitizeSavingsWorkspaceState(null));
        } else {
          setSavings(sanitizeSavingsWorkspaceState(null));
        }

        if (ssfResult.status === "fulfilled") {
          setSsf(
            ssfResult.value == null
              ? DEFAULT_SSF_PENSION_WORKSPACE_STATE
              : sanitizeSsfPensionWorkspace(ssfResult.value),
          );
        } else {
          setSsf(DEFAULT_SSF_PENSION_WORKSPACE_STATE);
        }

        // EF load failure must surface as DATA UNAVAILABLE — never as a false MISSING.
        if (efResult.status === "fulfilled") {
          setEmergencyPayload({
            settings:
              efResult.value == null
                ? defaultEmergencyFundSettings()
                : sanitizeEmergencyFundSettings(efResult.value),
            budgets: budgetsResult.status === "fulfilled" ? budgetsResult.value : [],
            loadState: "ready",
          });
        } else {
          setEmergencyPayload({
            settings: defaultEmergencyFundSettings(),
            budgets: [],
            loadState: "unavailable",
          });
        }
        return;
      }
      if (!cancelled) {
        setSavings(loadSavingsWorkspaceState());
        setSsf(loadSsfPensionWorkspace());
        setEmergencyPayload({
          settings: loadEmergencyFundSettingsLocal(uid),
          budgets: [],
          loadState: "ready",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);

  useEffect(() => {
    const bump = () => resync();
    // Module sync events only — avoid focus/visibility storms on mobile browsers
    // that re-fire when the address bar shows/hides and can loop cloud fetches.
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
    window.addEventListener(EMERGENCY_FUND_MODULE_SYNC_EVENT, bump);
    window.addEventListener(BUDGET_MODULE_SYNC_EVENT, bump);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, bump);
      window.removeEventListener(EMERGENCY_FUND_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(BUDGET_MODULE_SYNC_EVENT, bump);
    };
  }, [resync]);

  const bundle = useMemo((): ReturnPlannerLiveBundle => {
    void tick;
    void ratesLoading;
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
      emergencyPayload.loadState === "loading"
        ? emptyCanonicalEmergencyFundSnapshot(requiredMonths, "loading")
        : computeCanonicalEmergencyFundForReturn({
            settings: emergencyPayload.settings,
            budgets: emergencyPayload.budgets,
            cashflow,
            savingsGoals: savings.goals,
            requiredProtectionMonths: requiredMonths,
            loadState: emergencyPayload.loadState,
          });

    return {
      ...base,
      // Prefer canonical EF ledger reserve for all Return Planner consumers.
      emergencyCashReserveNpr:
        canonicalEmergencyFund.loadState === "ready" && canonicalEmergencyFund.hasReserveData
          ? canonicalEmergencyFund.currentEmergencyReserveNpr
          : canonicalEmergencyFund.loadState === "unavailable"
            ? null
            : base.emergencyCashReserveNpr,
      canonicalEmergencyFund,
    };
  }, [tick, stored, portfolio, cashflow, summary, ratesLoading, colPlan, savings, ssf, emergencyPayload]);

  return { bundle, tick, resync };
}
