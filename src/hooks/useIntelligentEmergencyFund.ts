"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { EXPENSE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";
import { fetchBudgetRecords } from "@/lib/budget/budget-api";
import type { BudgetRecord } from "@/lib/budget/types";
import {
  buildEmergencyFinancialInputs,
  cashflowTotalExpenseEstimate,
  expensesToExpenseLike,
} from "@/lib/emergency-fund/financial-inputs";
import {
  computeIntelligentEmergencyFund,
} from "@/lib/emergency-fund/intelligent-engine";
import {
  appendEmergencyTransaction,
  buildReserveGrowthSeries,
  ensureEmergencyFundLedger,
  syncReserveFromLedger,
  updateEmergencySettings,
} from "@/lib/emergency-fund/ledger";
import type {
  EmergencyFundLedger,
  EmergencyFundSettings,
  IntelligentEmergencyFundResult,
} from "@/lib/emergency-fund/types";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { getCachedExchangeRate } from "@/lib/exchange-rate";
import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";
import { loadPersonalExpenseState } from "@/lib/personal-expense-storage";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import type { SavingsGoal } from "@/lib/savings/savings-types";
import { useProductAuth } from "@/contexts/ProductAuthContext";

export type EmergencyFundWorkspaceView = {
  result: IntelligentEmergencyFundResult;
  ledger: EmergencyFundLedger;
  cashflow: CashflowDashboardState;
  budgets: BudgetRecord[];
  emergencyGoals: SavingsGoal[];
  linkedSavingsBalanceNpr: number;
  growthSeries: Array<{ date: string; reserve: number; label: string }>;
  hydrated: boolean;
  loading: boolean;
  budgetsError: string | null;
};

function linkedEmergencyBalance(goals: SavingsGoal[], linkedIds: string[]): number {
  if (!linkedIds.length) return 0;
  const set = new Set(linkedIds);
  return goals
    .filter((g) => set.has(g.id) && (g.category === "Emergency" || g.templateId === "emergency"))
    .reduce((sum, g) => sum + Math.max(0, g.savedAmountNpr), 0);
}

function allEmergencyEligibleGoals(goals: SavingsGoal[]): SavingsGoal[] {
  return goals.filter(
    (g) =>
      g.status !== "paused" &&
      (g.category === "Emergency" || g.templateId === "emergency" || /emergency/i.test(g.name)),
  );
}

export function useIntelligentEmergencyFund() {
  const { user, loading: authLoading } = useProductAuth();
  const uid = user?.id;
  const [syncTick, setSyncTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ledgerRef = useRef<EmergencyFundLedger | null>(null);

  const bump = useCallback(() => setSyncTick((t) => t + 1), []);

  const loadBudgets = useCallback(async () => {
    if (!uid) {
      setBudgets([]);
      setBudgetsError(null);
      return;
    }
    setBudgetsLoading(true);
    try {
      const rows = await fetchBudgetRecords();
      setBudgets(rows);
      setBudgetsError(null);
    } catch (error) {
      setBudgetsError(error instanceof Error ? error.message : "Could not load budgets.");
      // Keep prior budgets on failure — do not wipe to empty silently as zero.
    } finally {
      setBudgetsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const boot = window.setTimeout(() => {
      if (cancelled) return;
      void loadBudgets().finally(() => {
        if (cancelled) return;
        setHydrated(true);
        bump();
      });
    }, 0);

    const onReady = () => {
      void loadBudgets();
      bump();
    };
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onReady);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onReady);
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, onReady);
    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onReady);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onReady);
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, onReady);
    };
  }, [authLoading, bump, loadBudgets]);

  const persistLedger = useCallback(
    (nextLedger: EmergencyFundLedger, linkedBalance: number) => {
      ledgerRef.current = nextLedger;
      const reserve = syncReserveFromLedger(nextLedger, linkedBalance);
      // Immediate local write for responsive UI; cloud sync is debounced.
      const local = loadCashflowState(uid);
      saveCashflowState(
        {
          ...local,
          emergencyFund: nextLedger,
          emergencyCashReserve: reserve,
        },
        uid,
      );
      bump();

      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        const latest = ledgerRef.current ?? nextLedger;
        const latestReserve = syncReserveFromLedger(latest, linkedBalance);
        void patchCashflowState(uid, (cf) => ({
          ...cf,
          emergencyFund: latest,
          emergencyCashReserve: latestReserve,
        }))
          .then(() => bump())
          .catch((error) => {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[emergency-fund] persist failed", error);
            }
            bump();
          });
      }, 450);
    },
    [bump, uid],
  );

  const view: EmergencyFundWorkspaceView = useMemo(() => {
    void syncTick;
    const cashflow = loadCashflowState(uid);
    const expenseState = loadPersonalExpenseState();
    const savings = loadSavingsWorkspaceState();
    const emergencyGoals = allEmergencyEligibleGoals(savings.goals);
    // Prefer cashflow cache (updated synchronously on persist). Ref is only for
    // rapid successive mutations between renders.
    const ledger = ensureEmergencyFundLedger(
      cashflow.emergencyFund,
      cashflow.emergencyCashReserve,
    );
    const linkedSavingsBalanceNpr = linkedEmergencyBalance(
      savings.goals,
      ledger.settings.linkedSavingsGoalIds,
    );

    const cachedFx = getCachedExchangeRate();
    const rates = {
      baseCurrency: "NPR" as const,
      krwPerNpr: cachedFx?.krwPerNpr ?? null,
      usdPerNpr: FALLBACK_USD_PER_NPR,
      rateUpdatedAt: cachedFx?.updatedAt ?? null,
      incomplete: !cachedFx?.krwPerNpr,
      stale: cachedFx?.source === "cached",
      flaggedMessage: !cachedFx?.krwPerNpr
        ? "Exchange-rate data missing for KRW conversion."
        : undefined,
    };

    const inputs = buildEmergencyFinancialInputs({
      cashflow,
      expenses: expensesToExpenseLike(expenseState?.expenses ?? []),
      budgets,
      extraIncludedCategories: ledger.settings.includeDiscretionaryCategoryIds,
      rates,
    });

    // When expense history is empty, surface cashflow total as estimate for capacity math.
    const actualTotal =
      inputs.actualMonthlyTotalExpensesNpr ??
      (inputs.actualEssentialMonthlyAvgNpr == null
        ? cashflowTotalExpenseEstimate(cashflow)
        : inputs.actualMonthlyTotalExpensesNpr);

    const currentReserveNpr = syncReserveFromLedger(ledger, linkedSavingsBalanceNpr);

    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: inputs.monthlyNetIncomeNpr,
      actualMonthlyTotalExpensesNpr: actualTotal,
      actualEssentialMonthlyAvgNpr: inputs.actualEssentialMonthlyAvgNpr,
      plannedEssentialMonthlyNpr: inputs.plannedEssentialMonthlyNpr,
      cashflowEssentialMonthlyNpr: inputs.cashflowEssentialMonthlyNpr,
      currentReserveNpr,
      protectionMonths: ledger.settings.protectionMonths,
      allocationPct: ledger.settings.allocationPct,
      customContributionNpr: ledger.settings.customContributionNpr,
      expenseBasisOverrideNpr: ledger.settings.expenseBasisOverrideNpr,
      manualMonthlyExpenseNpr: ledger.settings.manualMonthlyExpenseNpr,
      analysisPeriodLabel: inputs.analysisPeriodLabel,
      categoryClassificationReliable: inputs.categoryClassificationReliable,
      currency: inputs.currency,
      lastUpdatedAt: ledger.settings.lastUpdatedAt ?? inputs.fetchedAt,
    });

    return {
      result,
      ledger,
      cashflow,
      budgets,
      emergencyGoals,
      linkedSavingsBalanceNpr,
      growthSeries: buildReserveGrowthSeries(ledger, linkedSavingsBalanceNpr),
      hydrated,
      loading: authLoading || !hydrated || budgetsLoading,
      budgetsError,
    };
  }, [authLoading, budgets, budgetsError, budgetsLoading, hydrated, syncTick, uid]);

  const recordTransaction = useCallback(
    (input: {
      type: "contribution" | "withdrawal";
      amountNpr: number;
      date: string;
      note?: string;
      originalAmount?: number;
      originalCurrency?: "NPR" | "KRW" | "USD";
    }) => {
      const base =
        ledgerRef.current ??
        ensureEmergencyFundLedger(
          loadCashflowState(uid).emergencyFund,
          loadCashflowState(uid).emergencyCashReserve,
        );
      const next = appendEmergencyTransaction(base, input);
      const linked = linkedEmergencyBalance(
        loadSavingsWorkspaceState().goals,
        next.settings.linkedSavingsGoalIds,
      );
      persistLedger(next, linked);
    },
    [persistLedger, uid],
  );

  const patchSettings = useCallback(
    (patch: Partial<EmergencyFundSettings>) => {
      const base =
        ledgerRef.current ??
        ensureEmergencyFundLedger(
          loadCashflowState(uid).emergencyFund,
          loadCashflowState(uid).emergencyCashReserve,
        );
      const next = updateEmergencySettings(base, patch);
      const linked = linkedEmergencyBalance(
        loadSavingsWorkspaceState().goals,
        next.settings.linkedSavingsGoalIds,
      );
      persistLedger(next, linked);
    },
    [persistLedger, uid],
  );

  const toggleLinkedGoal = useCallback(
    (goalId: string) => {
      const base =
        ledgerRef.current ??
        ensureEmergencyFundLedger(
          loadCashflowState(uid).emergencyFund,
          loadCashflowState(uid).emergencyCashReserve,
        );
      const ids = new Set(base.settings.linkedSavingsGoalIds);
      if (ids.has(goalId)) ids.delete(goalId);
      else ids.add(goalId);
      const nextIds = [...ids];
      const nextBalance = linkedEmergencyBalance(
        loadSavingsWorkspaceState().goals,
        nextIds,
      );
      const next = updateEmergencySettings(base, {
        linkedSavingsGoalIds: nextIds,
        reserveMode: nextIds.length > 0 ? "hybrid" : "ledger",
      });
      persistLedger(next, nextBalance);
    },
    [persistLedger, uid],
  );

  return {
    ...view,
    recordTransaction,
    patchSettings,
    toggleLinkedGoal,
    reloadBudgets: loadBudgets,
  };
}
