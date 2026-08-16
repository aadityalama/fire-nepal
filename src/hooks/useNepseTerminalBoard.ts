"use client";

import { useCallback, useState } from "react";
import { useVisibilityPoll } from "@/hooks/live-data/use-visibility-poll";
import type { NepseTerminalBoardPayload } from "@/types/market/nepse-professional-terminal";

/** Match CDN s-maxage on /api/market/nepse/terminal; avoid sub-cache hammering. */
const DEFAULT_REFRESH_MS = 120_000;

export function useNepseTerminalBoard(refreshMs = DEFAULT_REFRESH_MS) {
  const [data, setData] = useState<NepseTerminalBoardPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ctx: { isActive: () => boolean }) => {
    try {
      const response = await fetch("/api/market/nepse/terminal");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as NepseTerminalBoardPayload;
      if (!ctx.isActive()) return;
      setData(payload);
      setLoaded(true);
      setError(null);
    } catch (err) {
      if (!ctx.isActive()) return;
      setLoaded(true);
      setError(err instanceof Error ? err.message : "Failed to load terminal");
    }
  }, []);

  useVisibilityPoll(load, refreshMs, true);

  return { data, loaded, error };
}
