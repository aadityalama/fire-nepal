"use client";

import { useEffect, useRef } from "react";

function isDocumentVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * Stable interval polling for live dashboards.
 * Skips ticks while the tab is hidden (browsers may throttle anyway; this also
 * avoids waking serverless routes for background tabs).
 */
export function useLiveInterval(callback: () => void, intervalMs: number, enabled: boolean) {
  const cb = useRef(callback);

  useEffect(() => {
    cb.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const tick = () => {
      if (!isDocumentVisible()) return;
      cb.current();
    };

    const id = window.setInterval(tick, intervalMs);

    const onVis = () => {
      if (document.visibilityState === "visible") cb.current();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, enabled]);
}
