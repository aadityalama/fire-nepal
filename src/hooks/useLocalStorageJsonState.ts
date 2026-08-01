"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export type UseLocalStorageJsonStateOptions<T> = {
  storageKey: string;
  getDefault: () => T;
  /**
   * Coerce unknown JSON into `T` (validation, defaults, migrations).
   * Should be stable across renders (module-level function recommended).
   */
  sanitize: (raw: unknown) => T;
  /**
   * When false, skip reading localStorage on hydrate (start from `getDefault`).
   * Used for authenticated finance modules where Supabase is the source of truth
   * and localStorage is only an offline cache overwritten after cloud sync.
   */
  hydrateFromStorage?: boolean;
  /**
   * When false, do not write state back to localStorage.
   * Use to avoid wiping the offline cache with empty defaults before cloud hydrate finishes.
   */
  persistEnabled?: boolean;
};

/**
 * Reusable client-side persistence for JSON-serializable state.
 * Hydrates from `localStorage` after mount (unless `hydrateFromStorage` is false);
 * writes back whenever `state` changes post-hydration (unless `persistEnabled` is false).
 */
export function useLocalStorageJsonState<T>({
  storageKey,
  getDefault,
  sanitize,
  hydrateFromStorage = true,
  persistEnabled = true,
}: UseLocalStorageJsonStateOptions<T>): [T, Dispatch<SetStateAction<T>>, hydrated: boolean] {
  const [state, setState] = useState<T>(() => getDefault());
  const [hydrated, setHydrated] = useState(false);
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;
  const getDefaultRef = useRef(getDefault);
  getDefaultRef.current = getDefault;

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    // When `storageKey` changes (e.g. signed-in user switch), avoid persisting the previous
    // document into the new key before we reload from disk.
    setHydrated(false);
    try {
      if (!hydrateFromStorage) {
        setState(getDefaultRef.current());
      } else {
        const raw = window.localStorage.getItem(storageKey);
        if (raw !== null && raw !== "") {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw) as unknown;
          } catch {
            parsed = undefined;
          }
          setState(sanitizeRef.current(parsed));
        } else {
          setState(getDefaultRef.current());
        }
      }
    } catch {
      setState(getDefaultRef.current());
    }
    setHydrated(true);
  }, [storageKey, hydrateFromStorage]);

  useEffect(() => {
    if (!hydrated || !persistEnabled || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [state, hydrated, storageKey, persistEnabled]);

  return [state, setState, hydrated];
}
