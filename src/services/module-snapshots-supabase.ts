import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleSnapshotKey } from "@/lib/module-snapshots/keys";
import type { Database, Json } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

export type ModuleSnapshotRow = {
  moduleKey: ModuleSnapshotKey;
  state: unknown;
  updatedAt: string;
};

export function isMissingModuleSnapshotsTableError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = message.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (lower.includes("user_module_snapshots") &&
      (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find the table")))
  );
}

function mapError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  if (isMissingModuleSnapshotsTableError(error)) {
    return "Module cloud sync is unavailable. Please try again in a moment.";
  }
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this workspace.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your workspace.";
  }
  return message || fallback;
}

/** Fallback marker in fire_goals when user_module_snapshots is missing. */
export function fireGoalsMarkerForModule(moduleKey: ModuleSnapshotKey): string {
  return `__fire_nepal_module_${moduleKey}_v1__`;
}

async function loadFromFireGoals(
  client: Client,
  userId: string,
  moduleKey: ModuleSnapshotKey,
): Promise<ModuleSnapshotRow | null> {
  const marker = fireGoalsMarkerForModule(moduleKey);
  const { data, error } = await client
    .from("fire_goals")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .eq("notes", marker)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(mapError(error, "Could not load workspace."));
  const row = data?.[0];
  if (!row) return null;
  const payload = row.payload as { kind?: string; state?: unknown } | null;
  if (!payload || payload.kind !== `module_${moduleKey}_v1`) return null;
  return { moduleKey, state: payload.state ?? {}, updatedAt: row.updated_at };
}

async function saveToFireGoals(
  client: Client,
  userId: string,
  moduleKey: ModuleSnapshotKey,
  state: unknown,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const marker = fireGoalsMarkerForModule(moduleKey);
  const updatedAt = new Date().toISOString();
  const payload = { kind: `module_${moduleKey}_v1`, state } as unknown as Json;

  const existing = await client
    .from("fire_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("notes", marker)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existing.error) {
    return { ok: false, error: mapError(existing.error, "Could not save workspace.") };
  }

  const id = existing.data?.[0]?.id;
  if (id) {
    const { error } = await client
      .from("fire_goals")
      .update({
        title: `Module ${moduleKey}`,
        notes: marker,
        payload,
        updated_at: updatedAt,
      })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) return { ok: false, error: mapError(error, "Could not save workspace.") };
  } else {
    const { error } = await client.from("fire_goals").insert({
      user_id: userId,
      title: `Module ${moduleKey}`,
      notes: marker,
      payload,
      updated_at: updatedAt,
    });
    if (error) return { ok: false, error: mapError(error, "Could not save workspace.") };
  }

  return { ok: true, updatedAt };
}

export async function loadModuleSnapshot(
  client: Client,
  userId: string,
  moduleKey: ModuleSnapshotKey,
): Promise<ModuleSnapshotRow | null> {
  const { data, error } = await client
    .from("user_module_snapshots")
    .select("state, updated_at")
    .eq("user_id", userId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (error) {
    if (isMissingModuleSnapshotsTableError(error)) {
      return loadFromFireGoals(client, userId, moduleKey);
    }
    throw new Error(mapError(error, "Could not load workspace."));
  }

  if (!data) return null;
  return { moduleKey, state: data.state, updatedAt: data.updated_at };
}

export async function saveModuleSnapshot(
  client: Client,
  userId: string,
  moduleKey: ModuleSnapshotKey,
  state: unknown,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const updatedAt = new Date().toISOString();
  const { error } = await client.from("user_module_snapshots").upsert(
    {
      user_id: userId,
      module_key: moduleKey,
      state: state as Json,
      updated_at: updatedAt,
    },
    { onConflict: "user_id,module_key" },
  );

  if (error) {
    if (isMissingModuleSnapshotsTableError(error)) {
      return saveToFireGoals(client, userId, moduleKey, state);
    }
    return { ok: false, error: mapError(error, "Could not save workspace.") };
  }

  return { ok: true, updatedAt };
}
