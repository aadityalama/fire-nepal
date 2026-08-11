"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import {
  EXPENSE_MODULE_SYNC_EVENT,
  INSURANCE_MODULE_SYNC_EVENT,
  SAVINGS_MODULE_SYNC_EVENT,
} from "@/lib/cashflow/live-sync-events";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { computeCashflowLiveMetrics } from "@/lib/cashflow/cashflow-live-metrics";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";
import { DEFAULT_RETURN_PLANNER_STATE, RETURN_PLANNER_STORAGE_KEY } from "@/lib/return-to-nepal/default-planner-state";
import { computePlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";

function loadReturnPlannerState(): ReturnToNepalPlannerState {
  if (typeof window === "undefined") return DEFAULT_RETURN_PLANNER_STATE;
  try {
    const raw = window.localStorage.getItem(RETURN_PLANNER_STORAGE_KEY);
    if (!raw) return DEFAULT_RETURN_PLANNER_STATE;
    const parsed = JSON.parse(raw) as Partial<ReturnToNepalPlannerState>;
    return { ...DEFAULT_RETURN_PLANNER_STATE, ...parsed };
  } catch {
    return DEFAULT_RETURN_PLANNER_STATE;
  }
}

function resolveAge(): number | null {
  const onboarding = loadProductOnboarding();
  if (onboarding.age > 0) return onboarding.age;
  const ssf = loadSsfPensionWorkspace();
  if (ssf.projection.currentAge > 0) return ssf.projection.currentAge;
  return null;
}

/**
 * Live inputs for the FIRE AI Insurance Engine.
 * Recalculates whenever income, expense, savings, portfolio, return plan, or insurance sync.
 * Does not invent age or income — missing values stay 0/null for the engine.
 */
export function useInsuranceEngineInputs(): {
  inputs: InsuranceEngineInputs;
  tick: number;
  recalculate: () => void;
} {
  const { user } = useProductAuth();
  const uid = user?.id;
  const { profile } = useCurrentUserProfile();
  const { summary } = useUnifiedFireSummary();
  const [tick, setTick] = useState(0);

  const recalculate = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const bump = () => recalculate();
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, bump);
    window.addEventListener("storage", bump);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(SAVINGS_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, bump);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, bump);
      window.removeEventListener("storage", bump);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, [recalculate]);

  const inputs = useMemo((): InsuranceEngineInputs => {
    void tick;
    try {
      const cashflow = loadCashflowState(uid);
      const live = computeCashflowLiveMetrics(cashflow);
      const wealth = summary.wealthTotals;
      const onboarding = loadProductOnboarding();
      const ssf = loadSsfPensionWorkspace();
      const returnState = loadReturnPlannerState();
      const snapshot = computePlannerSnapshot(returnState);
      const age = resolveAge();

      return {
        monthlyIncomeNpr: live.monthlyIncome > 0 ? live.monthlyIncome : onboarding.salaryMonthlyNpr,
        monthlyExpenseNpr: live.monthlyExpense,
        totalSavingsNpr: live.totalSavings,
        investableNpr: wealth.investableNpr,
        liabilitiesNpr: summary.liabilitiesNpr,
        emergencyFundMonths: summary.emergencyFundCoverageMonths,
        fireGoalNpr: profile?.fireGoalAmount ?? 0,
        fireProgressPct: summary.fireProgressPct,
        age,
        adults: Math.max(1, returnState.adults || 1),
        children: Math.max(0, returnState.children || 0),
        ssfMonthlyContributionNpr: ssf.projection.monthlySsfContributionNpr,
        yearsToReturn: snapshot.yearsToReturn,
        returnReadinessPct: snapshot.returnReadinessPct,
      };
    } catch {
      return {
        monthlyIncomeNpr: 0,
        monthlyExpenseNpr: 0,
        totalSavingsNpr: 0,
        investableNpr: 0,
        liabilitiesNpr: 0,
        emergencyFundMonths: null,
        fireGoalNpr: profile?.fireGoalAmount ?? 0,
        fireProgressPct: summary.fireProgressPct ?? null,
        age: null,
        adults: 1,
        children: 0,
        ssfMonthlyContributionNpr: 0,
        yearsToReturn: null,
        returnReadinessPct: null,
      };
    }
  }, [
    tick,
    uid,
    profile?.fireGoalAmount,
    summary.emergencyFundCoverageMonths,
    summary.fireProgressPct,
    summary.liabilitiesNpr,
    summary.wealthTotals,
  ]);

  return { inputs, tick, recalculate };
}
