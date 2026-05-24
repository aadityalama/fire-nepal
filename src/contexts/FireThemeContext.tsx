"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FireThemeMode = "dark" | "light" | "system";
export type FireResolvedTheme = "dark" | "light";

const STORAGE_KEY = "fire-nepal-theme-v1";

function readStoredMode(): FireThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "dark";
}

type FireThemeContextValue = {
  mode: FireThemeMode;
  resolvedTheme: FireResolvedTheme;
  setMode: (m: FireThemeMode) => void;
};

const FireThemeContext = createContext<FireThemeContextValue | null>(null);

export function FireThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FireThemeMode>("dark");
  const [mounted, setMounted] = useState(false);
  const [systemDark, setSystemDark] = useState(true);

  useLayoutEffect(() => {
    setModeState(readStoredMode());
    if (typeof window !== "undefined") {
      setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    setMounted(true);
  }, []);

  const resolvedTheme = useMemo((): FireResolvedTheme => {
    if (mode === "system") return systemDark ? "dark" : "light";
    return mode;
  }, [mode, systemDark]);

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    document.documentElement.setAttribute("data-fire-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [mounted, resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setMode = useCallback((m: FireThemeMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* quota */
    }
  }, []);

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme, setMode]);

  return <FireThemeContext.Provider value={value}>{children}</FireThemeContext.Provider>;
}

export function useFireTheme(): FireThemeContextValue {
  const ctx = useContext(FireThemeContext);
  if (!ctx) {
    throw new Error("useFireTheme must be used within FireThemeProvider");
  }
  return ctx;
}
