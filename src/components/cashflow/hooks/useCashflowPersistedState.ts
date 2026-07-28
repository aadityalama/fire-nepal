"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import {
  coverageMonths,
  fireSpeedScore,
  investableCashflow,
  monthlyBurn,
  savingsRatePct,
  sumExpenseCategories,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";
import {
  cashflowStorageKey,
  defaultCashflowState,
  loadCashflowState,
  sanitizeCashflowState,
} from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState, ExpenseCategoryKey, IncomeEntry, IncomeSourceKey } from "@/components/cashflow/types";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";
import { createMutationTimer, logClientRender } from "@/lib/mutation-perf";
import { hasCashflowData } from "@/services/cashflow-supabase";

/** Derived FIRE metrics — always recomputed from persisted `state` (no drift vs stored inputs). */
export type CashflowDerivedMetrics = {
  totalIncome: number;
  categoryExpenseTotal: number;
  monthlyBurn: number;
  savingsRatePct: number | null;
  investableCashflow: number;
  fireSpeedScore: number | null;
  coverageMonths: number | null;
};

export type UseCashflowPersistedStateResult = {
  state: CashflowDashboardState;
  setState: Dispatch<SetStateAction<CashflowDashboardState>>;
  hydrated: boolean;
  metrics: CashflowDerivedMetrics;
  patchIncome: (key: IncomeSourceKey, amount: number | undefined) => void;
  patchExpense: (key: ExpenseCategoryKey, amount: number | undefined) => void;
  addIncomeEntry: (entry: Omit<IncomeEntry, "id" | "createdAt">) => Promise<void>;
  updateIncomeEntry: (id: string, patch: Partial<Omit<IncomeEntry, "id" | "createdAt">>) => Promise<void>;
  deleteIncomeEntry: (id: string) => Promise<void>;
};

/**
 * Cashflow dashboard persistence: all income keys, expense keys, emergency reserve,
 * and monthly burn override are saved to `localStorage` and restored on refresh.
 * FIRE metric tiles read from `metrics`, which is derived from that same persisted state.
 */
export function useCashflowPersistedState(userId?: string | null): UseCashflowPersistedStateResult {
  const storageKey = cashflowStorageKey(userId);
  const [state, setState, hydrated] = useLocalStorageJsonState<CashflowDashboardState>({
    storageKey,
    getDefault: defaultCashflowState,
    sanitize: sanitizeCashflowState,
  });
  const explicitPersistStateRef = useRef<string | null>(null);

  useEffect(() => {
    const onExternal = () => setState(loadCashflowState(userId));
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    return () => window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
  }, [setState, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    let alive = true;
    void fetch("/api/cashflow", { credentials: "include", cache: "no-store" })
      .then((res) => res.json() as Promise<{ ok: boolean; snapshot?: { state: CashflowDashboardState } | null }>)
      .then((json) => {
        if (!alive || !json.ok || !json.snapshot?.state) return;
        setState(sanitizeCashflowState(json.snapshot.state));
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[cashflow] cloud hydrate failed", error);
        }
        toast.error(error instanceof Error ? error.message : "Could not load cashflow history from Supabase.");
      });
    return () => {
      alive = false;
    };
  }, [hydrated, setState, userId]);

  useEffect(() => {
    if (!hydrated || !userId || !hasCashflowData(state)) return;
    const stateKey = JSON.stringify(sanitizeCashflowState(state));
    if (explicitPersistStateRef.current === stateKey) {
      explicitPersistStateRef.current = null;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const syncTimer = createMutationTimer("cashflow:auto-sync");
      void fetch("/api/cashflow", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok && process.env.NODE_ENV !== "production") {
            const json = (await res.json().catch(() => null)) as { error?: string } | null;
            console.error("[cashflow] background sync failed", json?.error ?? res.statusText);
          }
          syncTimer.flush({ ok: res.ok, status: res.status });
        })
        .catch((error) => {
          if (error?.name !== "AbortError" && process.env.NODE_ENV !== "production") {
            console.error("[cashflow] background sync failed", error);
          }
          if (error?.name !== "AbortError") {
            syncTimer.flush({ ok: false, error: error instanceof Error ? error.message : "unknown" });
          }
      });
    }, 700);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hydrated, state, userId]);

  const metrics = useMemo((): CashflowDerivedMetrics => {
    return {
      totalIncome: sumIncome(state),
      categoryExpenseTotal: sumExpenseCategories(state),
      monthlyBurn: monthlyBurn(state),
      savingsRatePct: savingsRatePct(state),
      investableCashflow: investableCashflow(state),
      fireSpeedScore: fireSpeedScore(state),
      coverageMonths: coverageMonths(state),
    };
  }, [state]);

  const patchIncome = useCallback(
    (key: IncomeSourceKey, amount: number | undefined) => {
      setState((s) => {
        const next = { ...s, income: { ...s.income, [key]: amount } };
        return next;
      });
    },
    [setState],
  );

  const patchExpense = useCallback(
    (key: ExpenseCategoryKey, amount: number | undefined) => {
      setState((s) => {
        const next = { ...s, expenses: { ...s.expenses, [key]: amount } };
        return next;
      });
    },
    [setState],
  );

  const persistCashflowState = useCallback(
    (next: CashflowDashboardState, rollbackState: CashflowDashboardState) => {
      const timer = createMutationTimer("cashflow:persist");
      const renderStartedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      const sanitized = timer.trackSync("serialization", () => sanitizeCashflowState(next));
      explicitPersistStateRef.current = JSON.stringify(sanitized);
      setState(sanitized);
      logClientRender("cashflow:persist", renderStartedAt);

      if (!userId) {
        timer.flush({ ok: true, localOnly: true });
        return;
      }

      void (async () => {
        try {
          const saveResponse = await timer.track("database", () =>
            fetch("/api/cashflow", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ state: sanitized }),
            }),
          );
          const saveJson = (await saveResponse.json()) as { ok: boolean; updatedAt?: string; error?: string };
          if (!saveResponse.ok || !saveJson.ok) {
            throw new Error(saveJson.error ?? "Could not save cashflow.");
          }
          timer.flush({ ok: true, updatedAt: saveJson.updatedAt });
        } catch (error) {
          setState(sanitizeCashflowState(rollbackState));
          toast.error(error instanceof Error ? error.message : "Could not save cashflow. Restored previous values.");
          timer.flush({ ok: false, error: error instanceof Error ? error.message : "unknown" });
        }
      })();
    },
    [setState, userId],
  );

  const addIncomeEntry = useCallback(
    async (entry: Omit<IncomeEntry, "id" | "createdAt">) => {
      const nextEntry: IncomeEntry = {
        ...entry,
        id: `income-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      persistCashflowState({
        ...state,
        incomeEntries: [...(state.incomeEntries ?? []), nextEntry],
      }, state);
    },
    [persistCashflowState, state],
  );

  const updateIncomeEntry = useCallback(
    async (id: string, patch: Partial<Omit<IncomeEntry, "id" | "createdAt">>) => {
      persistCashflowState({
        ...state,
        incomeEntries: (state.incomeEntries ?? []).map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      }, state);
    },
    [persistCashflowState, state],
  );

  const deleteIncomeEntry = useCallback(
    async (id: string) => {
      persistCashflowState({
        ...state,
        incomeEntries: (state.incomeEntries ?? []).filter((entry) => entry.id !== id),
      }, state);
    },
    [persistCashflowState, state],
  );

  return {
    state,
    setState,
    hydrated,
    metrics,
    patchIncome,
    patchExpense,
    addIncomeEntry,
    updateIncomeEntry,
    deleteIncomeEntry,
  };
}
