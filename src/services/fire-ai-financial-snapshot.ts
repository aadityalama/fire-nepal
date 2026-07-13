import "server-only";

import { defaultCashflowState } from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { computeWealthTotals, type WealthTotals } from "@/components/portfolio/calculations";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { computeUnifiedFireSummary, type UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { fetchNprCrossRates } from "@/lib/portfolio-convert";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultTransactionFilters, type ExpenseTransactionRow } from "@/lib/transaction-history-types";
import { listAllExpenseTransactionsForExport } from "@/services/expense-transactions-supabase";
import { hasCashflowData, loadCashflowFromSupabase } from "@/services/cashflow-supabase";
import { resolveFireAiMembershipPlan, type FireAiMembershipPlan } from "@/services/fire-ai-usage";
import { loadWealthPortfolioFromSupabase } from "@/services/portfolio-supabase";
import { fetchUserProfile } from "@/services/user-profile-supabase";

export type FireAiUserProfileContext = {
  displayName: string | null;
  preferredCurrency: string | null;
  membershipPlan: FireAiMembershipPlan | null;
};

export type FireAiExpenseContext = {
  rows: ExpenseTransactionRow[];
  generatedAt: string;
};

export type FireAiWealthContext = {
  portfolio: WealthPortfolioStateV2 | null;
  wealthTotals: WealthTotals | null;
  summary: UnifiedFireSummary | null;
  cashflow: CashflowDashboardState;
  cashflowSynced: boolean;
  cashflowUpdatedAt: string | null;
};

export type FireAiFinancialSnapshot = {
  userId: string;
  profile: FireAiUserProfileContext;
  expenses: FireAiExpenseContext;
  wealth: FireAiWealthContext;
};

const snapshotCache = new Map<string, Promise<FireAiFinancialSnapshot>>();

function sixMonthsAgoIsoDate(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 5);
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

async function loadSnapshot(userId: string): Promise<FireAiFinancialSnapshot> {
  const sb = await createServerSupabaseClient();

  const [profileRow, membershipPlan, expensesResult, portfolio, cashflowSnapshot, rates] = await Promise.all([
    fetchUserProfile(sb, userId),
    resolveFireAiMembershipPlan(userId).catch(() => null),
    listAllExpenseTransactionsForExport(sb, userId, {
      ...defaultTransactionFilters(),
      datePreset: "custom",
      dateFrom: sixMonthsAgoIsoDate(),
      dateTo: new Date().toISOString().slice(0, 10),
      transactionType: "expense",
    }).catch(() => ({ rows: [], summary: { totalIncome: 0, totalExpense: 0, netBalance: 0 } })),
    loadWealthPortfolioFromSupabase(sb, userId).catch(() => null),
    loadCashflowFromSupabase(sb, userId).catch(() => null),
    fetchNprCrossRates(),
  ]);

  const cashflow = cashflowSnapshot?.state ?? defaultCashflowState();
  const cashflowSynced = hasCashflowData(cashflow);
  const wealthTotals = portfolio ? computeWealthTotals(portfolio, rates.krwPerNpr, rates.usdPerNpr) : null;
  const summary = portfolio
    ? computeUnifiedFireSummary(portfolio, cashflow, rates.krwPerNpr, rates.usdPerNpr)
    : null;

  return {
    userId,
    profile: {
      displayName: profileRow?.full_name ?? null,
      preferredCurrency: profileRow?.preferred_currency ?? null,
      membershipPlan,
    },
    expenses: {
      rows: expensesResult.rows.filter((row) => row.transaction_type === "expense" && !row.deleted_at),
      generatedAt: new Date().toISOString(),
    },
    wealth: {
      portfolio,
      wealthTotals,
      summary,
      cashflow,
      cashflowSynced,
      cashflowUpdatedAt: cashflowSnapshot?.updatedAt ?? null,
    },
  };
}

export async function getFireAiFinancialSnapshot(userId: string): Promise<FireAiFinancialSnapshot> {
  const cached = snapshotCache.get(userId);
  if (cached) return cached;

  const promise = loadSnapshot(userId).finally(() => {
    setTimeout(() => snapshotCache.delete(userId), 5_000).unref?.();
  });
  snapshotCache.set(userId, promise);
  return promise;
}
