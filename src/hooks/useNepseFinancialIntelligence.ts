"use client";

import { useCallback, useState } from "react";
import { useVisibilityPoll } from "@/hooks/live-data/use-visibility-poll";
import type { NepseFinancialIntelligencePayload } from "@/types/market/nepse-financial-intelligence";

type State = {
  data: NepseFinancialIntelligencePayload | null;
  loaded: boolean;
  error: string | null;
};

const REFRESH_MS = 15 * 60_000;

/** Client hook for the Company Details Financial Intelligence section. */
export function useNepseFinancialIntelligence(symbol: string): State {
  const normalized = decodeURIComponent(symbol).trim().toUpperCase();
  const [state, setState] = useState<State>({ data: null, loaded: false, error: null });

  const load = useCallback(
    async (ctx: { isActive: () => boolean }) => {
      if (!normalized) return;
      try {
        const response = await fetch(
          `/api/market/nepse/company/${encodeURIComponent(normalized)}/financial-intelligence`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseFinancialIntelligencePayload;
        if (!ctx.isActive()) return;
        setState({ data: payload, loaded: true, error: null });
      } catch (error) {
        if (!ctx.isActive()) return;
        setState({
          data: null,
          loaded: true,
          error: error instanceof Error ? error.message : "Failed to load financial intelligence",
        });
      }
    },
    [normalized],
  );

  useVisibilityPoll(load, REFRESH_MS, Boolean(normalized));

  return state;
}
