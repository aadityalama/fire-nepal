import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureScheduledRemindersEmailLifecycleSchema } from "@/services/ensure-scheduled-reminders-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Idempotent: apply email lifecycle columns + preferences table on production.
 * Uses server-side SUPABASE_DB_URL / SUPABASE_ACCESS_TOKEN (same pattern as finance SoT ensure).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const ensure = await ensureScheduledRemindersEmailLifecycleSchema();
  const admin = createSupabaseServiceRoleClient();
  const probes: Record<string, { ok: boolean; error: string | null }> = {};

  if (admin) {
    if (ensure.ok) await new Promise((r) => setTimeout(r, 800));
    for (const table of ["scheduled_reminders", "scheduled_reminder_email_sends", "user_reminder_email_preferences"] as const) {
      const { error } = await admin.from(table).select("*").limit(1);
      probes[table] = { ok: !error, error: error?.message ?? null };
    }
    const { error: colErr } = await admin
      .from("scheduled_reminders")
      .select("id, email_enabled, is_archived, last_email_sent_at")
      .limit(1);
    probes.scheduled_reminders_lifecycle_columns = {
      ok: !colErr,
      error: colErr?.message ?? null,
    };
  }

  const ok = ensure.ok && Object.values(probes).every((p) => p.ok);
  return NextResponse.json(
    {
      ok,
      ensure,
      probes,
      resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    },
    { status: ok ? 200 : 503 },
  );
}
