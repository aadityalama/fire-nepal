"use client";

import { useEffect, useRef } from "react";

function isDocumentVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

export type VisibilityPollContext = {
  /** True until the effect cleans up (unmount or deps change). */
  isActive: () => boolean;
};

/**
 * Runs `load` immediately, then on an interval while the tab is visible.
 * Callers should gate `setState` with `ctx.isActive()`.
 */
export function useVisibilityPoll(
  load: (ctx: VisibilityPollContext) => void | Promise<void>,
  refreshMs: number,
  enabled = true,
) {
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled || refreshMs <= 0) return;

    let active = true;
    const ctx: VisibilityPollContext = { isActive: () => active };

    const run = () => {
      if (!active || !isDocumentVisible()) return;
      void loadRef.current(ctx);
    };

    run();
    const timer = window.setInterval(run, refreshMs);
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshMs, enabled]);
}
