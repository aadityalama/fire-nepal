"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  loadNepseWatchlistFromSupabase,
  upsertNepseWatchlistToSupabase,
} from "@/services/market/watchlist-supabase";

const WATCHLIST_KEY = "fire-nepal-nepse-watchlist-v1";

function normalize(sym: string): string {
  return sym.replace(/\s+/g, "").toUpperCase();
}

function readLocalWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((s) => normalize(String(s))).filter(Boolean))].slice(0, 64);
  } catch {
    return [];
  }
}

function writeLocalWatchlist(symbols: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols));
  } catch {
    /* ignore */
  }
}

export type WatchlistSyncState = "idle" | "loading" | "saving" | "error";

export function useWatchlist() {
  const { user, loading: authLoading, authMode } = useProductAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [syncState, setSyncState] = useState<WatchlistSyncState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCloudSync = Boolean(
    isSupabaseConfigured() && authMode === "supabase" && user?.id && !authLoading,
  );

  useEffect(() => {
    const local = readLocalWatchlist();
    setSymbols(local);
  }, []);

  useEffect(() => {
    if (!canCloudSync || !user?.id) return;
    let cancelled = false;
    (async () => {
      setSyncState("loading");
      try {
        const sb = getSupabaseBrowserClient();
        const cloud = await loadNepseWatchlistFromSupabase(sb, user.id);
        if (cancelled) return;
        if (cloud != null) {
          const local = readLocalWatchlist();
          if (cloud.length === 0 && local.length > 0) {
            setSymbols(local);
            writeLocalWatchlist(local);
            await upsertNepseWatchlistToSupabase(sb, user.id, local);
          } else {
            setSymbols(cloud);
            writeLocalWatchlist(cloud);
          }
        }
      } catch {
        if (!cancelled) setSyncState("error");
      } finally {
        if (!cancelled) setSyncState("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canCloudSync, user?.id]);

  const scheduleCloudSave = useCallback(
    (next: string[]) => {
      if (!canCloudSync || !user?.id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSyncState("saving");
      saveTimer.current = setTimeout(() => {
        void (async () => {
          try {
            const sb = getSupabaseBrowserClient();
            const ok = await upsertNepseWatchlistToSupabase(sb, user.id, next);
            setSyncState(ok ? "idle" : "error");
          } catch {
            setSyncState("error");
          }
        })();
      }, 450);
    },
    [canCloudSync, user?.id],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const toggle = useCallback(
    (sym: string) => {
      const u = normalize(sym);
      if (!u) return;
      setSymbols((prev) => {
        const merged = prev.includes(u) ? prev.filter((s) => s !== u) : [...prev, u];
        const cleaned = [...new Set(merged.map(normalize))].filter(Boolean).slice(0, 64);
        writeLocalWatchlist(cleaned);
        scheduleCloudSave(cleaned);
        return cleaned;
      });
    },
    [scheduleCloudSave],
  );

  const clear = useCallback(() => {
    setSymbols([]);
    writeLocalWatchlist([]);
    scheduleCloudSave([]);
  }, [scheduleCloudSave]);

  const isWatched = useCallback((sym: string) => symbols.includes(normalize(sym)), [symbols]);

  return useMemo(
    () => ({
      symbols,
      toggle,
      clear,
      isWatched,
      syncState,
      cloudEnabled: canCloudSync,
    }),
    [symbols, toggle, clear, isWatched, syncState, canCloudSync],
  );
}
