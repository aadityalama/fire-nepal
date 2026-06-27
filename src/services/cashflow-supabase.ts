import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export type CashflowSnapshotRow = {
  state: CashflowDashboardState;
  updatedAt: string;
};

export function hasCashflowData(state: CashflowDashboardState): boolean {
  const income = Object.values(state.income).some((value) => typeof value === "number" && value > 0);
  const expenses = Object.values(state.expenses).some((value) => typeof value === "number" && value > 0);
  return income || expenses || Boolean(state.emergencyCashReserve && state.emergencyCashReserve > 0) || Boolean(state.monthlyExpensesOverride && state.monthlyExpensesOverride > 0);
}

export async function loadCashflowFromSupabase(client: Client, userId: string): Promise<CashflowSnapshotRow | null> {
  const { data, error } = await client
    .from("cashflow_snapshots")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    state: sanitizeCashflowState(data.state),
    updatedAt: data.updated_at,
  };
}

export async function saveCashflowToSupabase(
  client: Client,
  userId: string,
  state: CashflowDashboardState,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const sanitized = sanitizeCashflowState(state);
  const updatedAt = new Date().toISOString();
  const { error } = await client.from("cashflow_snapshots").upsert(
    {
      user_id: userId,
      state: sanitized as unknown as Json,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    const message = error.message.includes("cashflow_snapshots")
      ? "Cashflow sync is not ready. Apply the cashflow_snapshots migration."
      : error.message;
    return { ok: false, error: message };
  }

  return { ok: true, updatedAt };
}
