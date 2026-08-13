"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import {
  cashflowStorageKey,
  defaultCashflowState,
  loadCashflowState,
  sanitizeCashflowState,
} from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import {
  defaultWealthState,
  loadWealthPortfolioState,
  portfolioStorageKey,
} from "@/components/portfolio/storage";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { EXPENSE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { readMonthlyExpenseFromModule } from "@/lib/cashflow/cashflow-live-metrics";
import { computeUnifiedFireSummary, type UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadWealthPortfolioFromSupabase } from "@/services/portfolio-supabase";

function storageTouchesSession(key: string | null, userId?: string | null): boolean {
  if (key == null) return false;
  return key === portfolioStorageKey(userId) || key === cashflowStorageKey(userId);
}

/**
 * Live unified summary for FIRE Journey.
 * Authenticated: reads portfolio + cashflow from Supabase (cache only after cloud hydrate).
 * Guests: localStorage.
 */
export function useUnifiedFireSummary(): {
  summary: UnifiedFireSummary;
  portfolio: WealthPortfolioStateV2;
  cashflow: CashflowDashboardState;
  ratesLoading: boolean;
  resync: () => void;
} {
  const { user, loading } = useProductAuth();
  const uid = user?.id;
  const [portfolio, setPortfolio] = useState<WealthPortfolioStateV2>(() => defaultWealthState());
  const [cashflow, setCashflow] = useState<CashflowDashboardState>(() => defaultCashflowState());
  const [autoExpenseTotal, setAutoExpenseTotal] = useState(0);
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);

  const refreshExpenseBurn = useCallback(() => {
    setAutoExpenseTotal(readMonthlyExpenseFromModule());
  }, []);

  const resync = useCallback(() => {
    refreshExpenseBurn();
    if (!uid || !isSupabaseConfigured()) {
      setPortfolio(loadWealthPortfolioState(uid));
      setCashflow(loadCashflowState(uid));
      return;
    }

    void (async () => {
      try {
        const [cfRes, remotePortfolio] = await Promise.all([
          fetch("/api/cashflow", { credentials: "include", cache: "no-store" }).then(
            (r) =>
              r.json() as Promise<{
                ok: boolean;
                snapshot?: { state: CashflowDashboardState } | null;
              }>,
          ),
          loadWealthPortfolioFromSupabase(getSupabaseBrowserClient(), uid),
        ]);
        setPortfolio(remotePortfolio ?? defaultWealthState());
        setCashflow(
          cfRes.ok && cfRes.snapshot?.state
            ? sanitizeCashflowState(cfRes.snapshot.state)
            : defaultCashflowState(),
        );
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[unified-fire-summary] cloud resync failed", error);
        }
        setPortfolio(defaultWealthState());
        setCashflow(defaultCashflowState());
      }
    })();
  }, [refreshExpenseBurn, uid]);

  useEffect(() => {
    if (loading) return;
    resync();
  }, [loading, resync]);

  useEffect(() => {
    // Guests: cross-tab localStorage. Authenticated: cloud events only.
    if (uid) return;
    const onStorage = (e: StorageEvent) => {
      if (!storageTouchesSession(e.key, uid)) return;
      resync();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [resync, uid]);

  useEffect(() => {
    const onExternal = () => resync();
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    window.addEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onExternal);
    window.addEventListener(EXPENSE_MODULE_SYNC_EVENT, onExternal);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onExternal);
      window.removeEventListener(EXPENSE_MODULE_SYNC_EVENT, onExternal);
    };
  }, [resync]);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    fetchNprCrossRates().then((r) => {
      if (cancelled) return;
      setKrwPerNpr(r.krwPerNpr);
      setUsdPerNpr(r.usdPerNpr);
      setRatesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(
    () =>
      computeUnifiedFireSummary(portfolio, cashflow, krwPerNpr, usdPerNpr, {
        autoExpenseTotal,
      }),
    [portfolio, cashflow, krwPerNpr, usdPerNpr, autoExpenseTotal],
  );

  return { summary, portfolio, cashflow, ratesLoading, resync };
}
