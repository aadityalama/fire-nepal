import type { SavingsGoal, SavingsTransaction, SavingsWorkspaceState } from "@/lib/savings/savings-types";

export const SAVINGS_WORKSPACE_STORAGE_KEY = "fire-nepal-savings-workspace-v1";

const DEFAULT_STATE: SavingsWorkspaceState = {
  version: 1,
  goals: [],
  transactions: [],
  balanceHidden: false,
};

function sortGoals(goals: SavingsGoal[]) {
  return [...goals].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.name.localeCompare(b.name);
  });
}

export function loadSavingsWorkspaceState(): SavingsWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(SAVINGS_WORKSPACE_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as SavingsWorkspaceState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.goals)) return DEFAULT_STATE;
    return {
      version: 1,
      goals: sortGoals(parsed.goals),
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      balanceHidden: Boolean(parsed.balanceHidden),
    };
  } catch {
    return DEFAULT_STATE;
  }
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
