import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import { currentMonthKey, expenseMonthKey } from "@/lib/expense-utils";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";
import {
  migrateExpenseToMemberIds,
  migrateLegacyMembersToIds,
} from "@/lib/expense-members";

export const STORAGE_KEY = "fire-nepal-expense-dashboard-v2";

export type TimelineActivityType =
  | "expense_added"
  | "expense_edited"
  | "expense_deleted"
  | "settlement"
  | "member_added";

export type TimelineActivity = {
  id: string;
  type: TimelineActivityType;
  timestamp: string;
  monthKey: string;
  memberId?: string;
  title?: string;
  amount?: number;
  category?: string;
  message: string;
};

export type DashboardPersistedState = {
  version: 3;
  expenses: Expense[];
  /** Stable member ids; display names live in profiles */
  members: string[];
  profiles: Record<string, RoommateProfile>;
  activities: TimelineActivity[];
  exchangeRate?: ExchangeRateSnapshot;
  /** monthKey → `${from}|${to}` → amount NPR */
  settlementTransferOverrides?: Record<string, Record<string, number>>;
};

export const LEGACY_KEY = "fire-nepal-expense-dashboard-v1";

export function emptyExpenseDashboardState(): DashboardPersistedState {
  return {
    version: 3,
    expenses: [],
    members: [],
    profiles: {},
    activities: [],
  };
}

export function createActivity(
  input: Omit<TimelineActivity, "id" | "timestamp">,
): TimelineActivity {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
}

function migrateLegacyState(raw: string): DashboardPersistedState | null {
  try {
    const parsed = JSON.parse(raw) as {
      version: number;
      expenses: Expense[];
      members: string[];
      profiles: Record<string, RoommateProfile>;
      activities: TimelineActivity[];
    };
    if (!Array.isArray(parsed.expenses)) return null;
    return migrateNameBasedStateToV3(parsed);
  } catch {
    return null;
  }
}

type NameBasedPersistedState = {
  version: number;
  expenses: Array<Expense & { payer?: string }>;
  members: string[];
  profiles: Record<string, RoommateProfile>;
  activities: Array<TimelineActivity & { member?: string }>;
  exchangeRate?: ExchangeRateSnapshot;
  settlementTransferOverrides?: Record<string, Record<string, number>>;
};

function migrateNameBasedStateToV3(state: NameBasedPersistedState): DashboardPersistedState {
  const { memberIds, profiles, nameToId } = migrateLegacyMembersToIds(state.members, state.profiles);
  const expenses = state.expenses.map((expense) => migrateExpenseToMemberIds(expense, nameToId, memberIds));
  const activities = (state.activities ?? []).map((activity) => {
    const legacyMember = activity.member;
    const memberId =
      activity.memberId ??
      (legacyMember ? nameToId.get(legacyMember) ?? legacyMember : undefined);
    const { member: _member, ...rest } = activity;
    return { ...rest, memberId };
  });

  return {
    version: 3,
    expenses,
    members: memberIds,
    profiles,
    activities,
    exchangeRate: state.exchangeRate,
    settlementTransferOverrides: state.settlementTransferOverrides,
  };
}

export function loadDashboardState(): DashboardPersistedState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NameBasedPersistedState;
      if (parsed.version === 3 && Array.isArray(parsed.expenses)) return parsed as DashboardPersistedState;
      if ((parsed.version === 2 || parsed.version === 3) && Array.isArray(parsed.expenses)) {
        const migrated = migrateNameBasedStateToV3(parsed);
        saveDashboardState(migrated);
        return migrated;
      }
    }

    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacyState(legacy);
      if (migrated) {
        saveDashboardState(migrated);
        return migrated;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function saveDashboardState(state: DashboardPersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn("FIRE Nepal: storage quota reached. Consider removing old receipts.");
  }
}

export function listMonthKeys(expenses: Expense[]): string[] {
  const keys = new Set<string>([currentMonthKey()]);
  expenses.forEach((expense) => keys.add(expenseMonthKey(expense.date)));
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatMonthShort(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function filterExpensesByMonth(expenses: Expense[], monthKey: string) {
  return expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
}
