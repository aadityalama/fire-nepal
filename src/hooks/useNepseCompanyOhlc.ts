"use client";

import { useCallback, useState } from "react";
import { useVisibilityPoll } from "@/hooks/live-data/use-visibility-poll";
import type { NepseOhlcPayload } from "@/services/market/nepse-company-ohlc";

type State = {
  data: NepseOhlcPayload | null;
  loaded: boolean;
  error: string | null;
};

const REFRESH_MS = 10 * 60_000;

/** Client hook for real EOD OHLC bars from `nepse_eod_prices`. */
export function useNepseCompanyOhlc(symbol: string, limit = 400): State {
  const normalized = decodeURIComponent(symbol).trim().toUpperCase();
  const [state, setState] = useState<State>({ data: null, loaded: false, error: null });

  const load = useCallback(
    async (ctx: { isActive: () => boolean }) => {
      if (!normalized) return;
      try {
        const response = await fetch(`/api/market/nepse/company/${encodeURIComponent(normalized)}/ohlc?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseOhlcPayload;
        if (!ctx.isActive()) return;
        setState({ data: payload, loaded: true, error: null });
      } catch (error) {
        if (!ctx.isActive()) return;
        setState({
          data: null,
          loaded: true,
          error: error instanceof Error ? error.message : "Failed to load OHLC",
        });
      }
    },
    [normalized, limit],
  );

  useVisibilityPoll(load, REFRESH_MS, Boolean(normalized));

  return state;
}
