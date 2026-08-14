import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import type { SavingsWorkspaceState } from "@/lib/savings/savings-types";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

/**
 * Source of truth: `finance_savings_workspace`.
 * `fire_goals` marker fallback is used only when that table is missing — never dual-write.
 */
/** Marker row in public.fire_goals used when finance_savings_workspace is unavailable. */
export const SAVINGS_FIRE_GOALS_MARKER = "__fire_nepal_savings_workspace_v1__";
export const SAVINGS_FIRE_GOALS_TITLE = "Savings workspace";

type SavingsSnapshot = { state: SavingsWorkspaceState; updatedAt: string };

function isMissingSavingsTableError(error: { message?: string; code?: string } | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("finance_savings_workspace") &&
      (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find the table")))
  );
}

function mapSavingsError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();

  if (isMissingSavingsTableError(error)) {
    return "Savings cloud sync is unavailable. Please try again in a moment.";
  }
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this savings workspace.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your savings workspace.";
  }

  return message || fallback;
}

function extractStateFromFireGoalsPayload(payload: unknown): SavingsWorkspaceState | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { kind?: unknown; state?: unknown };
  if (record.kind !== "savings_workspace_v1") return null;
  return sanitizeSavingsWorkspaceState(record.state);
}

function buildFireGoalsPayload(state: SavingsWorkspaceState): Json {
  return {
    kind: "savings_workspace_v1",
    state,
  } as unknown as Json;
}

async function loadSavingsWorkspaceFromFireGoals(
  client: Client,
  userId: string,
): Promise<SavingsSnapshot | null> {
  const { data, error } = await client
    .from("fire_goals")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .eq("notes", SAVINGS_FIRE_GOALS_MARKER)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[savings-supabase] fire_goals load failed", error);
    }
    throw new Error(mapSavingsError(error, "Could not load savings workspace."));
  }

  const row = data?.[0];
  if (!row) return null;
  const state = extractStateFromFireGoalsPayload(row.payload);
  if (!state) return null;
  return { state, updatedAt: row.updated_at };
}

async function saveSavingsWorkspaceToFireGoals(
  client: Client,
  userId: string,
  state: SavingsWorkspaceState,
): Promise<SavingsSnapshot> {
  const sanitized = sanitizeSavingsWorkspaceState(state);
  const updatedAt = new Date().toISOString();
  const totalTarget = sanitized.goals.reduce((sum, goal) => sum + (Number(goal.targetAmountNpr) || 0), 0);
  const payload = buildFireGoalsPayload(sanitized);

  const existing = await client
    .from("fire_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("notes", SAVINGS_FIRE_GOALS_MARKER)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existing.error) {
    throw new Error(mapSavingsError(existing.error, "Could not save savings workspace."));
  }

  const existingId = existing.data?.[0]?.id;
  if (existingId) {
    const { data, error } = await client
      .from("fire_goals")
      .update({
        title: SAVINGS_FIRE_GOALS_TITLE,
        target_amount_npr: totalTarget,
        notes: SAVINGS_FIRE_GOALS_MARKER,
        payload,
        updated_at: updatedAt,
      })
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("payload, updated_at")
      .single();

    if (error || !data) {
      throw new Error(mapSavingsError(error, "Could not save savings workspace."));
    }
    return {
      state: extractStateFromFireGoalsPayload(data.payload) ?? sanitized,
      updatedAt: data.updated_at,
    };
  }

  const { data, error } = await client
    .from("fire_goals")
    .insert({
      user_id: userId,
      title: SAVINGS_FIRE_GOALS_TITLE,
      target_amount_npr: totalTarget,
      notes: SAVINGS_FIRE_GOALS_MARKER,
      payload,
      updated_at: updatedAt,
    })
    .select("payload, updated_at")
    .single();

  if (error || !data) {
    throw new Error(mapSavingsError(error, "Could not save savings workspace."));
  }

  return {
    state: extractStateFromFireGoalsPayload(data.payload) ?? sanitized,
    updatedAt: data.updated_at,
  };
}

export async function loadSavingsWorkspaceForUser(
  client: Client,
  userId: string,
): Promise<SavingsSnapshot | null> {
  const { data, error } = await client
    .from("finance_savings_workspace")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) {
    if (!data) return null;
    return {
      state: sanitizeSavingsWorkspaceState(data.state),
      updatedAt: data.updated_at,
    };
  }

  if (isMissingSavingsTableError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[savings-supabase] finance_savings_workspace missing; using fire_goals fallback", error);
    }
    return loadSavingsWorkspaceFromFireGoals(client, userId);
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[savings-supabase] load failed", error);
  }
  throw new Error(mapSavingsError(error, "Could not load savings workspace."));
}

export async function saveSavingsWorkspaceForUser(
  client: Client,
  userId: string,
  state: SavingsWorkspaceState,
): Promise<SavingsSnapshot> {
  const sanitized = sanitizeSavingsWorkspaceState(state);
  const updatedAt = new Date().toISOString();
  const { data, error } = await client
    .from("finance_savings_workspace")
    .upsert(
      {
        user_id: userId,
        state: sanitized as unknown as Json,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    )
    .select("state, updated_at")
    .single();

  if (!error && data) {
    return {
      state: sanitizeSavingsWorkspaceState(data.state),
      updatedAt: data.updated_at,
    };
  }

  if (isMissingSavingsTableError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[savings-supabase] finance_savings_workspace missing; saving via fire_goals fallback", error);
    }
    return saveSavingsWorkspaceToFireGoals(client, userId, sanitized);
  }

  if (process.env.NODE_ENV !== "production") {
    console.error("[savings-supabase] save failed", error);
  }
  throw new Error(mapSavingsError(error, "Could not save savings workspace."));
}
