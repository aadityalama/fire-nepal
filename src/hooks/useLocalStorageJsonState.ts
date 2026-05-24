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
};

/**
 * Reusable client-side persistence for JSON-serializable state.
 * Hydrates from `localStorage` after mount; writes back whenever `state` changes post-hydration.
 */
export function useLocalStorageJsonState<T>({
  storageKey,
  getDefault,
  sanitize,
}: UseLocalStorageJsonStateOptions<T>): [T, Dispatch<SetStateAction<T>>, hydrated: boolean] {
  const [state, setState] = useState<T>(() => getDefault());
  const [hydrated, setHydrated] = useState(false);
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null && raw !== "") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          parsed = undefined;
        }
        setState(sanitizeRef.current(parsed));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [state, hydrated, storageKey]);

  return [state, setState, hydrated];
}
