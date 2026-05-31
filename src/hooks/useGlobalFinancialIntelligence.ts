"use client";

import useSWR from "swr";
import type { GlobalFinancialIntelligenceSnapshot } from "@/types/global-financial-intelligence";

const REFRESH_MS = 45_000;

async function fetcher(url: string): Promise<GlobalFinancialIntelligenceSnapshot> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
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
      dedupingInterval: 15_000,
      errorRetryInterval: 30_000,
      revalidateOnFocus: true,
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
