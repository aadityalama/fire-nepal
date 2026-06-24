import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupProfile } from "@/lib/group-profile";
import { emptyGroupProfile, normalizeGroupProfileField } from "@/lib/group-profile";
import type { Database } from "@/types/supabase-database";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";

type Client = SupabaseClient<Database>;

/** @deprecated Use GroupProfile */
export type ExpenseWorkspaceSettings = GroupProfile;

export function emptyExpenseWorkspaceSettings(): GroupProfile {
  return emptyGroupProfile();
}

function rowToGroupProfile(row: {
  company_name: string | null;
  room_number: string | null;
  company_type: string | null;
  description: string | null;
  logo_url: string | null;
}): GroupProfile {
  return {
    companyName: normalizeGroupProfileField(row.company_name),
    roomNumber: normalizeGroupProfileField(row.room_number),
    companyType: normalizeGroupProfileField(row.company_type),
    description: normalizeGroupProfileField(row.description),
    logoUrl: normalizeGroupProfileField(row.logo_url),
  };
}

const GROUP_PROFILE_COLUMNS =
  "company_name,room_number,company_type,description,logo_url" as const;

export async function loadExpenseWorkspaceSettings(
  client: Client,
  userId: string,
): Promise<GroupProfile> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-workspace-settings-load");
  if (!workspace) return emptyGroupProfile();

  const { data, error } = await client
    .from("workspaces")
    .select(GROUP_PROFILE_COLUMNS)
    .eq("id", workspace.id)
    .maybeSingle();

  if (error || !data) {
    console.warn("[expense-workspace] could not load group profile settings", error);
    return emptyGroupProfile();
  }

  return rowToGroupProfile(data);
}

export async function saveExpenseWorkspaceSettings(
  client: Client,
  userId: string,
  settings: GroupProfile,
): Promise<GroupProfile> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-workspace-settings-save");
  if (!workspace) throw new Error("Could not resolve workspace for expense settings.");

  const companyName = normalizeGroupProfileField(settings.companyName);
  const roomNumber = normalizeGroupProfileField(settings.roomNumber);
  const companyType = normalizeGroupProfileField(settings.companyType);
  const description = normalizeGroupProfileField(settings.description);
  const logoUrl = normalizeGroupProfileField(settings.logoUrl);

  const { data, error } = await client
    .from("workspaces")
    .update({
      company_name: companyName || null,
      room_number: roomNumber || null,
      company_type: companyType || null,
      description: description || null,
      logo_url: logoUrl || null,
    })
    .eq("id", workspace.id)
    .select(GROUP_PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[expense-workspace] could not save group profile settings", error);
    throw error ?? new Error("Could not save expense workspace settings.");
  }

  return rowToGroupProfile(data);
}
