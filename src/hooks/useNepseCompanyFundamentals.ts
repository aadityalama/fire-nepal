"use client";

import { useEffect, useState } from "react";
import type { NepseCompanyFundamentalsPayload } from "@/types/market/nepse-company-fundamentals";

type State = {
  data: NepseCompanyFundamentalsPayload | null;
  loaded: boolean;
  error: string | null;
};

const REFRESH_MS = 5 * 60_000;

/** Client hook for Company Details fundamental data engine. */
export function useNepseCompanyFundamentals(symbol: string): State {
  const normalized = decodeURIComponent(symbol).trim().toUpperCase();
  const [state, setState] = useState<State>({ data: null, loaded: false, error: null });

  useEffect(() => {
    if (!normalized) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/market/nepse/company/${encodeURIComponent(normalized)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseCompanyFundamentalsPayload;
        if (!cancelled) setState({ data: payload, loaded: true, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loaded: true,
            error: error instanceof Error ? error.message : "Failed to load fundamentals",
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
  }, [normalized]);

  return state;
}
