import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import type { SavingsWorkspaceState } from "@/lib/savings/savings-types";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

function mapSavingsError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();

  if (
    lower.includes("finance_savings_workspace") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || error?.code === "42P01" || error?.code === "PGRST205")
  ) {
    return "Savings storage is being set up. Please try again in a minute.";
  }
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this savings workspace.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your savings workspace.";
  }

  return message || fallback;
}

export async function loadSavingsWorkspaceForUser(
  client: Client,
  userId: string,
): Promise<{ state: SavingsWorkspaceState; updatedAt: string } | null> {
  const { data, error } = await client
    .from("finance_savings_workspace")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[savings-supabase] load failed", error);
    }
    throw new Error(mapSavingsError(error, "Could not load savings workspace."));
  }

  if (!data) return null;
  return {
    state: sanitizeSavingsWorkspaceState(data.state),
    updatedAt: data.updated_at,
  };
}

export async function saveSavingsWorkspaceForUser(
  client: Client,
  userId: string,
  state: SavingsWorkspaceState,
): Promise<{ state: SavingsWorkspaceState; updatedAt: string }> {
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

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[savings-supabase] save failed", error);
    }
    throw new Error(mapSavingsError(error, "Could not save savings workspace."));
  }

  return {
    state: sanitizeSavingsWorkspaceState(data.state),
    updatedAt: data.updated_at,
  };
}
