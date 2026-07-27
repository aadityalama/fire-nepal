"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NepseIndexIntradayPayload } from "@/services/market/nepse-index-intraday";
import { getKathmanduMarketStatus } from "@/lib/market/nepse-hub";

const OPEN_POLL_MS = 25_000;
const CLOSED_POLL_MS = 120_000;

type State = {
  data: NepseIndexIntradayPayload | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Auto-refreshing official NEPSE intraday index series for the Hub hero chart.
 * Polls faster while the continuous session is open.
 */
export function useNepseIndexIntraday(): State {
  const [data, setData] = useState<NepseIndexIntradayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/market/nepse/index-intraday?_=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as NepseIndexIntradayPayload & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setError(payload.error ?? `HTTP ${response.status}`);
          if (payload.points?.length) setData(payload);
        } else {
          setError(null);
          setData(payload);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Failed to load intraday chart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tick]);

  useEffect(() => {
    const schedule = () => {
      const open = getKathmanduMarketStatus().live;
      return window.setTimeout(() => setTick((n) => n + 1), open ? OPEN_POLL_MS : CLOSED_POLL_MS);
    };
    const timer = schedule();
    const onVisibility = () => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tick]);

  return { data, loading, error, reload };
}
