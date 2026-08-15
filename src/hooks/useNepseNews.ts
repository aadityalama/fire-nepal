"use client";

import { useCallback, useState } from "react";
import { useVisibilityPoll } from "@/hooks/live-data/use-visibility-poll";

export type NepseNewsItem = {
  id: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string | null;
  isCorporateAction: boolean;
};

type NewsState = {
  items: NepseNewsItem[];
  corporateActions: NepseNewsItem[];
  loaded: boolean;
};

const REFRESH_MS = 10 * 60_000;

/** Aggregated market headlines persisted by the automatic data engine. */
export function useNepseNews(options?: { limit?: number; symbol?: string }): NewsState {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 80);
  const symbol = options?.symbol?.trim().toUpperCase() ?? "";
  const [state, setState] = useState<NewsState>({ items: [], corporateActions: [], loaded: false });

  const load = useCallback(
    async (ctx: { isActive: () => boolean }) => {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (symbol) params.set("symbol", symbol);
        const response = await fetch(`/api/market/nepse/news?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { items?: NepseNewsItem[]; corporateActions?: NepseNewsItem[] };
        if (!ctx.isActive()) return;
        setState({ items: payload.items ?? [], corporateActions: payload.corporateActions ?? [], loaded: true });
      } catch {
        if (!ctx.isActive()) return;
        setState((current) => ({ ...current, loaded: true }));
      }
    },
    [limit, symbol],
  );

  useVisibilityPoll(load, REFRESH_MS, true);

  return state;
}
