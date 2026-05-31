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

const DEFAULT_STATE: SsfPensionWorkspaceState = {
  version: 1,
  reminderPrefs: {
    emailReminders: true,
    pushNotifications: false,
    premiumDueDaysBefore: 5,
  },
  projection: {
    currentAge: 34,
    monthlySalaryNpr: 185_000,
    monthlySsfContributionNpr: 18_500,
    retirementAge: 60,
    annualSalaryGrowthPct: 4.5,
  },
  retireNepal: {
    monthlyFamilySpendNpr: 95_000,
    assumedInflationPct: 6.2,
    otherMonthlyIncomeNpr: 22_000,
  },
};

export function loadSsfPensionWorkspace(): SsfPensionWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(SSF_PENSION_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SsfPensionWorkspaceState>;
    if (parsed.version !== 1) return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      reminderPrefs: { ...DEFAULT_STATE.reminderPrefs, ...parsed.reminderPrefs },
      projection: { ...DEFAULT_STATE.projection, ...parsed.projection },
      retireNepal: { ...DEFAULT_STATE.retireNepal, ...parsed.retireNepal },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveSsfPensionWorkspace(state: SsfPensionWorkspaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SSF_PENSION_STORAGE_KEY, JSON.stringify(state));
}
