"use client";

import useSWR from "swr";
import type { GlobalFinancialIntelligenceSnapshot } from "@/types/global-financial-intelligence";

/** Was 45s — too aggressive for a multi-upstream aggregation route. */
const REFRESH_MS = 5 * 60_000;

async function fetcher(url: string): Promise<GlobalFinancialIntelligenceSnapshot> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 429) {
    const body = (await res.json().catch(() => null)) as { retryAfterSec?: number } | null;
    throw new Error(`Rate limited. Retrying in ${body?.retryAfterSec ?? 60}s.`);
  }
  if (!res.ok) throw new Error(`Global intelligence HTTP ${res.status}`);
  return (await res.json()) as GlobalFinancialIntelligenceSnapshot;
}

export function useGlobalFinancialIntelligence() {
  const swr = useSWR<GlobalFinancialIntelligenceSnapshot>(
    "/api/global-financial-intelligence",
    fetcher,
    {
      refreshInterval: REFRESH_MS,
      dedupingInterval: 60_000,
      errorRetryInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: true,
      shouldRetryOnError: true,
    },
  );

  return {
    snapshot: swr.data,
    isLoading: swr.isLoading,
    isRefreshing: swr.isValidating && Boolean(swr.data),
    error: swr.error instanceof Error ? swr.error.message : null,
    refresh: swr.mutate,
    refreshMs: REFRESH_MS,
  };
}
