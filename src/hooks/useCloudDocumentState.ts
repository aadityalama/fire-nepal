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
 * - Shell paints immediately with defaults; cloud data replaces state asynchronously.
 * - localStorage is optional cache written only after successful cloud sync.
 * Guests: localStorage (or defaults) when helpers are provided.
 *
 * Callback identities (loadLocal/saveLocal/clearLocal) are read via refs so unstable
 * inline lambdas from callers cannot re-trigger hydrate in a render loop.
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
  /** True once the UI shell may paint (defaults / guest local). Does not wait on cloud. */
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(!authed);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [hydrateAttempt, setHydrateAttempt] = useState(0);
  const stateRef = useRef(state);
  const lastSavedRef = useRef<string>("");
  const shellReadyRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const hydrateInFlightRef = useRef<string | null>(null);
  const getDefaultRef = useRef(getDefault);
  const sanitizeRef = useRef(sanitize);
  const loadLocalRef = useRef(loadLocal);
  const saveLocalRef = useRef(saveLocal);
  const clearLocalRef = useRef(clearLocal);
  getDefaultRef.current = getDefault;
  sanitizeRef.current = sanitize;
  loadLocalRef.current = loadLocal;
  saveLocalRef.current = saveLocal;
  clearLocalRef.current = clearLocal;

  const retryHydrate = useCallback(() => {
    setHydrateAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const requestKey = `${moduleKey}:${userId ?? "guest"}:${hydrateAttempt}`;

    async function hydrate() {
      // Deduplicate identical in-flight hydrates (Strict Mode / rapid remounts).
      if (hydrateInFlightRef.current === requestKey) return;
      hydrateInFlightRef.current = requestKey;

      const identity = userId ?? "guest";
      if (identityRef.current !== identity) {
        // New auth identity: seed a fresh shell. Retries keep the existing shell.
        shellReadyRef.current = false;
        identityRef.current = identity;
      }

      if (!userId || !isSupabaseConfigured()) {
        const local = loadLocalRef.current
          ? sanitizeRef.current(loadLocalRef.current())
          : getDefaultRef.current();
        if (!cancelled) {
          setState(local);
          lastSavedRef.current = JSON.stringify(local);
          setHydrateError(null);
          setCloudReady(true);
          shellReadyRef.current = true;
          setHydrated(true);
        }
        if (hydrateInFlightRef.current === requestKey) hydrateInFlightRef.current = null;
        return;
      }

      // Authenticated: paint empty shell immediately — never wait on the network.
      clearLocalRef.current?.();
      const empty = getDefaultRef.current();
      if (!cancelled) {
        if (!shellReadyRef.current) {
          setState(empty);
          lastSavedRef.current = JSON.stringify(empty);
        }
        setHydrateError(null);
        setCloudReady(false);
        shellReadyRef.current = true;
        setHydrated(true);
      }

      try {
        const remote = await fetchModuleSnapshot<unknown>(moduleKey);
        if (cancelled) return;
        const next = remote == null ? getDefaultRef.current() : sanitizeRef.current(remote);
        setState(next);
        lastSavedRef.current = JSON.stringify(next);
        // Optional cache AFTER successful cloud load.
        saveLocalRef.current?.(next);
        setHydrateError(null);
        setCloudReady(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Could not load ${moduleKey} from cloud.`;
        if (process.env.NODE_ENV !== "production") {
          console.error(`[cloud-document:${moduleKey}] hydrate failed`, error);
        }
        if (!cancelled) {
          // Keep shell defaults for a usable UI — surface failure + retry instead of infinite loading.
          if (!shellReadyRef.current) {
            const emptyOnFail = getDefaultRef.current();
            setState(emptyOnFail);
            lastSavedRef.current = JSON.stringify(emptyOnFail);
          }
          clearLocalRef.current?.();
          setHydrateError(message);
          setCloudReady(true);
          shellReadyRef.current = true;
          setHydrated(true);
        }
      } finally {
        if (hydrateInFlightRef.current === requestKey) hydrateInFlightRef.current = null;
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
      // Allow a remount (React Strict Mode) or retry to start a fresh hydrate.
      if (hydrateInFlightRef.current === requestKey) {
        hydrateInFlightRef.current = null;
      }
    };
  }, [authLoading, userId, moduleKey, hydrateAttempt]);

  const persistNow = useCallback(
    async (next?: T) => {
      const snapshot = sanitizeRef.current(next ?? stateRef.current);
      setState(snapshot);
      stateRef.current = snapshot;

      if (!userId || !isSupabaseConfigured()) {
        saveLocalRef.current?.(snapshot);
        lastSavedRef.current = JSON.stringify(snapshot);
        return snapshot;
      }

      await saveModuleSnapshotToCloud(moduleKey, snapshot);
      const remote = await fetchModuleSnapshot<unknown>(moduleKey);
      const confirmed = remote == null ? snapshot : sanitizeRef.current(remote);
      setState(confirmed);
      stateRef.current = confirmed;
      lastSavedRef.current = JSON.stringify(confirmed);
      saveLocalRef.current?.(confirmed);
      return confirmed;
    },
    [moduleKey, userId],
  );

  useEffect(() => {
    if (!hydrated || !cloudReady) return;

    if (!userId || !isSupabaseConfigured()) {
      saveLocalRef.current?.(state);
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
          saveLocalRef.current?.(toSave);
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
  }, [state, hydrated, cloudReady, userId, moduleKey, saveDebounceMs]);

  return { state, setState, hydrated, cloudReady, hydrateError, retryHydrate, persistNow };
}
