"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { CASHFLOW_STORAGE_KEY, loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { loadWealthPortfolioState, STORAGE_KEY_V2 } from "@/components/portfolio/storage";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { computeUnifiedFireSummary, type UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { FALLBACK_USD_PER_NPR, fetchNprCrossRates } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";

function isRelevantStorageKey(key: string | null): boolean {
  return key === STORAGE_KEY_V2 || key === CASHFLOW_STORAGE_KEY;
}

/**
 * Live unified summary: reads portfolio + cashflow from `localStorage`, applies FX,
 * and recomputes whenever sources change (navigation, visibility, cross-tab storage).
 */
export function useUnifiedFireSummary(): {
  summary: UnifiedFireSummary;
  portfolio: WealthPortfolioStateV2;
  cashflow: CashflowDashboardState;
  ratesLoading: boolean;
  resync: () => void;
} {
  const [portfolio, setPortfolio] = useState<WealthPortfolioStateV2>(() => loadWealthPortfolioState());
  const [cashflow, setCashflow] = useState<CashflowDashboardState>(() => loadCashflowState());
  const [krwPerNpr, setKrwPerNpr] = useState(FALLBACK_KRW_PER_NPR);
  const [usdPerNpr, setUsdPerNpr] = useState(FALLBACK_USD_PER_NPR);
  const [ratesLoading, setRatesLoading] = useState(true);

  const resync = useCallback(() => {
    setPortfolio(loadWealthPortfolioState());
    setCashflow(loadCashflowState());
  }, []);

  useEffect(() => {
    resync();
  }, [resync]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!isRelevantStorageKey(e.key)) return;
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
  }, [resync]);

  useEffect(() => {
    const onExternal = () => resync();
    window.addEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
    return () => window.removeEventListener(CASHFLOW_EXTERNAL_SYNC_EVENT, onExternal);
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
    () => computeUnifiedFireSummary(portfolio, cashflow, krwPerNpr, usdPerNpr),
    [portfolio, cashflow, krwPerNpr, usdPerNpr],
  );

  return { summary, portfolio, cashflow, ratesLoading, resync };
}
