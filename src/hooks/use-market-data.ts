"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveInterval } from "@/hooks/live-data/use-live-interval";
import type { MarketSnapshot } from "@/types/market";

export type MarketDataStatus = "idle" | "loading" | "ready" | "error";

/** Aligned with short server TTL on /api/market/summary — was 20–22.5s with cache-busting. */
const DEFAULT_POLL_MS = 60_000;

export function useMarketData(opts: {
  symbolsCsv: string;
  cryptoCsv: string;
  pollMs?: number;
  enabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [status, setStatus] = useState<MarketDataStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const retryUntilRef = useRef<number>(0);
  const hasDataRef = useRef(false);

  const fetchUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const u = new URL("/api/market/summary", window.location.origin);
    if (opts.symbolsCsv) u.searchParams.set("symbols", opts.symbolsCsv);
    if (opts.cryptoCsv) u.searchParams.set("crypto", opts.cryptoCsv);
    return u.toString();
  }, [opts.symbolsCsv, opts.cryptoCsv]);

  const load = useCallback(async () => {
    if (opts.enabled === false || !fetchUrl) return;
    if (Date.now() < retryUntilRef.current) return;

    setError(null);
    if (!hasDataRef.current) setStatus("loading");

    try {
      // Do not append cache-busting query params — allow CDN / browser to reuse short TTL.
      const res = await fetch(fetchUrl, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 429) {
        const j = (await res.json().catch(() => null)) as { retryAfterSec?: number } | null;
        const ra = typeof j?.retryAfterSec === "number" ? j.retryAfterSec : 45;
        retryUntilRef.current = Date.now() + ra * 1000;
        setError("Market feed rate-limited — backing off.");
        setStatus("error");
        return;
      }
      if (!res.ok) throw new Error(`Market summary HTTP ${res.status}`);
      const body = (await res.json()) as MarketSnapshot;
      setSnapshot(body);
      hasDataRef.current = true;
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Market summary failed");
      setStatus("error");
    }
  }, [fetchUrl, opts.enabled]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  useLiveInterval(() => void load(), opts.pollMs ?? DEFAULT_POLL_MS, opts.enabled !== false && Boolean(fetchUrl));

  return { snapshot, status, error, reload: load };
}
