"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { BUDGET_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
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
import { fetchBudgetRecords } from "@/lib/budget/budget-api";
import type { BudgetRecord } from "@/lib/budget/types";
import {
  normalizeBudgetForEmergencyFund,
  resolveMonthlyProtectionBasis,
} from "@/lib/emergency-fund/budget-integration";
import { loadEmergencyFundSettingsLocal } from "@/lib/emergency-fund/settings";
import { computeUnifiedFireSummary, type UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { FINANCE_CLOUD_CACHE_READY_EVENT } from "@/lib/finance/hydrate-authenticated-finance-cache";
import { useMarketData } from "@/hooks/use-market-data";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadWealthPortfolioFromSupabase } from "@/services/portfolio-supabase";
import { collectMarketSymbolsFromPortfolio } from "@/services/portfolio/symbols-from-state";

function monthlyBasisFromBudgets(budgets: BudgetRecord[], userId?: string | null): number | null {
  if (budgets.length === 0) return null;
  const settings = loadEmergencyFundSettingsLocal(userId);
  const breakdown = normalizeBudgetForEmergencyFund(budgets, {
    yearlyAllocationDecisions: settings.yearlyAllocationDecisions,
  });
  if (!breakdown.hasBudgetData) return null;
  const resolved = resolveMonthlyProtectionBasis(
    breakdown,
    settings.protectionMode,
    settings.essentialRecordIds,
    { excludedRecordIds: settings.excludedRecordIds },
  );
  return resolved.finalMonthlyProtectionBasisNpr > 0
    ? resolved.finalMonthlyProtectionBasisNpr
    : null;
}

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
  const [monthlyProtectionBasisNpr, setMonthlyProtectionBasisNpr] = useState<number | null>(null);
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);

  const resync = useCallback(() => {
    if (!uid || !isSupabaseConfigured()) {
      setPortfolio(loadWealthPortfolioState(uid));
      setCashflow(loadCashflowState(uid));
      setMonthlyProtectionBasisNpr(null);
      return;
    }

    void (async () => {
      try {
        const [cfRes, remotePortfolio, budgets] = await Promise.all([
          fetch("/api/cashflow", { credentials: "include", cache: "no-store" }).then(
            (r) =>
              r.json() as Promise<{
                ok: boolean;
                snapshot?: { state: CashflowDashboardState } | null;
              }>,
          ),
          loadWealthPortfolioFromSupabase(getSupabaseBrowserClient(), uid),
          fetchBudgetRecords().catch(() => [] as BudgetRecord[]),
        ]);
        setPortfolio(remotePortfolio ?? defaultWealthState());
        setCashflow(
          cfRes.ok && cfRes.snapshot?.state
            ? sanitizeCashflowState(cfRes.snapshot.state)
            : defaultCashflowState(),
        );
        setMonthlyProtectionBasisNpr(monthlyBasisFromBudgets(budgets, uid));
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[unified-fire-summary] cloud resync failed", error);
        }
        setPortfolio(defaultWealthState());
        setCashflow(defaultCashflowState());
        setMonthlyProtectionBasisNpr(null);
      }
    })();
  }, [uid]);

  useEffect(() => {
    if (loading) return;
    queueMicrotask(() => {
      resync();
    });
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
    window.addEventListener(BUDGET_MODULE_SYNC_EVENT, onExternal);
    return () => {
      window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
      window.removeEventListener(FINANCE_CLOUD_CACHE_READY_EVENT, onExternal);
      window.removeEventListener(BUDGET_MODULE_SYNC_EVENT, onExternal);
    };
  }, [resync]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setRatesLoading(true);
      fetchNprCrossRates().then((r) => {
        if (cancelled) return;
        setKrwPerNpr(r.krwPerNpr);
        setUsdPerNpr(r.usdPerNpr);
        setRatesLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Same market feed as NEPSE Portfolio Dashboard — marks listed holdings to LTP.
  const { symbolsCsv, cryptoCsv } = useMemo(() => {
    const pack = collectMarketSymbolsFromPortfolio(portfolio);
    return {
      symbolsCsv: pack.yahoo.join(","),
      cryptoCsv: pack.cryptoIds.join(","),
    };
  }, [portfolio]);

  const { snapshot: liveMarket } = useMarketData({
    symbolsCsv,
    cryptoCsv,
    pollMs: 60_000,
    enabled: !loading && portfolio.investments.length > 0,
  });

  const summary = useMemo(
    () =>
      computeUnifiedFireSummary(portfolio, cashflow, krwPerNpr, usdPerNpr, {
        monthlyProtectionBasisNpr,
        liveMarket,
      }),
    [portfolio, cashflow, krwPerNpr, usdPerNpr, monthlyProtectionBasisNpr, liveMarket],
  );

  return { summary, portfolio, cashflow, ratesLoading, resync };
}
