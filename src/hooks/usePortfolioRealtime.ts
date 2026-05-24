"use client";

import { useRealtimeMarket } from "@/providers/realtime-provider";

/**
 * Portfolio-scoped realtime alias — same provider as `useRealtimeMarket`
 * (`holdingsLive`, NEPSE terminal, live overlay, polling).
 */
export function usePortfolioRealtime() {
  return useRealtimeMarket();
}
