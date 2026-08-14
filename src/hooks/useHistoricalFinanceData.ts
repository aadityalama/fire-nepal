"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { defaultCashflowState, sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { defaultTransactionFilters, type ExpenseTransactionRow } from "@/lib/transaction-history-types";
import { listAllExpenseTransactionsForExport } from "@/services/expense-transactions-supabase";
import { EXPENSE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";

export type HistoricalFinanceDataset = {
  cashflow: CashflowDashboardState;
  transactions: ExpenseTransactionRow[];
  fetchedAt: number;
};

export type HistoricalFinanceLoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: HistoricalFinanceDataset }
  | { status: "error"; message: string; data: HistoricalFinanceDataset | null };

/**
 * Fetch authenticated user's cashflow + expense history once, then reuse for all charts.
 * On temporary network failure, keep the last successful dataset (do not wipe to empty).
 */
export function useHistoricalFinanceData(userId: string | null | undefined) {
  const [state, setState] = useState<HistoricalFinanceLoadState>({ status: "idle" });
  const cacheRef = useRef<HistoricalFinanceDataset | null>(null);
  const inFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId) {
        setState({ status: "error", message: "Sign in to view financial history.", data: cacheRef.current });
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!opts?.silent || !cacheRef.current) {
        setState((prev) => {
          if (prev.status === "ready") return prev;
          if (prev.status === "error" && prev.data) return prev;
          return { status: "loading" };
        });
      }

      try {
        if (!isSupabaseConfigured()) {
          throw new Error("Unable to load financial history. Please try again.");
        }

        const [cashflowRes, client] = await Promise.all([
          fetch("/api/cashflow", { credentials: "include", cache: "no-store" }),
          Promise.resolve(getSupabaseBrowserClient()),
        ]);

        const cashflowJson = (await cashflowRes.json()) as {
          ok: boolean;
          snapshot?: { state: CashflowDashboardState } | null;
          error?: string;
        };

        if (!cashflowRes.ok || !cashflowJson.ok) {
          throw new Error(cashflowJson.error ?? "Unable to load financial history. Please try again.");
        }

        const cashflow = cashflowJson.snapshot?.state
          ? sanitizeCashflowState(cashflowJson.snapshot.state)
          : defaultCashflowState();

        const { rows } = await listAllExpenseTransactionsForExport(client, userId, defaultTransactionFilters());

        const next: HistoricalFinanceDataset = {
          cashflow,
          transactions: rows,
          fetchedAt: Date.now(),
        };
        cacheRef.current = next;
        setState({ status: "ready", data: next });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message.includes("Unable to load")
              ? error.message
              : "Unable to load financial history. Please try again."
            : "Unable to load financial history. Please try again.";
        setState({
          status: "error",
          message,
          data: cacheRef.current,
        });
      } finally {
        inFlightRef.current = false;
      }
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const onSync = () => {
      void load({ silent: true });
    };
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, onSync);
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onSync);
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onSync);
    return () => {
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, onSync);
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onSync);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onSync);
    };
  }, [load, userId]);

  return {
    state,
    reload: () => load({ silent: false }),
    dataset: state.status === "ready" ? state.data : state.status === "error" ? state.data : null,
  };
}
