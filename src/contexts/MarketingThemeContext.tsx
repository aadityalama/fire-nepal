"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "fire-nepal-marketing-scheme-v1";

export type MarketingScheme = "light" | "dark";

type MarketingThemeContextValue = {
  scheme: MarketingScheme;
  setSchemeMode: (m: MarketingScheme) => void;
};

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(null);

function readStored(): MarketingScheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

let storeVersion = 0;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") {
    return () => listeners.delete(onStoreChange);
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): MarketingScheme {
  void storeVersion;
  return readStored();
}

function getServerSnapshot(): MarketingScheme {
  return "light";
}

function notifyStore() {
  storeVersion += 1;
  listeners.forEach((l) => l());
}

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const scheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSchemeMode = useCallback((m: MarketingScheme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* quota */
    }
    notifyStore();
  }, []);

  useEffect(() => {
    if (isHome) {
      document.documentElement.setAttribute("data-marketing-theme", scheme);
    } else {
      document.documentElement.removeAttribute("data-marketing-theme");
    }
  }, [isHome, scheme]);

  const value = useMemo(() => ({ scheme, setSchemeMode }), [scheme, setSchemeMode]);

  return <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>;
}

export function useMarketingTheme(): MarketingThemeContextValue {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    throw new Error("useMarketingTheme must be used within MarketingThemeProvider");
  }
  return ctx;
}
