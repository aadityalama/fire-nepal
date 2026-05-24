"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveInterval } from "@/hooks/live-data/use-live-interval";
import type { MarketSnapshot } from "@/types/market";

export type MarketDataStatus = "idle" | "loading" | "ready" | "error";

const DEFAULT_POLL_MS = 20_000;

function withCacheBust(url: string): string {
  const u = new URL(url);
  u.searchParams.set("_t", String(Date.now()));
  return u.toString();
}

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
      const busted = withCacheBust(fetchUrl);
      const res = await fetch(busted, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
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

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && opts.enabled !== false && fetchUrl) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load, opts.enabled, fetchUrl]);

  return { snapshot, status, error, reload: load };
}
