/** Client-side SSF pension workspace persistence (wire to Supabase when backend is ready). */

export const SSF_PENSION_STORAGE_KEY = "fn_ssf_pension_workspace_v1";

export type SsfReminderPrefs = {
  emailReminders: boolean;
  pushNotifications: boolean;
  premiumDueDaysBefore: number;
};

export type SsfPensionWorkspaceState = {
  version: 1;
  reminderPrefs: SsfReminderPrefs;
  /** Calculator inputs (NPR, ages) */
  projection: {
    currentAge: number;
    monthlySalaryNpr: number;
    monthlySsfContributionNpr: number;
    retirementAge: number;
    annualSalaryGrowthPct: number;
  };
  /** Nepal retire simulator */
  retireNepal: {
    monthlyFamilySpendNpr: number;
    assumedInflationPct: number;
    otherMonthlyIncomeNpr: number;
  };
};

export const DEFAULT_SSF_PENSION_WORKSPACE_STATE: SsfPensionWorkspaceState = {
  version: 1,
  reminderPrefs: {
    emailReminders: false,
    pushNotifications: false,
    premiumDueDaysBefore: 5,
  },
  projection: {
    currentAge: 0,
    monthlySalaryNpr: 0,
    monthlySsfContributionNpr: 0,
    retirementAge: 60,
    annualSalaryGrowthPct: 0,
  },
  retireNepal: {
    monthlyFamilySpendNpr: 0,
    assumedInflationPct: 0,
    otherMonthlyIncomeNpr: 0,
  },
};

export function sanitizeSsfPensionWorkspace(raw: unknown): SsfPensionWorkspaceState {
  if (!raw || typeof raw !== "object") return DEFAULT_SSF_PENSION_WORKSPACE_STATE;
  const parsed = raw as Partial<SsfPensionWorkspaceState>;
  if (parsed.version !== 1) return DEFAULT_SSF_PENSION_WORKSPACE_STATE;
  return {
    ...DEFAULT_SSF_PENSION_WORKSPACE_STATE,
    ...parsed,
    reminderPrefs: { ...DEFAULT_SSF_PENSION_WORKSPACE_STATE.reminderPrefs, ...parsed.reminderPrefs },
    projection: { ...DEFAULT_SSF_PENSION_WORKSPACE_STATE.projection, ...parsed.projection },
    retireNepal: { ...DEFAULT_SSF_PENSION_WORKSPACE_STATE.retireNepal, ...parsed.retireNepal },
  };
}

export function clearSsfPensionLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SSF_PENSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSsfPensionWorkspace(): SsfPensionWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_SSF_PENSION_WORKSPACE_STATE;
  try {
    const raw = window.localStorage.getItem(SSF_PENSION_STORAGE_KEY);
    if (!raw) return DEFAULT_SSF_PENSION_WORKSPACE_STATE;
    return sanitizeSsfPensionWorkspace(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_SSF_PENSION_WORKSPACE_STATE;
  }
}

export function saveSsfPensionWorkspace(state: SsfPensionWorkspaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SSF_PENSION_STORAGE_KEY, JSON.stringify(state));
}
