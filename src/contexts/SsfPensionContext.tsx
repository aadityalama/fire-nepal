"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadSsfPensionWorkspace,
  saveSsfPensionWorkspace,
  type SsfPensionWorkspaceState,
  type SsfReminderPrefs,
} from "@/lib/ssf-pension/storage";
import { FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT } from "@/lib/fire-nepal/workspace-data-reset";

type SsfPensionContextValue = {
  workspace: SsfPensionWorkspaceState;
  setReminderPrefs: (patch: Partial<SsfReminderPrefs>) => void;
  setProjection: (patch: Partial<SsfPensionWorkspaceState["projection"]>) => void;
  setRetireNepal: (patch: Partial<SsfPensionWorkspaceState["retireNepal"]>) => void;
};

const SsfPensionContext = createContext<SsfPensionContextValue | null>(null);

export function SsfPensionProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<SsfPensionWorkspaceState>(() => loadSsfPensionWorkspace());

  useEffect(() => {
    setWorkspace(loadSsfPensionWorkspace());
  }, []);

  useEffect(() => {
    saveSsfPensionWorkspace(workspace);
  }, [workspace]);

  useEffect(() => {
    const onGlobal = () => setWorkspace(loadSsfPensionWorkspace());
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
    return () => window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
  }, []);

  const setReminderPrefs = useCallback((patch: Partial<SsfReminderPrefs>) => {
    setWorkspace((w) => ({ ...w, reminderPrefs: { ...w.reminderPrefs, ...patch } }));
  }, []);

  const setProjection = useCallback((patch: Partial<SsfPensionWorkspaceState["projection"]>) => {
    setWorkspace((w) => ({ ...w, projection: { ...w.projection, ...patch } }));
  }, []);

  const setRetireNepal = useCallback((patch: Partial<SsfPensionWorkspaceState["retireNepal"]>) => {
    setWorkspace((w) => ({ ...w, retireNepal: { ...w.retireNepal, ...patch } }));
  }, []);

  const value = useMemo(
    () => ({ workspace, setReminderPrefs, setProjection, setRetireNepal }),
    [workspace, setReminderPrefs, setProjection, setRetireNepal],
  );

  return <SsfPensionContext.Provider value={value}>{children}</SsfPensionContext.Provider>;
}

export function useSsfPension() {
  const v = useContext(SsfPensionContext);
  if (!v) throw new Error("useSsfPension must be used within SsfPensionProvider");
  return v;
}
