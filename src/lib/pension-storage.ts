import type { PensionDashboardState } from "@/lib/pension-types";
import { PENSION_STORAGE_KEY } from "@/lib/pension-types";

const DEFAULT_STATE: PensionDashboardState = {
  version: 1,
  profile: {
    joinDate: new Date().toISOString().slice(0, 10),
  },
  slips: [],
};

export function loadPensionState(): PensionDashboardState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(PENSION_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as PensionDashboardState;
    if (parsed.version !== 1 || !Array.isArray(parsed.slips)) return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
      slips: parsed.slips,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function savePensionState(state: PensionDashboardState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENSION_STORAGE_KEY, JSON.stringify(state));
}
