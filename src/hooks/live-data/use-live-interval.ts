"use client";

import { useEffect, useRef } from "react";

/** Stable interval polling for live dashboards (browser may throttle background tabs). */
export function useLiveInterval(callback: () => void, intervalMs: number, enabled: boolean) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const tick = () => cb.current();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
