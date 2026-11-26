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
import { computeIntelligentEmergencyFund } from "@/lib/emergency-fund/intelligent-engine";
import {
  appendEmergencyTransaction,
  buildReserveGrowthSeries,
  ensureEmergencyFundLedger,
  reverseEmergencyTransaction,
  syncReserveFromLedger,
  updateEmergencySettings,
  type GrowthSeriesPoint,
} from "@/lib/emergency-fund/ledger";
import type {
  EmergencyFundLedger,
  EmergencyFundSettings,
  IntelligentEmergencyFundResult,
} from "@/lib/emergency-fund/types";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { fetchLiveExchangeRate, getCachedExchangeRate } from "@/lib/exchange-rate";
import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";
import { loadPersonalExpenseState } from "@/lib/personal-expense-storage";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import type { SavingsGoal } from "@/lib/savings/savings-types";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import type { EmergencyPeriodMode } from "@/lib/emergency-fund/period";

export type EmergencyFundWorkspaceView = {
  result: IntelligentEmergencyFundResult;
  ledger: EmergencyFundLedger;
  cashflow: CashflowDashboardState;
  budgets: BudgetRecord[];
  emergencyGoals: SavingsGoal[];
  linkedSavingsBalanceNpr: number;
  growthSeries: GrowthSeriesPoint[];
  hydrated: boolean;
  loading: boolean;
  budgetsError: string | null;
  lastSyncedAt: string | null;
  syncing: boolean;
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
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fxTick, setFxTick] = useState(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ledgerRef = useRef<EmergencyFundLedger | null>(null);

  const bump = useCallback(() => setSyncTick((t) => t + 1), []);

  const markSynced = useCallback(() => {
    const ts = new Date().toISOString();
    setLastSyncedAt(ts);
    const base =
      ledgerRef.current ??
      ensureEmergencyFundLedger(
        loadCashflowState(uid).emergencyFund,
        loadCashflowState(uid).emergencyCashReserve,
      );
    const next = updateEmergencySettings(base, { lastSyncedAt: ts });
    ledgerRef.current = next;
    const local = loadCashflowState(uid);
    const linked = linkedEmergencyBalance(
      loadSavingsWorkspaceState().goals,
      next.settings.linkedSavingsGoalIds,
    );
    saveCashflowState(
      {
        ...local,
        emergencyFund: next,
        emergencyCashReserve: syncReserveFromLedger(next, linked),
      },
      uid,
    );
  }, [uid]);

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
    } finally {
      setBudgetsLoading(false);
    }
  }, [uid]);

  const refreshFinanceSync = useCallback(async () => {
    setSyncing(true);
    try {
      await Promise.all([
        loadBudgets(),
        fetchLiveExchangeRate()
          .then(() => setFxTick((t) => t + 1))
          .catch(() => undefined),
      ]);
      markSynced();
      bump();
    } finally {
      setSyncing(false);
    }
  }, [bump, loadBudgets, markSynced]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const boot = window.setTimeout(() => {
      if (cancelled) return;
      void (async () => {
        await loadBudgets();
        if (cancelled) return;
        // Warm FX cache once — do not mark sync on mere page render.
        try {
          await fetchLiveExchangeRate();
          if (!cancelled) setFxTick((t) => t + 1);
        } catch {
          /* keep going */
        }
        if (cancelled) return;
        const existing = loadCashflowState(uid).emergencyFund?.settings.lastSyncedAt ?? null;
        setLastSyncedAt(existing);
        setHydrated(true);
        bump();
      })();
    }, 0);

    const onReady = () => {
      void loadBudgets();
      markSynced();
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
  }, [authLoading, bump, loadBudgets, markSynced, uid]);

  const persistLedger = useCallback(
    (nextLedger: EmergencyFundLedger, linkedBalance: number) => {
      ledgerRef.current = nextLedger;
      const reserve = syncReserveFromLedger(nextLedger, linkedBalance);
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
          .then(() => {
            markSynced();
            bump();
          })
          .catch((error) => {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[emergency-fund] persist failed", error);
            }
            bump();
          });
      }, 450);
    },
    [bump, markSynced, uid],
  );

  const view: EmergencyFundWorkspaceView = useMemo(() => {
    void syncTick;
    void fxTick;
    const cashflow = loadCashflowState(uid);
    const expenseState = loadPersonalExpenseState();
    const savings = loadSavingsWorkspaceState();
    const emergencyGoals = allEmergencyEligibleGoals(savings.goals);
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
      // Do not flag incomplete merely because FX cache is empty when amounts are NPR.
      incomplete: false,
      stale: cachedFx?.source === "cached",
      flaggedMessage: undefined,
    };

    const periodMode = (ledger.settings.periodMode ?? "latest_completed") as EmergencyPeriodMode;

    const inputs = buildEmergencyFinancialInputs({
      cashflow,
      expenses: expensesToExpenseLike(expenseState?.expenses ?? []),
      budgets,
      extraIncludedCategories: ledger.settings.includeDiscretionaryCategoryIds,
      rates,
      periodMode,
      customStartMonth: ledger.settings.customPeriodStartMonth,
      customEndMonth: ledger.settings.customPeriodEndMonth,
      essentialAvgMonths: periodMode === "last_6_completed" ? 6 : 3,
      // Do NOT pass fetchedAt=now — lastUpdatedAt must come from ledger/sync.
    });

    const actualTotal =
      inputs.actualMonthlyTotalExpensesNpr ??
      (inputs.actualEssentialMonthlyAvgNpr == null
        ? cashflowTotalExpenseEstimate(cashflow)
        : inputs.actualMonthlyTotalExpensesNpr);

    const currentReserveNpr = syncReserveFromLedger(ledger, linkedSavingsBalanceNpr);

    const result = computeIntelligentEmergencyFund({
      monthlyNetIncomeNpr: inputs.monthlyNetIncomeNpr,
      recurringMonthlyIncomeNpr: inputs.recurringMonthlyIncomeNpr,
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
      incomePeriodLabel: inputs.incomePeriodLabel,
      expensePeriodLabel: inputs.expensePeriodLabel,
      essentialAveragingLabel: inputs.essentialAveragingLabel,
      categoryClassificationReliable: inputs.categoryClassificationReliable,
      currency: {
        ...inputs.currency,
        rateUpdatedAt: cachedFx?.updatedAt ?? null,
        stale: cachedFx?.source === "cached",
      },
      lastUpdatedAt: ledger.settings.lastUpdatedAt,
      lastSyncedAt: lastSyncedAt ?? ledger.settings.lastSyncedAt ?? null,
      dataQuality: inputs.dataQuality,
      fundingDeadlineMonths: ledger.settings.fundingDeadlineMonths,
    });

    return {
      result,
      ledger,
      cashflow,
      budgets,
      emergencyGoals,
      linkedSavingsBalanceNpr,
      growthSeries: buildReserveGrowthSeries(ledger, linkedSavingsBalanceNpr, {
        targetNpr: result.emergencyFundTargetNpr,
        monthlyContributionNpr: result.recommendedMonthlyContributionNpr,
        chartMonths: ledger.settings.growthChartMonths ?? 12,
      }),
      hydrated,
      loading: authLoading || !hydrated || budgetsLoading,
      budgetsError,
      lastSyncedAt: lastSyncedAt ?? ledger.settings.lastSyncedAt ?? null,
      syncing,
    };
  }, [
    authLoading,
    budgets,
    budgetsError,
    budgetsLoading,
    fxTick,
    hydrated,
    lastSyncedAt,
    syncTick,
    syncing,
    uid,
  ]);

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
      if (input.type === "withdrawal") {
        const current = syncReserveFromLedger(
          base,
          linkedEmergencyBalance(
            loadSavingsWorkspaceState().goals,
            base.settings.linkedSavingsGoalIds,
          ),
        );
        if (input.amountNpr > current) {
          throw new Error("Withdrawal exceeds current emergency reserve.");
        }
      }
      const next = appendEmergencyTransaction(base, input);
      const linked = linkedEmergencyBalance(
        loadSavingsWorkspaceState().goals,
        next.settings.linkedSavingsGoalIds,
      );
      persistLedger(next, linked);
    },
    [persistLedger, uid],
  );

  const reverseTransaction = useCallback(
    (transactionId: string) => {
      const base =
        ledgerRef.current ??
        ensureEmergencyFundLedger(
          loadCashflowState(uid).emergencyFund,
          loadCashflowState(uid).emergencyCashReserve,
        );
      const next = reverseEmergencyTransaction(base, transactionId);
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
      const nextBalance = linkedEmergencyBalance(loadSavingsWorkspaceState().goals, nextIds);
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
    reverseTransaction,
    patchSettings,
    toggleLinkedGoal,
    reloadBudgets: loadBudgets,
    refreshFinanceSync,
  };
}
