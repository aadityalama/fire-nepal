"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  clearSsfPensionLocalCache,
  DEFAULT_SSF_PENSION_WORKSPACE_STATE,
  loadSsfPensionWorkspace,
  saveSsfPensionWorkspace,
  sanitizeSsfPensionWorkspace,
  type SsfPensionWorkspaceState,
  type SsfReminderPrefs,
} from "@/lib/ssf-pension/storage";
import { FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT } from "@/lib/fire-nepal/workspace-data-reset";
import { useCloudDocumentState } from "@/hooks/useCloudDocumentState";

type SsfPensionContextValue = {
  workspace: SsfPensionWorkspaceState;
  setReminderPrefs: (patch: Partial<SsfReminderPrefs>) => void;
  setProjection: (patch: Partial<SsfPensionWorkspaceState["projection"]>) => void;
  setRetireNepal: (patch: Partial<SsfPensionWorkspaceState["retireNepal"]>) => void;
};

const SsfPensionContext = createContext<SsfPensionContextValue | null>(null);

export function SsfPensionProvider({ children }: { children: ReactNode }) {
  const { state: workspace, setState: setWorkspace, persistNow } = useCloudDocumentState({
    moduleKey: "ssf_pension",
    getDefault: () => DEFAULT_SSF_PENSION_WORKSPACE_STATE,
    sanitize: sanitizeSsfPensionWorkspace,
    loadLocal: loadSsfPensionWorkspace,
    saveLocal: saveSsfPensionWorkspace,
    clearLocal: clearSsfPensionLocalCache,
  });

  useEffect(() => {
    const onGlobal = () => {
      void persistNow(DEFAULT_SSF_PENSION_WORKSPACE_STATE);
    };
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
    return () => window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobal);
  }, [persistNow]);

  const setReminderPrefs = useCallback(
    (patch: Partial<SsfReminderPrefs>) => {
      setWorkspace((w) => ({ ...w, reminderPrefs: { ...w.reminderPrefs, ...patch } }));
    },
    [setWorkspace],
  );

  const setProjection = useCallback(
    (patch: Partial<SsfPensionWorkspaceState["projection"]>) => {
      setWorkspace((w) => ({ ...w, projection: { ...w.projection, ...patch } }));
    },
    [setWorkspace],
  );

  const setRetireNepal = useCallback(
    (patch: Partial<SsfPensionWorkspaceState["retireNepal"]>) => {
      setWorkspace((w) => ({ ...w, retireNepal: { ...w.retireNepal, ...patch } }));
    },
    [setWorkspace],
  );

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
