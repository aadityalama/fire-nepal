"use client";

import { useEffect, useState } from "react";
import type { NepseAiIntelligencePayload } from "@/types/market/nepse-ai-intelligence";

type State = {
  data: NepseAiIntelligencePayload | null;
  loaded: boolean;
  error: string | null;
};

const REFRESH_MS = 10 * 60_000;

/** Client hook for Company Details AI Company Intelligence. */
export function useNepseAiIntelligence(symbol: string): State {
  const normalized = decodeURIComponent(symbol).trim().toUpperCase();
  const [state, setState] = useState<State>({ data: null, loaded: false, error: null });

  useEffect(() => {
    if (!normalized) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/market/nepse/company/${encodeURIComponent(normalized)}/ai-intelligence`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseAiIntelligencePayload;
        if (!cancelled) setState({ data: payload, loaded: true, error: null });
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loaded: true,
            error: error instanceof Error ? error.message : "Failed to load AI intelligence",
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
