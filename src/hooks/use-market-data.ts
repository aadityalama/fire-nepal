"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveInterval } from "@/hooks/live-data/use-live-interval";
import type { MarketSnapshot } from "@/types/market";

export type MarketDataStatus = "idle" | "loading" | "ready" | "error";

/** Open-market cadence — aligned with CDN s-maxage on /api/market/summary. */
const OPEN_POLL_MS = 90_000;
/** Closed / weekend — official sync is cron-backed; no need to hammer origin. */
const CLOSED_POLL_MS = 5 * 60_000;

export function useMarketData(opts: {
  symbolsCsv: string;
  cryptoCsv: string;
  /** Comma-separated NEPSE tickers when `board` is lite. */
  nepseCsv?: string;
  /**
   * `full` = hub board (large). `lite` = portfolio holdings only (small).
   * Defaults to full for backward compatibility.
   */
  board?: "full" | "lite";
  pollMs?: number;
  enabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [status, setStatus] = useState<MarketDataStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const retryUntilRef = useRef<number>(0);
  const hasDataRef = useRef(false);
  const board = opts.board ?? "full";

  const fetchUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const u = new URL("/api/market/summary", window.location.origin);
    u.searchParams.set("board", board === "lite" ? "0" : "1");
    if (opts.symbolsCsv) u.searchParams.set("symbols", opts.symbolsCsv);
    if (opts.cryptoCsv) u.searchParams.set("crypto", opts.cryptoCsv);
    if (board === "lite" && opts.nepseCsv) u.searchParams.set("nepse", opts.nepseCsv);
    return u.toString();
  }, [opts.symbolsCsv, opts.cryptoCsv, opts.nepseCsv, board]);

  const marketOpen = snapshot?.nepseSync?.marketIsOpen === true;
  const adaptivePollMs =
    opts.pollMs ?? (snapshot ? (marketOpen ? OPEN_POLL_MS : CLOSED_POLL_MS) : OPEN_POLL_MS);

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

  useLiveInterval(() => void load(), adaptivePollMs, opts.enabled !== false && Boolean(fetchUrl));

  return { snapshot, status, error, reload: load };
}
