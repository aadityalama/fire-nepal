"use client";

import { useCallback, useEffect, useState } from "react";
import type { IndexExplorerPayload } from "@/types/market/nepse-index-explorer";

export function useNepseIndexExplorer(refreshMs = 22_500) {
  const [data, setData] = useState<IndexExplorerPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/market/nepse/indices", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as IndexExplorerPayload;
      setData(payload);
      setError(null);
      setLoaded(true);
    } catch (err) {
      setLoaded(true);
      setError(err instanceof Error ? err.message : "Failed to load indices");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/market/nepse/indices", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as IndexExplorerPayload;
        if (!cancelled) {
          setData(payload);
          setLoaded(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoaded(true);
          setError(err instanceof Error ? err.message : "Failed to load indices");
        }
      }
    };
    void load();
    const timer = window.setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshMs]);

  return { data, loaded, error, refreshing, reload };
}
