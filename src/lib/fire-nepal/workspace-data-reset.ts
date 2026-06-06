/**
 * Client-side workspace data reset helpers (portfolio modules + global FIRE Nepal workspace).
 * Does not touch authentication, premium profile, membership, theme/language, or sync-related
 * preferences (e.g. smart reminder email / window settings, SSF reminder toggles).
 */

import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { defaultCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";
import type { PortfolioLedgerBucket, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { defaultWealthState, STORAGE_KEY_V2 } from "@/components/portfolio/storage";
import {
  defaultPayslipHistoryState,
  savePayslipHistoryState,
} from "@/components/payslip-import/payslip-history-storage";
import { FIN_INTEL_ROLLUPS_KEY } from "@/components/financial-intelligence/monthly-rollup-storage";
import {
  emptyExpenseDashboardState,
  LEGACY_KEY,
  saveDashboardState,
} from "@/lib/expense-storage";
import { defaultPensionDashboardState, loadPensionState, savePensionState } from "@/lib/pension-storage";
import { createDefaultSmartRemindersStore } from "@/lib/smart-reminders/default-state";
import { sanitizeSmartRemindersStore } from "@/lib/smart-reminders/sanitize";
import { DEFAULT_RETURN_PLANNER_STATE, RETURN_PLANNER_STORAGE_KEY } from "@/lib/return-to-nepal/default-planner-state";
import {
  DEFAULT_SSF_PENSION_WORKSPACE_STATE,
  loadSsfPensionWorkspace,
  saveSsfPensionWorkspace,
} from "@/lib/ssf-pension/storage";

/** Same-tab portfolio reload (WealthPortfolioProvider listens). */
export const FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT = "fire-nepal-portfolio-storage-sync";

/** Cross-cutting workspace reset for providers that hydrate from localStorage. */
export const FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT = "fire-nepal-global-workspace-reset";

const STORAGE_KEY_V1_PORTFOLIO = "fire-nepal-portfolio-v1";

const SMART_REMINDERS_STORAGE_KEY = "fire_nepal_smart_reminders_v1";

export type PortfolioWorkspaceModule = "banking_cash" | "metals" | "vehicles" | "real_estate" | "pension";

function ledgerBucketForModule(module: PortfolioWorkspaceModule): PortfolioLedgerBucket {
  switch (module) {
    case "banking_cash":
      return "liquid_cash";
    case "metals":
      return "metal";
    case "vehicles":
      return "vehicle";
    case "real_estate":
      return "real_estate";
    case "pension":
      return "retirement";
    default: {
      const _x: never = module;
      return _x;
    }
  }
}

/** Clears one portfolio asset module and matching ledger rows. */
export function resetPortfolioModuleState(
  state: WealthPortfolioStateV2,
  module: PortfolioWorkspaceModule,
): WealthPortfolioStateV2 {
  const bucket = ledgerBucketForModule(module);
  const ledger = state.ledger.filter((e) => e.bucket !== bucket);
  switch (module) {
    case "banking_cash":
      return { ...state, liquidCash: [], fixedDeposits: [], ledger };
    case "metals":
      return { ...state, metals: [], ledger };
    case "vehicles":
      return { ...state, vehicles: [], ledger };
    case "real_estate":
      return { ...state, realEstate: [], ledger };
    case "pension":
      return { ...state, globalRetirementAssets: [], ledger };
    default: {
      const _m: never = module;
      return _m;
    }
  }
}

/**
 * Clears locally persisted FIRE Nepal workspace data (and notifies mounted listeners).
 * Does not clear auth, premium profile, membership, theme, language, or product onboarding.
 */
export function performGlobalFireNepalWorkspaceDataReset(): void {
  if (typeof window === "undefined") return;

  const portfolio = defaultWealthState();
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(portfolio));
  } catch {
    /* quota */
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY_V1_PORTFOLIO);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT));

  saveCashflowState(defaultCashflowState());
  window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));

  saveDashboardState(emptyExpenseDashboardState());
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }

  {
    const prevPension = loadPensionState();
    savePensionState({
      ...defaultPensionDashboardState(),
      profile: { ...prevPension.profile },
      slips: [],
    });
  }

  savePayslipHistoryState(defaultPayslipHistoryState());

  {
    const prevSsf = loadSsfPensionWorkspace();
    saveSsfPensionWorkspace({
      ...DEFAULT_SSF_PENSION_WORKSPACE_STATE,
      reminderPrefs: { ...prevSsf.reminderPrefs },
    });
  }

  try {
    window.localStorage.removeItem(FIN_INTEL_ROLLUPS_KEY);
  } catch {
    /* ignore */
  }

  try {
    window.localStorage.setItem(RETURN_PLANNER_STORAGE_KEY, JSON.stringify(DEFAULT_RETURN_PLANNER_STATE));
  } catch {
    /* quota */
  }

  try {
    let preservedReminderSettings = createDefaultSmartRemindersStore().settings;
    const rawSr = window.localStorage.getItem(SMART_REMINDERS_STORAGE_KEY);
    if (rawSr) {
      try {
        preservedReminderSettings = sanitizeSmartRemindersStore(JSON.parse(rawSr) as unknown).settings;
      } catch {
        /* keep default settings */
      }
    }
    const nextSr = { ...createDefaultSmartRemindersStore(), settings: preservedReminderSettings };
    window.localStorage.setItem(SMART_REMINDERS_STORAGE_KEY, JSON.stringify(nextSr));
  } catch {
    /* quota */
  }

  window.dispatchEvent(new Event(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT));
}
