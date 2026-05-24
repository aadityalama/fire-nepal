"use client";

import { useMemo } from "react";
import { useRealtimeMarket } from "@/hooks/useRealtimeMarket";

/**
 * Portfolio-scoped live marks (requires `RealtimeMarketProvider` + `WealthPortfolioProvider`).
 */
export function useRealtimePortfolio() {
  const { overlay, holdingsLive, intel, snapshot, status, error, reload } = useRealtimeMarket();
  return useMemo(
    () => ({ overlay, holdingsLive, intel, snapshot, status, error, reload }),
    [overlay, holdingsLive, intel, snapshot, status, error, reload],
  );
}
