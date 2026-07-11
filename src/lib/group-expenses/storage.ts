import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import { currentMonthKey, expenseMonthKey, type Currency } from "@/lib/expense-utils";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";
import {
  migrateExpenseToMemberIds,
  migrateLegacyMembersToIds,
} from "@/lib/expense-members";
import { STORAGE_KEY as LEGACY_SHARED_KEY } from "@/lib/expense-storage";

export const GROUP_EXPENSES_STORAGE_KEY = "fire-nepal-group-expenses-v1";

export type GroupTimelineActivityType =
  | "expense_added"
  | "expense_edited"
  | "expense_deleted"
  | "settlement"
  | "member_added";

export type GroupTimelineActivity = {
  id: string;
  type: GroupTimelineActivityType;
  timestamp: string;
  monthKey: string;
  memberId?: string;
  title?: string;
  amount?: number;
  category?: string;
  message: string;
};

export type GroupExpensePersistedState = {
  version: 1;
  expenses: Expense[];
  members: string[];
  profiles: Record<string, RoommateProfile>;
  activities: GroupTimelineActivity[];
  exchangeRate?: ExchangeRateSnapshot;
  displayCurrency?: Currency;
  settlementTransferOverrides?: Record<string, Record<string, number>>;
  companyName?: string;
  roomNumber?: string;
  companyType?: string;
  description?: string;
  logoUrl?: string;
};

export function emptyGroupExpenseState(): GroupExpensePersistedState {
  return {
    version: 1,
    expenses: [],
    members: [],
    profiles: {},
    activities: [],
  };
}

export function createGroupActivity(
  input: Omit<GroupTimelineActivity, "id" | "timestamp">,
): GroupTimelineActivity {
  return {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
}

function migrateLegacySharedState(): GroupExpensePersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_SHARED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version: number;
      expenses: Array<Expense & { payer?: string }>;
      members: string[];
      profiles: Record<string, RoommateProfile>;
      activities: Array<{ member?: string; memberId?: string } & GroupTimelineActivity>;
      exchangeRate?: ExchangeRateSnapshot;
      displayCurrency?: Currency;
      settlementTransferOverrides?: Record<string, Record<string, number>>;
      companyName?: string;
      roomNumber?: string;
      companyType?: string;
      description?: string;
      logoUrl?: string;
    };
    if (!Array.isArray(parsed.expenses)) return null;

    const { memberIds, profiles, nameToId } = migrateLegacyMembersToIds(parsed.members, parsed.profiles);
    const expenses = parsed.expenses.map((expense) => migrateExpenseToMemberIds(expense, nameToId, memberIds));
    const activities = (parsed.activities ?? []).map((activity) => {
      const legacyMember = activity.member;
      const memberId =
        activity.memberId ?? (legacyMember ? nameToId.get(legacyMember) ?? legacyMember : undefined);
      const { member: _member, ...rest } = activity;
      return { ...rest, memberId };
    });

    return {
      version: 1,
      expenses,
      members: memberIds,
      profiles,
      activities,
      exchangeRate: parsed.exchangeRate,
      displayCurrency: parsed.displayCurrency,
      settlementTransferOverrides: parsed.settlementTransferOverrides,
      companyName: parsed.companyName,
      roomNumber: parsed.roomNumber,
      companyType: parsed.companyType,
      description: parsed.description,
      logoUrl: parsed.logoUrl,
    };
  } catch {
    return null;
  }
}

export function loadGroupExpenseState(): GroupExpensePersistedState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(GROUP_EXPENSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GroupExpensePersistedState;
      if (parsed.version === 1 && Array.isArray(parsed.expenses)) return parsed;
    }

    const migrated = migrateLegacySharedState();
    if (migrated) {
      saveGroupExpenseState(migrated);
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveGroupExpenseState(state: GroupExpensePersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GROUP_EXPENSES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn("FIRE Nepal: group expense storage quota reached.");
  }
}

export function listGroupMonthKeys(expenses: Expense[]): string[] {
  const keys = new Set<string>([currentMonthKey()]);
  expenses.forEach((expense) => keys.add(expenseMonthKey(expense.date)));
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

export function formatGroupMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function filterGroupExpensesByMonth(expenses: Expense[], monthKey: string) {
  return expenses.filter((expense) => expenseMonthKey(expense.date) === monthKey);
}
