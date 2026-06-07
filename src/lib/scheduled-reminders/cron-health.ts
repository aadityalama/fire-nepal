import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase-database";

const CRON_ROW_ID = "scheduled_reminders_cron" as const;

export async function upsertScheduledRemindersCronHealth(
  sb: SupabaseClient<Database>,
  input: {
    last_status: string;
    last_run_at?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const last_run_at = input.last_run_at ?? new Date().toISOString();
  const { error } = await sb.from("system_health").upsert(
    {
      id: CRON_ROW_ID,
      label: "Scheduled reminder emails cron",
      last_run_at,
      last_status: input.last_status,
      metadata: (input.metadata ?? {}) as Json,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
