"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { NepseSecurityTick } from "@/types/market";

const ALERTS_KEY = "fire-nepal-nepse-smart-alerts-v1";
const LEGACY_KEY = "fire-nepal-nepse-alerts-v1";
const MAX_ALERTS = 50;

export type NepseSmartAlertKind =
  | "price"
  | "change_pct"
  | "volume"
  | "rsi"
  | "macd_cross"
  | "dividend"
  | "corporate_action"
  | "financial_report";

export type NepseSmartAlert = {
  id: string;
  symbol: string;
  kind: NepseSmartAlertKind;
  /** above/below for numeric kinds; "either" for event kinds. */
  direction: "above" | "below" | "either";
  target: number | null;
  note?: string;
  createdAt: string;
};

export type TriggeredNepseSmartAlert = NepseSmartAlert & {
  liveValue: number | null;
  message: string;
};

const EMPTY: NepseSmartAlert[] = [];

function migrateLegacy(): NepseSmartAlert[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? `${row.symbol}-price`),
          symbol: String(row.symbol ?? "").toUpperCase(),
          kind: "price" as const,
          direction: row.direction === "below" ? ("below" as const) : ("above" as const),
          target: typeof row.targetNpr === "number" ? row.targetNpr : null,
          createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
        };
      })
      .filter((row) => row.symbol);
  } catch {
    return [];
  }
}

function readAlerts(): NepseSmartAlert[] {
  try {
    const raw = window.localStorage.getItem(ALERTS_KEY);
    if (!raw) {
      const legacy = migrateLegacy();
      if (legacy.length) {
        window.localStorage.setItem(ALERTS_KEY, JSON.stringify(legacy));
      }
      return legacy;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((item): item is NepseSmartAlert => {
        if (!item || typeof item !== "object") return false;
        const row = item as NepseSmartAlert;
        return typeof row.symbol === "string" && typeof row.kind === "string";
      })
      .slice(0, MAX_ALERTS);
  } catch {
    return EMPTY;
  }
}

let cached: NepseSmartAlert[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): NepseSmartAlert[] {
  if (cached == null) cached = readAlerts();
  return cached;
}

function commit(next: NepseSmartAlert[]) {
  cached = next;
  try {
    window.localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * Device-local smart alerts. Numeric kinds evaluate against the live snapshot.
 * Event kinds (dividend / corporate action / financial report) are stored for the
 * calendar/news surfaces to highlight — they never invent trigger payloads.
 */
export function useNepseSmartAlerts(bySymbol?: Record<string, NepseSecurityTick>) {
  const alerts = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === ALERTS_KEY || event.key === LEGACY_KEY) {
          cached = null;
          emit();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    () => EMPTY,
  );

  const addAlert = useCallback(
    (input: {
      symbol: string;
      kind: NepseSmartAlertKind;
      direction?: NepseSmartAlert["direction"];
      target?: number | null;
      note?: string;
    }) => {
      const symbol = input.symbol.replace(/\s+/g, "").toUpperCase();
      if (!symbol) return;
      const direction = input.direction ?? (input.kind === "price" || input.kind === "change_pct" || input.kind === "volume" || input.kind === "rsi" ? "above" : "either");
      const target = input.target ?? null;
      if ((input.kind === "price" || input.kind === "change_pct" || input.kind === "volume" || input.kind === "rsi") && (target == null || !Number.isFinite(target))) {
        return;
      }
      const current = getSnapshot();
      commit(
        [
          ...current.filter((alert) => !(alert.symbol === symbol && alert.kind === input.kind && alert.direction === direction)),
          {
            id: `${symbol}-${input.kind}-${direction}-${Date.now()}`,
            symbol,
            kind: input.kind,
            direction,
            target,
            note: input.note,
            createdAt: new Date().toISOString(),
          },
        ].slice(-MAX_ALERTS),
      );
    },
    [],
  );

  const removeAlert = useCallback((id: string) => {
    commit(getSnapshot().filter((alert) => alert.id !== id));
  }, []);

  const triggered = useMemo<TriggeredNepseSmartAlert[]>(() => {
    if (!bySymbol) return [];
    return alerts.flatMap((alert) => {
      const tick = bySymbol[alert.symbol];
      if (!tick || tick.ltpNpr <= 0) return [];
      if (alert.kind === "price" && alert.target != null) {
        const hit = alert.direction === "above" ? tick.ltpNpr >= alert.target : tick.ltpNpr <= alert.target;
        return hit
          ? [{ ...alert, liveValue: tick.ltpNpr, message: `${alert.symbol} LTP रु ${tick.ltpNpr.toLocaleString("en-IN")} is ${alert.direction} target रु ${alert.target.toLocaleString("en-IN")}` }]
          : [];
      }
      if (alert.kind === "change_pct" && alert.target != null && tick.changePct != null) {
        const hit = alert.direction === "above" ? tick.changePct >= alert.target : tick.changePct <= alert.target;
        return hit
          ? [{ ...alert, liveValue: tick.changePct, message: `${alert.symbol} session change ${tick.changePct.toFixed(2)}% is ${alert.direction} ${alert.target}%` }]
          : [];
      }
      if (alert.kind === "volume" && alert.target != null && tick.volume != null) {
        const hit = alert.direction === "above" ? tick.volume >= alert.target : tick.volume <= alert.target;
        return hit
          ? [{ ...alert, liveValue: tick.volume, message: `${alert.symbol} volume ${tick.volume.toLocaleString("en-IN")} is ${alert.direction} ${alert.target.toLocaleString("en-IN")}` }]
          : [];
      }
      // RSI / MACD / event alerts need enriched feeds — surfaced in UI as armed, not false-triggered.
      return [];
    });
  }, [alerts, bySymbol]);

  // Backward-compatible aliases for existing company/hub composers.
  const addPriceAlert = useCallback(
    (symbol: string, direction: "above" | "below", targetNpr: number) => {
      addAlert({ symbol, kind: "price", direction, target: targetNpr });
    },
    [addAlert],
  );

  return {
    alerts,
    addAlert,
    addPriceAlert,
    removeAlert,
    triggered,
    /** @deprecated use addPriceAlert */
    addAlertLegacy: addPriceAlert,
  };
}

/** Compatibility shim — existing imports keep working for price alerts. */
export function useNepseAlerts(bySymbol?: Record<string, NepseSecurityTick>) {
  const smart = useNepseSmartAlerts(bySymbol);
  const alerts = useMemo(
    () =>
      smart.alerts
        .filter((alert) => alert.kind === "price" && alert.target != null)
        .map((alert) => ({
          id: alert.id,
          symbol: alert.symbol,
          direction: (alert.direction === "below" ? "below" : "above") as "above" | "below",
          targetNpr: alert.target as number,
          createdAt: alert.createdAt,
        })),
    [smart.alerts],
  );
  const triggered = useMemo(
    () =>
      smart.triggered
        .filter((alert) => alert.kind === "price")
        .map((alert) => ({
          id: alert.id,
          symbol: alert.symbol,
          direction: (alert.direction === "below" ? "below" : "above") as "above" | "below",
          targetNpr: alert.target as number,
          createdAt: alert.createdAt,
          ltpNpr: alert.liveValue ?? 0,
        })),
    [smart.triggered],
  );
  return {
    alerts,
    addAlert: smart.addPriceAlert,
    removeAlert: smart.removeAlert,
    triggered,
  };
}
