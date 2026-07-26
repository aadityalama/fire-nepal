"use client";

import { useEffect, useState } from "react";

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

const REFRESH_MS = 5 * 60_000;

/** Aggregated market headlines persisted by the automatic data engine. */
export function useNepseNews(options?: { limit?: number; symbol?: string }): NewsState {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 80);
  const symbol = options?.symbol?.trim().toUpperCase() ?? "";
  const [state, setState] = useState<NewsState>({ items: [], corporateActions: [], loaded: false });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (symbol) params.set("symbol", symbol);
        const response = await fetch(`/api/market/nepse/news?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { items?: NepseNewsItem[]; corporateActions?: NepseNewsItem[] };
        if (!cancelled) {
          setState({ items: payload.items ?? [], corporateActions: payload.corporateActions ?? [], loaded: true });
        }
      } catch {
        if (!cancelled) setState((current) => ({ ...current, loaded: true }));
      }
    };
    void load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [limit, symbol]);

  return state;
}
