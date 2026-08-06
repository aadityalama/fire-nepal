import type { SavingsGoal, SavingsReminderTiming, SavingsTransaction, SavingsWorkspaceState } from "@/lib/savings/savings-types";
import { SAVINGS_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { DEFAULT_REMINDER_TIMINGS, defaultTargetDate } from "@/lib/savings/savings-utils";

export const SAVINGS_WORKSPACE_STORAGE_KEY = "fire-nepal-savings-workspace-v1";

const DEFAULT_STATE: SavingsWorkspaceState = {
  version: 1,
  goals: [],
  transactions: [],
  balanceHidden: false,
};

const REMINDER_SET = new Set<string>(DEFAULT_REMINDER_TIMINGS);

function sortGoals(goals: SavingsGoal[]) {
  return [...goals].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.name.localeCompare(b.name);
  });
}

function asNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asIsoDate(value: unknown, fallback: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return fallback;
  return value.slice(0, 10);
}

function asIsoTimestamp(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function sanitizeReminderTimings(value: unknown): SavingsReminderTiming[] {
  if (!Array.isArray(value)) return [...DEFAULT_REMINDER_TIMINGS];
  const next = value.filter((item): item is SavingsReminderTiming => typeof item === "string" && REMINDER_SET.has(item));
  return next.length > 0 ? next : [...DEFAULT_REMINDER_TIMINGS];
}

function sanitizeGoal(input: unknown, index: number): SavingsGoal | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SavingsGoal>;
  const now = new Date().toISOString();
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `goal-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `Goal ${index + 1}`;
  const status: SavingsGoal["status"] =
    raw.status === "paused" || raw.status === "completed" || raw.status === "active" ? raw.status : "active";

  return {
    id,
    templateId: typeof raw.templateId === "string" && raw.templateId.trim() ? raw.templateId.trim() : "custom",
    name,
    icon: typeof raw.icon === "string" && raw.icon.trim() ? raw.icon.trim() : "🎯",
    category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : "Custom",
    targetAmountNpr: Math.max(0, asNumber(raw.targetAmountNpr)),
    savedAmountNpr: Math.max(0, asNumber(raw.savedAmountNpr)),
    monthlyContributionNpr: Math.max(0, asNumber(raw.monthlyContributionNpr)),
    targetDate: asIsoDate(raw.targetDate, defaultTargetDate(12)),
    reminderEnabled: raw.reminderEnabled !== false,
    reminderTimings: sanitizeReminderTimings(raw.reminderTimings),
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    status,
    aiRecommendation: typeof raw.aiRecommendation === "string" ? raw.aiRecommendation : undefined,
    sortOrder: asNumber(raw.sortOrder, index),
    createdAt: asIsoTimestamp(raw.createdAt, now),
    updatedAt: asIsoTimestamp(raw.updatedAt, now),
  };
}

function sanitizeTransaction(input: unknown, index: number): SavingsTransaction | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SavingsTransaction>;
  const now = new Date().toISOString();
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `txn-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const goalId = typeof raw.goalId === "string" ? raw.goalId : "";
  const goalName = typeof raw.goalName === "string" ? raw.goalName : "Goal";
  if (!goalId) return null;
  return {
    id,
    goalId,
    goalName,
    amountNpr: asNumber(raw.amountNpr),
    date: asIsoDate(raw.date, now.slice(0, 10)),
    source: typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : "Manual",
    createdAt: asIsoTimestamp(raw.createdAt, now),
  };
}

export function loadSavingsWorkspaceState(): SavingsWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(SAVINGS_WORKSPACE_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return sanitizeSavingsWorkspaceState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export function sanitizeSavingsWorkspaceState(input: unknown): SavingsWorkspaceState {
  if (!input || typeof input !== "object") return DEFAULT_STATE;
  const parsed = input as Partial<SavingsWorkspaceState>;
  if (parsed.version !== 1 || !Array.isArray(parsed.goals)) return DEFAULT_STATE;
  const goals = sortGoals(
    parsed.goals.map((goal, index) => sanitizeGoal(goal, index)).filter((goal): goal is SavingsGoal => Boolean(goal)),
  );
  const transactions = Array.isArray(parsed.transactions)
    ? parsed.transactions
        .map((txn, index) => sanitizeTransaction(txn, index))
        .filter((txn): txn is SavingsTransaction => Boolean(txn))
    : [];
  return {
    version: 1,
    goals,
    transactions,
    balanceHidden: Boolean(parsed.balanceHidden),
  };
}

export function saveSavingsWorkspaceState(state: SavingsWorkspaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SAVINGS_WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      ...state,
      goals: sortGoals(state.goals),
    }),
  );
  window.dispatchEvent(new Event(SAVINGS_MODULE_SYNC_EVENT));
}

/** Clears browser-local savings cache. Authenticated users must not treat this as source of truth. */
export function clearSavingsWorkspaceLocalCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVINGS_WORKSPACE_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(SAVINGS_MODULE_SYNC_EVENT));
}

export function createGoalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createTransactionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendSavingsTransaction(
  state: SavingsWorkspaceState,
  transaction: Omit<SavingsTransaction, "id" | "createdAt">,
): SavingsWorkspaceState {
  const entry: SavingsTransaction = {
    ...transaction,
    id: createTransactionId(),
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    transactions: [entry, ...state.transactions].slice(0, 100),
  };
}
