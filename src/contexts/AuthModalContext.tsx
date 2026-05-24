"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AuthModalTab = "login" | "signup";

type AuthModalContextValue = {
  isOpen: boolean;
  tab: AuthModalTab;
  open: (tab?: AuthModalTab) => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthModalTab>("login");

  const open = useCallback((next?: AuthModalTab) => {
    setTab(next ?? "login");
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ isOpen, tab, open, close }), [isOpen, tab, open, close]);

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
