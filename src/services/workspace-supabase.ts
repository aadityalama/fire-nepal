import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import { createMutationTimer } from "@/lib/mutation-perf";

type Client = SupabaseClient<Database>;

export type FireWorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];

/** Columns guaranteed by the base workspaces migration (safe before optional profile columns exist). */
const WORKSPACE_CORE_COLUMNS = "id,user_id,name,created_at,updated_at" as const;

/** In-memory cache to avoid duplicate auth.getUser + workspace queries per mutation burst. */
const WORKSPACE_CACHE_TTL_MS = 30_000;
const workspaceCache = new Map<string, { row: FireWorkspaceRow; expiresAt: number }>();
const workspaceInflight = new Map<string, Promise<FireWorkspaceRow | null>>();

export class WorkspaceSupabaseError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceSupabaseError";
  }
}

function formatSupabaseError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

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

/** Drop cached workspace (e.g. after sign-out or ownership change). */
export function invalidateWorkspaceCache(userId?: string | null): void {
  if (!userId) {
    workspaceCache.clear();
    workspaceInflight.clear();
    return;
  }
  workspaceCache.delete(userId);
  workspaceInflight.delete(userId);
}

async function loadOrCreateWorkspace(
  client: Client,
  authUserId: string,
  context: string,
): Promise<FireWorkspaceRow | null> {
  const selected = await client
    .from("workspaces")
    .select(WORKSPACE_CORE_COLUMNS)
    .eq("user_id", authUserId)
    .maybeSingle();

  if (selected.error) {
    console.error("[workspace-security] workspace load failed", { context, error: selected.error });
    throw new WorkspaceSupabaseError(
      formatSupabaseError(selected.error, "Could not load authenticated workspace."),
      context,
      selected.error,
    );
  }

  if (selected.data) {
    if (logWorkspaceOwnerMismatch(selected.data, authUserId, context)) return null;
    return selected.data as FireWorkspaceRow;
  }

  const created = await client
    .from("workspaces")
    .insert({ user_id: authUserId })
    .select(WORKSPACE_CORE_COLUMNS)
    .single();

  if (created.error || !created.data) {
    console.error("[workspace-security] workspace create failed", { context, error: created.error });
    throw new WorkspaceSupabaseError(
      formatSupabaseError(created.error, "Could not create authenticated workspace."),
      context,
      created.error,
    );
  }

  if (logWorkspaceOwnerMismatch(created.data, authUserId, context)) return null;
  return created.data as FireWorkspaceRow;
}

export async function ensureAuthenticatedWorkspace(
  client: Client,
  expectedUserId: string | null | undefined,
  context: string,
): Promise<FireWorkspaceRow | null> {
  const timer = createMutationTimer("ensureAuthenticatedWorkspace", { context });

  const { data: authData, error: authError } = await timer.track("auth", () => client.auth.getUser());
  const authUserId = authData.user?.id ?? null;
  if (authError || !authUserId) {
    console.error("[workspace-security] missing authenticated user", { context, error: authError });
    throw new WorkspaceSupabaseError(
      formatSupabaseError(authError, "No authenticated Supabase user found. Please sign in again."),
      context,
      authError,
    );
  }

  if (expectedUserId && expectedUserId !== authUserId) {
    console.error("[workspace-security] requested user does not match auth user", {
      context,
      requestedUserId: expectedUserId,
      authUserId,
    });
    throw new WorkspaceSupabaseError("Authenticated user changed before portfolio save. Please refresh and try again.", context);
  }

  const cached = workspaceCache.get(authUserId);
  if (cached && cached.expiresAt > Date.now()) {
    timer.flush({ cacheHit: true });
    return cached.row;
  }

  const inflight = workspaceInflight.get(authUserId);
  if (inflight) {
    const row = await inflight;
    timer.flush({ cacheHit: "inflight" });
    return row;
  }

  const promise = timer
    .track("database", () => loadOrCreateWorkspace(client, authUserId, context))
    .then((row) => {
      if (row) {
        workspaceCache.set(authUserId, { row, expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS });
      }
      return row;
    })
    .finally(() => {
      workspaceInflight.delete(authUserId);
    });

  workspaceInflight.set(authUserId, promise);
  const row = await promise;
  timer.flush({ cacheHit: false });
  return row;
}
