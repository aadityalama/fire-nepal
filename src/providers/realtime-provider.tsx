"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { allocationPercents, fireReadinessScore } from "@/components/portfolio/calculations";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useMarketData, type MarketDataStatus } from "@/hooks/use-market-data";
import { buildHoldingRealtimeMetrics, type HoldingRealtimeMetrics } from "@/services/portfolio/live-holdings-intel";
import { buildLiveIntelligenceBundle } from "@/services/portfolio/live-ai-insights";
import { buildLivePortfolioOverlay } from "@/services/portfolio/live-overlay";
import { collectMarketSymbolsFromPortfolio } from "@/services/portfolio/symbols-from-state";
import type { LiveIntelligenceBundle, LivePortfolioOverlay } from "@/types/portfolio/live";
import type { MarketSnapshot } from "@/types/market";

export type RealtimeMarketContextValue = {
  snapshot: MarketSnapshot | null;
  status: MarketDataStatus;
  error: string | null;
  overlay: LivePortfolioOverlay | null;
  intel: LiveIntelligenceBundle | null;
  /** Per-row live marks vs NPR cost, day %, FIRE slice, SIP IRR (when configured). */
  holdingsLive: HoldingRealtimeMetrics[];
  reload: () => void;
};

const RealtimeMarketContext = createContext<RealtimeMarketContextValue | null>(null);

/**
 * Portfolio-scoped realtime market polling + derived live overlays.
 * Uses public proxies only — no secrets. Supabase row sync remains in `WealthPortfolioCloudSync`.
 */
export function RealtimeMarketProvider({ children }: { children: ReactNode }) {
  const { state, hydrated, krwPerNpr, usdPerNpr, bullionGramRatesNpr } = useWealthPortfolio();

  const { symbolsCsv, cryptoCsv } = useMemo(() => {
    const pack = collectMarketSymbolsFromPortfolio(state);
    return {
      symbolsCsv: pack.yahoo.join(","),
      cryptoCsv: pack.cryptoIds.join(","),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- symbol list only depends on `state.investments`
  }, [state.investments]);

  const { snapshot, status, error, reload } = useMarketData({
    symbolsCsv,
    cryptoCsv,
    pollMs: 22_500,
    enabled: hydrated,
  });

  const overlay = useMemo(() => {
    if (!snapshot) return null;
    return buildLivePortfolioOverlay(state, krwPerNpr, usdPerNpr, snapshot, bullionGramRatesNpr);
  }, [snapshot, state, krwPerNpr, usdPerNpr, bullionGramRatesNpr]);

  const holdingsLive = useMemo(() => {
    if (!snapshot || !overlay) return [];
    return buildHoldingRealtimeMetrics(
      state.investments,
      krwPerNpr,
      usdPerNpr,
      snapshot,
      overlay.totalsLive.netWorthNpr,
    );
  }, [snapshot, overlay, state.investments, krwPerNpr, usdPerNpr]);

  const intel = useMemo(() => {
    if (!overlay) return null;
    const alloc = allocationPercents(overlay.totalsLive);
    const fire = fireReadinessScore(overlay.totalsLive);
    return buildLiveIntelligenceBundle({ overlay, allocation: alloc, fireScore: fire });
  }, [overlay]);

  const value = useMemo<RealtimeMarketContextValue>(
    () => ({
      snapshot,
      status,
      error,
      overlay,
      intel,
      holdingsLive,
      reload,
    }),
    [snapshot, status, error, overlay, intel, holdingsLive, reload],
  );

  return <RealtimeMarketContext.Provider value={value}>{children}</RealtimeMarketContext.Provider>;
}

export function useRealtimeMarket(): RealtimeMarketContextValue {
  const ctx = useContext(RealtimeMarketContext);
  if (!ctx) {
    throw new Error("useRealtimeMarket must be used within RealtimeMarketProvider");
  }
  return ctx;
}
