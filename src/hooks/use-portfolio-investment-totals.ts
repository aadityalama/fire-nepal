"use client";

import { useMemo } from "react";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import {
  aggregateInvestmentTotals,
  type InvestmentAggregationResult,
} from "@/services/portfolio/investment-aggregation";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import type { MarketSnapshot } from "@/types/market";

/**
 * Single shared investment total for dashboards — uses the same valuation path as the
 * Investment workspace (all rows, all kinds, optional live quotes).
 */
export function usePortfolioInvestmentTotals(liveMarketOverride?: MarketSnapshot | null): InvestmentAggregationResult {
  const { state, krwPerNpr, usdPerNpr } = useWealthPortfolio();
  const { snapshot } = useRealtimeMarket();
  const liveMarket = liveMarketOverride !== undefined ? liveMarketOverride : snapshot;

  return useMemo(
    () =>
      aggregateInvestmentTotals(state.investments, state.fixedDeposits, {
        krwPerNpr,
        usdPerNpr,
        liveMarket,
      }),
    [state.investments, state.fixedDeposits, krwPerNpr, usdPerNpr, liveMarket],
  );
}
