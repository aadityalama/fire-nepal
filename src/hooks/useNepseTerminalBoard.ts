"use client";

import { useEffect, useState } from "react";
import type { NepseTerminalBoardPayload } from "@/types/market/nepse-professional-terminal";

export function useNepseTerminalBoard(refreshMs = 22_500) {
  const [data, setData] = useState<NepseTerminalBoardPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/market/nepse/terminal");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as NepseTerminalBoardPayload;
        if (!cancelled) {
          setData(payload);
          setLoaded(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoaded(true);
          setError(err instanceof Error ? err.message : "Failed to load terminal");
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

  return { data, loaded, error };
}
