"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { NepseSecurityTick } from "@/types/market";

const ALERTS_KEY = "fire-nepal-nepse-alerts-v1";
const MAX_ALERTS = 40;

export type NepsePriceAlert = {
  id: string;
  symbol: string;
  direction: "above" | "below";
  targetNpr: number;
  createdAt: string;
};

export type TriggeredNepseAlert = NepsePriceAlert & { ltpNpr: number };

const EMPTY_ALERTS: NepsePriceAlert[] = [];

function readAlerts(): NepsePriceAlert[] {
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    if (!raw) return EMPTY_ALERTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_ALERTS;
    return parsed
      .filter(
        (item): item is NepsePriceAlert =>
          typeof item === "object" &&
          item != null &&
          typeof (item as NepsePriceAlert).symbol === "string" &&
          typeof (item as NepsePriceAlert).targetNpr === "number" &&
          ((item as NepsePriceAlert).direction === "above" || (item as NepsePriceAlert).direction === "below"),
      )
      .slice(0, MAX_ALERTS);
  } catch {
    return EMPTY_ALERTS;
  }
}

/** Module-level store so every consumer (hub banner, company composer) shares one alert list. */
let cachedAlerts: NepsePriceAlert[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): NepsePriceAlert[] {
  if (cachedAlerts == null) cachedAlerts = readAlerts();
  return cachedAlerts;
}

function getServerSnapshot(): NepsePriceAlert[] {
  return EMPTY_ALERTS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ALERTS_KEY) {
      cachedAlerts = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: NepsePriceAlert[]) {
  cachedAlerts = next;
  try {
    window.localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — alerts stay in memory for the session */
  }
  emit();
}

/**
 * Device-local NEPSE price alerts evaluated against the live snapshot.
 * Storage-only concern; no server or schema dependency.
 */
export function useNepseAlerts(bySymbol?: Record<string, NepseSecurityTick>) {
  const alerts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addAlert = useCallback((symbol: string, direction: "above" | "below", targetNpr: number) => {
    const cleanSymbol = symbol.replace(/\s+/g, "").toUpperCase();
    if (!cleanSymbol || !Number.isFinite(targetNpr) || targetNpr <= 0) return;
    const current = getSnapshot();
    commit(
      [
        ...current.filter((alert) => !(alert.symbol === cleanSymbol && alert.direction === direction)),
        {
          id: `${cleanSymbol}-${direction}-${Date.now()}`,
          symbol: cleanSymbol,
          direction,
          targetNpr,
          createdAt: new Date().toISOString(),
        },
      ].slice(-MAX_ALERTS),
    );
  }, []);

  const removeAlert = useCallback((id: string) => {
    commit(getSnapshot().filter((alert) => alert.id !== id));
  }, []);

  const triggered = useMemo<TriggeredNepseAlert[]>(() => {
    if (!bySymbol) return [];
    return alerts.flatMap((alert) => {
      const tick = bySymbol[alert.symbol];
      // ltp <= 0 means the feed has no usable quote (same convention as the terminal snapshot).
      if (!tick || !Number.isFinite(tick.ltpNpr) || tick.ltpNpr <= 0) return [];
      const hit =
        alert.direction === "above" ? tick.ltpNpr >= alert.targetNpr : tick.ltpNpr <= alert.targetNpr;
      return hit ? [{ ...alert, ltpNpr: tick.ltpNpr }] : [];
    });
  }, [alerts, bySymbol]);

  return { alerts, addAlert, removeAlert, triggered };
}
