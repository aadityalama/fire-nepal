"use client";

import { useEffect, useState } from "react";
import type { NepseOhlcPayload } from "@/services/market/nepse-company-ohlc";

type State = {
  data: NepseOhlcPayload | null;
  loaded: boolean;
  error: string | null;
};

const REFRESH_MS = 5 * 60_000;

/** Client hook for real EOD OHLC bars from `nepse_eod_prices`. */
export function useNepseCompanyOhlc(symbol: string, limit = 400): State {
  const normalized = decodeURIComponent(symbol).trim().toUpperCase();
  const [state, setState] = useState<State>({ data: null, loaded: false, error: null });

  useEffect(() => {
    if (!normalized) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/market/nepse/company/${encodeURIComponent(normalized)}/ohlc?limit=${limit}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseOhlcPayload;
        if (!cancelled) setState({ data: payload, loaded: true, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loaded: true,
            error: error instanceof Error ? error.message : "Failed to load OHLC",
          });
        }
      }
    };
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [normalized, limit]);

  return state;
}
