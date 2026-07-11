import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";
import type { Currency } from "@/lib/expense-utils";
import {
  migrateExpenseToMemberIds,
  migrateLegacyMembersToIds,
} from "@/lib/expense-members";
import { EXPENSE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import type { TimelineActivity } from "@/lib/expense-storage";
import { STORAGE_KEY as LEGACY_SHARED_KEY } from "@/lib/expense-storage";

export const PERSONAL_EXPENSES_STORAGE_KEY = "fire-nepal-personal-expenses-v1";

export type PersonalExpensePersistedState = {
  version: 1;
  expenses: Expense[];
  members: string[];
  profiles: Record<string, RoommateProfile>;
  activities: TimelineActivity[];
  exchangeRate?: ExchangeRateSnapshot;
  displayCurrency?: Currency;
};

export function emptyPersonalExpenseState(): PersonalExpensePersistedState {
  return {
    version: 1,
    expenses: [],
    members: [],
    profiles: {},
    activities: [],
  };
}

function migrateLegacySharedState(): PersonalExpensePersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_SHARED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version: number;
      expenses: Array<Expense & { payer?: string }>;
      members: string[];
      profiles: Record<string, RoommateProfile>;
      activities: TimelineActivity[];
      exchangeRate?: ExchangeRateSnapshot;
      displayCurrency?: Currency;
    };
    if (!Array.isArray(parsed.expenses)) return null;

    const { memberIds, profiles, nameToId } = migrateLegacyMembersToIds(parsed.members, parsed.profiles);
    const expenses = parsed.expenses.map((expense) => migrateExpenseToMemberIds(expense, nameToId, memberIds));

    return {
      version: 1,
      expenses,
      members: memberIds,
      profiles,
      activities: parsed.activities ?? [],
      exchangeRate: parsed.exchangeRate,
      displayCurrency: parsed.displayCurrency,
    };
  } catch {
    return null;
  }
}

export function loadPersonalExpenseState(): PersonalExpensePersistedState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PERSONAL_EXPENSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersonalExpensePersistedState;
      if (parsed.version === 1 && Array.isArray(parsed.expenses)) return parsed;
    }

    const migrated = migrateLegacySharedState();
    if (migrated) {
      savePersonalExpenseState(migrated);
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function savePersonalExpenseState(state: PersonalExpensePersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERSONAL_EXPENSES_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(EXPENSE_MODULE_SYNC_EVENT));
  } catch {
    console.warn("FIRE Nepal: personal expense storage quota reached.");
  }
}
