/**
 * After login, overwrite browser offline caches from Supabase.
 * localStorage is never a source of truth for authenticated users —
 * it is only a cache of the last successful cloud snapshot.
 */

import {
  defaultCashflowState,
  sanitizeCashflowState,
  saveCashflowState,
} from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { fetchInsurancePolicies } from "@/lib/insurance/insurance-api";
import { replaceInsuranceCacheWithCloud } from "@/lib/insurance/insurance-storage";
import { DEFAULT_FINANCE_CATEGORY_ID } from "@/lib/finance/categories";
import { emptyPersonalExpenseState, savePersonalExpenseState } from "@/lib/personal-expense-storage";
import { fetchSavingsWorkspace } from "@/lib/savings/savings-api";
import { saveSavingsWorkspaceState, sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listPersistedPersonalExpenses } from "@/services/expense-transactions-supabase";
import {
  groupExpenseRowToExpense,
  listGroupExpenses,
} from "@/services/group-expenses-supabase";
import { saveGroupExpenseState, type GroupExpensePersistedState } from "@/lib/group-expenses/storage";

export const FINANCE_CLOUD_CACHE_READY_EVENT = "fire-nepal:finance-cloud-cache-ready";

export type AuthenticatedFinanceCacheResult = {
  cashflow: CashflowDashboardState;
  savingsOk: boolean;
  insuranceOk: boolean;
  personalExpensesOk: boolean;
  groupExpensesOk: boolean;
};

async function hydrateCashflowCache(userId: string): Promise<CashflowDashboardState> {
  const res = await fetch("/api/cashflow", { credentials: "include", cache: "no-store" });
  const json = (await res.json()) as {
    ok: boolean;
    snapshot?: { state: CashflowDashboardState } | null;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load cashflow from Supabase.");
  }
  const next = json.snapshot?.state
    ? sanitizeCashflowState(json.snapshot.state)
    : defaultCashflowState();
  saveCashflowState(next, userId);
  return next;
}

async function hydrateSavingsCache(userId: string): Promise<void> {
  const remote = await fetchSavingsWorkspace();
  const next = remote ?? sanitizeSavingsWorkspaceState(null);
  saveSavingsWorkspaceState(next, userId);
}

async function hydrateInsuranceCache(userId: string): Promise<void> {
  const { policies } = await fetchInsurancePolicies();
  replaceInsuranceCacheWithCloud(policies, userId);
}

async function hydratePersonalExpensesCache(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getSupabaseBrowserClient();
  const rows = await listPersistedPersonalExpenses(client, userId);
  const empty = emptyPersonalExpenseState();
  if (rows.length === 0) {
    savePersonalExpenseState(empty, userId);
    return;
  }
  const expenses = rows.map((row) => {
    const metadata = row.metadata ?? {};
    const amountCurrency =
      row.currency === "KRW" || metadata.amountCurrency === "KRW" ? "KRW" : "NPR";
    return {
      id: row.local_expense_id ?? new Date(row.created_at).getTime(),
      title: row.description,
      amount: row.amount,
      payerId: row.member_id || "personal-user",
      category: row.category ?? DEFAULT_FINANCE_CATEGORY_ID,
      splitEqually: true as const,
      date: row.transaction_date,
      notes: typeof metadata.notes === "string" ? metadata.notes : undefined,
      amountCurrency: amountCurrency as "NPR" | "KRW",
    };
  });
  const members = Array.from(new Set(rows.map((row) => row.member_id || "personal-user")));
  savePersonalExpenseState({
    ...empty,
    expenses,
    members: members.length > 0 ? members : ["personal-user"],
  }, userId);
}

async function hydrateGroupExpensesCache(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const client = getSupabaseBrowserClient();
  const all = [];
  let cursor: string | null = null;
  do {
    const page = await listGroupExpenses(client, userId, { limit: 100, cursor });
    all.push(...page.rows);
    cursor = page.nextCursor;
  } while (cursor);

  const expenses = all.map(groupExpenseRowToExpense);
  const members = Array.from(new Set(expenses.map((e) => e.payerId).filter(Boolean)));
  const next: GroupExpensePersistedState = {
    version: 1,
    expenses,
    members,
    profiles: {},
    activities: [],
  };
  saveGroupExpenseState(next);
}

/**
 * Pull Supabase finance snapshots into localStorage caches for one authenticated user.
 * Safe to call on every session restore; always overwrites caches (including empties).
 */
export async function hydrateAuthenticatedFinanceCache(
  userId: string,
): Promise<AuthenticatedFinanceCacheResult> {
  const result: AuthenticatedFinanceCacheResult = {
    cashflow: defaultCashflowState(),
    savingsOk: false,
    insuranceOk: false,
    personalExpensesOk: false,
    groupExpensesOk: false,
  };

  const tasks: Array<Promise<void>> = [
    hydrateCashflowCache(userId)
      .then((cashflow) => {
        result.cashflow = cashflow;
      })
      .catch((error) => {
        // Keep existing scoped cache on temporary failure — never treat failed GET as empty.
        if (process.env.NODE_ENV !== "production") {
          console.error("[finance-cache] cashflow hydrate failed", error);
        }
      }),
    hydrateSavingsCache(userId)
      .then(() => {
        result.savingsOk = true;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[finance-cache] savings hydrate failed", error);
        }
      }),
    hydrateInsuranceCache(userId)
      .then(() => {
        result.insuranceOk = true;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[finance-cache] insurance hydrate failed", error);
        }
      }),
    hydratePersonalExpensesCache(userId)
      .then(() => {
        result.personalExpensesOk = true;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[finance-cache] personal expenses hydrate failed", error);
        }
      }),
    hydrateGroupExpensesCache(userId)
      .then(() => {
        result.groupExpensesOk = true;
      })
      .catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[finance-cache] group expenses hydrate failed", error);
        }
      }),
  ];

  await Promise.all(tasks);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FINANCE_CLOUD_CACHE_READY_EVENT, { detail: { userId } }));
  }

  return result;
}
