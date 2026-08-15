import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { sanitizeFireLendingStore } from "@/lib/fire-lending/storage";
import type { FireLendingStore } from "@/lib/fire-lending/types";
import type { Json } from "@/types/supabase-database";

export type FireLendingSnapshotLoadOk = { ok: true; store: FireLendingStore };
export type FireLendingSnapshotLoadErr = { ok: false; error: string; status: number };

/** Load the authenticated user's fire_lending module snapshot. */
export async function loadFireLendingStoreForUser(
  userId: string,
): Promise<FireLendingSnapshotLoadOk | FireLendingSnapshotLoadErr> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Service role is not configured", status: 503 };
  }

  const { data, error } = await admin
    .from("user_module_snapshots")
    .select("state")
    .eq("user_id", userId)
    .eq("module_key", "fire_lending")
    .maybeSingle();

  if (error) {
    console.error("FIRE_LENDING_SNAPSHOT_LOAD", error);
    return { ok: false, error: "Could not load lending data.", status: 500 };
  }

  return { ok: true, store: sanitizeFireLendingStore(data?.state ?? null) };
}

export async function saveFireLendingStoreForUser(
  userId: string,
  store: FireLendingStore,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string; status: number }> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Service role is not configured", status: 503 };
  }

  const updatedAt = new Date().toISOString();
  const { error } = await admin.from("user_module_snapshots").upsert(
    {
      user_id: userId,
      module_key: "fire_lending",
      state: store as unknown as Json,
      updated_at: updatedAt,
    },
    { onConflict: "user_id,module_key" },
  );

  if (error) {
    console.error("FIRE_LENDING_SNAPSHOT_SAVE", error);
    return { ok: false, error: "Could not save lending data.", status: 500 };
  }

  return { ok: true, updatedAt };
}
