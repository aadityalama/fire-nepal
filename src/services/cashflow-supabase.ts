import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { isMissingCashflowTableError } from "@/services/ensure-cashflow-schema";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export type CashflowSnapshotRow = {
  state: CashflowDashboardState;
  updatedAt: string;
};

/** Marker row in public.fire_goals used when cashflow_snapshots is unavailable. */
export const CASHFLOW_FIRE_GOALS_MARKER = "__fire_nepal_cashflow_snapshots_v1__";
export const CASHFLOW_FIRE_GOALS_TITLE = "Cashflow workspace";

export function hasCashflowData(state: CashflowDashboardState): boolean {
  const income = Object.values(state.income).some((value) => typeof value === "number" && value > 0);
  const incomeEntries = (state.incomeEntries ?? []).some((entry) => entry.amount > 0);
  const expenses = Object.values(state.expenses).some((value) => typeof value === "number" && value > 0);
  return (
    income ||
    incomeEntries ||
    expenses ||
    Boolean(state.emergencyCashReserve && state.emergencyCashReserve > 0) ||
    Boolean(state.monthlyExpensesOverride && state.monthlyExpensesOverride > 0)
  );
}

function mapCashflowError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();

  if (isMissingCashflowTableError(error)) {
    return "Cashflow cloud sync is unavailable. Please try again in a moment.";
  }
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this cashflow workspace.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your cashflow workspace.";
  }

  return message || fallback;
}

function extractStateFromFireGoalsPayload(payload: unknown): CashflowDashboardState | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { kind?: unknown; state?: unknown };
  if (record.kind !== "cashflow_snapshots_v1") return null;
  return sanitizeCashflowState(record.state);
}

function buildFireGoalsPayload(state: CashflowDashboardState): Json {
  return {
    kind: "cashflow_snapshots_v1",
    state,
  } as unknown as Json;
}

async function loadCashflowFromFireGoals(client: Client, userId: string): Promise<CashflowSnapshotRow | null> {
  const { data, error } = await client
    .from("fire_goals")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .eq("notes", CASHFLOW_FIRE_GOALS_MARKER)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[cashflow-supabase] fire_goals load failed", error);
    }
    throw new Error(mapCashflowError(error, "Could not load cashflow workspace."));
  }

  const row = data?.[0];
  if (!row) return null;
  const state = extractStateFromFireGoalsPayload(row.payload);
  if (!state) return null;
  return { state, updatedAt: row.updated_at };
}

async function saveCashflowToFireGoals(
  client: Client,
  userId: string,
  state: CashflowDashboardState,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const sanitized = sanitizeCashflowState(state);
  const updatedAt = new Date().toISOString();
  const payload = buildFireGoalsPayload(sanitized);

  const existing = await client
    .from("fire_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("notes", CASHFLOW_FIRE_GOALS_MARKER)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existing.error) {
    return { ok: false, error: mapCashflowError(existing.error, "Could not save cashflow workspace.") };
  }

  const existingId = existing.data?.[0]?.id;
  if (existingId) {
    const { data, error } = await client
      .from("fire_goals")
      .update({
        title: CASHFLOW_FIRE_GOALS_TITLE,
        notes: CASHFLOW_FIRE_GOALS_MARKER,
        payload,
        updated_at: updatedAt,
      })
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("updated_at")
      .single();

    if (error || !data) {
      return { ok: false, error: mapCashflowError(error, "Could not save cashflow workspace.") };
    }
    return { ok: true, updatedAt: data.updated_at };
  }

  const { data, error } = await client
    .from("fire_goals")
    .insert({
      user_id: userId,
      title: CASHFLOW_FIRE_GOALS_TITLE,
      notes: CASHFLOW_FIRE_GOALS_MARKER,
      payload,
      updated_at: updatedAt,
    })
    .select("updated_at")
    .single();

  if (error || !data) {
    return { ok: false, error: mapCashflowError(error, "Could not save cashflow workspace.") };
  }

  return { ok: true, updatedAt: data.updated_at };
}

export async function loadCashflowFromSupabase(client: Client, userId: string): Promise<CashflowSnapshotRow | null> {
  const { data, error } = await client
    .from("cashflow_snapshots")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) {
    if (!data) return null;
    return {
      state: sanitizeCashflowState(data.state),
      updatedAt: data.updated_at,
    };
  }

  if (isMissingCashflowTableError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cashflow-supabase] cashflow_snapshots missing; using fire_goals fallback", error);
    }
    return loadCashflowFromFireGoals(client, userId);
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[cashflow-supabase] load failed", error);
  }
  return null;
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

  if (!error) {
    return { ok: true, updatedAt };
  }

  if (isMissingCashflowTableError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cashflow-supabase] cashflow_snapshots missing; saving via fire_goals fallback", error);
    }
    return saveCashflowToFireGoals(client, userId, sanitized);
  }

  const message = error.message.includes("cashflow_snapshots")
    ? "Cashflow sync is not ready. Apply the cashflow_snapshots migration."
    : error.message;
  return { ok: false, error: message };
}
