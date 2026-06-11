import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export type FireWorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];

export function logWorkspaceOwnerMismatch(
  workspace: Pick<FireWorkspaceRow, "id" | "user_id"> | null | undefined,
  authUserId: string,
  context: string,
): boolean {
  if (!workspace) return false;
  if (workspace.user_id === authUserId) return false;
  console.error("[workspace-security] workspace owner mismatch", {
    context,
    workspaceId: workspace.id,
    workspaceUserId: workspace.user_id,
    authUserId,
  });
  return true;
}

export async function ensureAuthenticatedWorkspace(
  client: Client,
  expectedUserId: string | null | undefined,
  context: string,
): Promise<FireWorkspaceRow | null> {
  const { data: authData, error: authError } = await client.auth.getUser();
  const authUserId = authData.user?.id ?? null;
  if (authError || !authUserId) {
    console.error("[workspace-security] missing authenticated user", { context, error: authError });
    return null;
  }

  if (expectedUserId && expectedUserId !== authUserId) {
    console.error("[workspace-security] requested user does not match auth user", {
      context,
      requestedUserId: expectedUserId,
      authUserId,
    });
    return null;
  }

  const selected = await client
    .from("workspaces")
    .select("id,user_id,name,created_at,updated_at")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (selected.error) {
    console.error("[workspace-security] workspace load failed", { context, error: selected.error });
    return null;
  }

  if (selected.data) {
    if (logWorkspaceOwnerMismatch(selected.data, authUserId, context)) return null;
    return selected.data as FireWorkspaceRow;
  }

  const created = await client
    .from("workspaces")
    .insert({ user_id: authUserId })
    .select("id,user_id,name,created_at,updated_at")
    .single();

  if (created.error || !created.data) {
    console.error("[workspace-security] workspace create failed", { context, error: created.error });
    return null;
  }

  if (logWorkspaceOwnerMismatch(created.data, authUserId, context)) return null;
  return created.data as FireWorkspaceRow;
}
