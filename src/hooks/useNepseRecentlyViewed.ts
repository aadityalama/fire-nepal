"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "fire-nepal-nepse-recent-v1";
const MAX = 24;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

/** Device-local recently viewed NEPSE symbols. */
export function useNepseRecentlyViewed() {
  const symbols = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => {
      if (cache == null) cache = read();
      return cache;
    },
    () => [],
  );

  const track = useCallback((symbol: string) => {
    const clean = symbol.replace(/\s+/g, "").toUpperCase();
    if (!clean) return;
    const current = cache ?? read();
    commit([clean, ...current.filter((item) => item !== clean)].slice(0, MAX));
  }, []);

  return useMemo(() => ({ symbols, track }), [symbols, track]);
}
