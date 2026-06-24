import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";

type Client = SupabaseClient<Database>;

export type ExpenseWorkspaceSettings = {
  companyName: string;
  roomNumber: string;
};

export function emptyExpenseWorkspaceSettings(): ExpenseWorkspaceSettings {
  return { companyName: "", roomNumber: "" };
}

function normalizeSetting(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export async function loadExpenseWorkspaceSettings(
  client: Client,
  userId: string,
): Promise<ExpenseWorkspaceSettings> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-workspace-settings-load");
  if (!workspace) return emptyExpenseWorkspaceSettings();

  const { data, error } = await client
    .from("workspaces")
    .select("company_name,room_number")
    .eq("id", workspace.id)
    .maybeSingle();

  if (error || !data) {
    console.warn("[expense-workspace] could not load settlement location settings", error);
    return emptyExpenseWorkspaceSettings();
  }

  return {
    companyName: normalizeSetting(data.company_name),
    roomNumber: normalizeSetting(data.room_number),
  };
}

export async function saveExpenseWorkspaceSettings(
  client: Client,
  userId: string,
  settings: ExpenseWorkspaceSettings,
): Promise<ExpenseWorkspaceSettings> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-workspace-settings-save");
  if (!workspace) throw new Error("Could not resolve workspace for expense settings.");

  const companyName = normalizeSetting(settings.companyName);
  const roomNumber = normalizeSetting(settings.roomNumber);

  const { data, error } = await client
    .from("workspaces")
    .update({
      company_name: companyName || null,
      room_number: roomNumber || null,
    })
    .eq("id", workspace.id)
    .select("company_name,room_number")
    .single();

  if (error || !data) {
    console.error("[expense-workspace] could not save settlement location settings", error);
    throw error ?? new Error("Could not save expense workspace settings.");
  }

  return {
    companyName: normalizeSetting(data.company_name),
    roomNumber: normalizeSetting(data.room_number),
  };
}
