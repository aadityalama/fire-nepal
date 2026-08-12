"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchModuleSnapshot, saveModuleSnapshotToCloud } from "@/lib/module-snapshots/api";
import type { ModuleSnapshotKey } from "@/lib/module-snapshots/keys";

export type UseCloudDocumentStateOptions<T> = {
  moduleKey: ModuleSnapshotKey;
  getDefault: () => T;
  sanitize: (raw: unknown) => T;
  /** Guest-only localStorage read. Never used for authenticated users. */
  loadLocal?: () => T;
  /** Guest-only localStorage write. Authenticated: only called after successful cloud sync. */
  saveLocal?: (state: T) => void;
  /** Optional: clear stale local cache when authenticated hydrate starts. */
  clearLocal?: () => void;
  /** Debounce cloud PUTs (ms). Default 700. */
  saveDebounceMs?: number;
};

/**
 * Authenticated: Supabase is the only source of truth.
 * - Never hydrate from localStorage when signed in.
 * - Every load reads Supabase; every save persists to Supabase.
 * - localStorage is optional cache written only after successful cloud sync.
 * Guests: localStorage (or defaults) when helpers are provided.
 */
export function useCloudDocumentState<T>({
  moduleKey,
  getDefault,
  sanitize,
  loadLocal,
  saveLocal,
  clearLocal,
  saveDebounceMs = 700,
}: UseCloudDocumentStateOptions<T>): {
  state: T;
  setState: Dispatch<SetStateAction<T>>;
  hydrated: boolean;
  cloudReady: boolean;
  hydrateError: string | null;
  retryHydrate: () => void;
  persistNow: (next?: T) => Promise<T>;
} {
  const { user, loading: authLoading } = useProductAuth();
  const userId = user?.id;
  const authed = Boolean(userId && isSupabaseConfigured());

  const [state, setState] = useState<T>(() => getDefault());
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(!authed);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [hydrateAttempt, setHydrateAttempt] = useState(0);
  const stateRef = useRef(state);
  const lastSavedRef = useRef<string>("");
  const getDefaultRef = useRef(getDefault);
  const sanitizeRef = useRef(sanitize);
  getDefaultRef.current = getDefault;
  sanitizeRef.current = sanitize;

  const retryHydrate = useCallback(() => {
    setHydrateAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function hydrate() {
      setHydrated(false);
      setCloudReady(false);

      if (!userId || !isSupabaseConfigured()) {
        const local = loadLocal ? sanitizeRef.current(loadLocal()) : getDefaultRef.current();
        if (!cancelled) {
          setState(local);
          lastSavedRef.current = JSON.stringify(local);
          setHydrateError(null);
          setCloudReady(true);
          setHydrated(true);
        }
        return;
      }

      // Authenticated: empty shell until Supabase responds — never paint browser-local data.
      clearLocal?.();
      const empty = getDefaultRef.current();
      if (!cancelled) {
        setState(empty);
        setHydrateError(null);
      }

      try {
        const remote = await fetchModuleSnapshot<unknown>(moduleKey);
        if (cancelled) return;
        const next = remote == null ? getDefaultRef.current() : sanitizeRef.current(remote);
        setState(next);
        lastSavedRef.current = JSON.stringify(next);
        // Optional cache AFTER successful cloud load.
        saveLocal?.(next);
        setHydrateError(null);
        setCloudReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Could not load ${moduleKey} from cloud.`;
        if (process.env.NODE_ENV !== "production") {
          console.error(`[cloud-document:${moduleKey}] hydrate failed`, error);
        }
        if (!cancelled) {
          // Keep defaults for a new user, but surface the failure — do not pretend load succeeded.
          const emptyOnFail = getDefaultRef.current();
          setState(emptyOnFail);
          lastSavedRef.current = JSON.stringify(emptyOnFail);
          clearLocal?.();
          setHydrateError(message);
          setCloudReady(true);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, moduleKey, loadLocal, saveLocal, clearLocal, hydrateAttempt]);

  const persistNow = useCallback(
    async (next?: T) => {
      const snapshot = sanitizeRef.current(next ?? stateRef.current);
      setState(snapshot);
      stateRef.current = snapshot;

      if (!userId || !isSupabaseConfigured()) {
        saveLocal?.(snapshot);
        lastSavedRef.current = JSON.stringify(snapshot);
        return snapshot;
      }

      await saveModuleSnapshotToCloud(moduleKey, snapshot);
      const remote = await fetchModuleSnapshot<unknown>(moduleKey);
      const confirmed = remote == null ? snapshot : sanitizeRef.current(remote);
      setState(confirmed);
      stateRef.current = confirmed;
      lastSavedRef.current = JSON.stringify(confirmed);
      saveLocal?.(confirmed);
      return confirmed;
    },
    [moduleKey, userId, saveLocal],
  );

  useEffect(() => {
    if (!hydrated || !cloudReady) return;

    if (!userId || !isSupabaseConfigured()) {
      saveLocal?.(state);
      return;
    }

    const serialized = JSON.stringify(state);
    if (serialized === lastSavedRef.current) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const toSave = stateRef.current;
          const snap = JSON.stringify(toSave);
          if (snap === lastSavedRef.current) return;
          await saveModuleSnapshotToCloud(moduleKey, toSave);
          if (controller.signal.aborted) return;
          if (JSON.stringify(stateRef.current) !== snap) return;
          lastSavedRef.current = snap;
          // Cache only after successful cloud sync.
          saveLocal?.(toSave);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error(`[cloud-document:${moduleKey}] background save failed`, error);
          }
        }
      })();
    }, saveDebounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [state, hydrated, cloudReady, userId, moduleKey, saveLocal, saveDebounceMs]);

  return { state, setState, hydrated, cloudReady, hydrateError, retryHydrate, persistNow };
}
