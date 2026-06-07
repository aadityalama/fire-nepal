import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase-database";

export type AdminMemberCrmEventType = "membership_renewed" | "user_suspended" | "user_reactivated";

export async function insertAdminMemberCrmEvent(
  admin: SupabaseClient<Database>,
  input: {
    user_id: string;
    event_type: AdminMemberCrmEventType;
    title: string;
    body?: string | null;
    meta?: Record<string, unknown>;
    actor_id: string | null;
    occurred_at?: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await admin.from("admin_member_crm_events").insert({
    user_id: input.user_id,
    event_type: input.event_type,
    title: input.title,
    body: input.body ?? null,
    meta: (input.meta ?? {}) as Json,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    actor_id: input.actor_id,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
