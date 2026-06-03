import { NextResponse } from "next/server";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron: every minute. Checks reminders due in the current UTC minute and sends via Resend.
 * Headers: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runScheduledRemindersCron(new Date());
    const status = result.ok ? 200 : 503;

    const sb = createSupabaseServiceRoleClient();
    if (sb) {
      await sb.from("system_health").upsert(
        {
          id: "scheduled_reminders_cron",
          label: "Scheduled reminder emails cron",
          last_run_at: new Date().toISOString(),
          last_status: result.ok ? "ok" : "error",
          metadata: {
            remindersChecked: result.remindersChecked,
            emailsSent: result.emailsSent,
            skipped: result.skipped,
            error: result.error ?? null,
          },
        },
        { onConflict: "id" },
      );
    }

    return NextResponse.json(
      {
        ...result,
        mode: secret ? "authenticated" : "dev-open",
        schedule: "* * * * *",
        provider: "resend",
      },
      { status },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    const sb = createSupabaseServiceRoleClient();
    if (sb) {
      await sb.from("system_health").upsert(
        {
          id: "scheduled_reminders_cron",
          label: "Scheduled reminder emails cron",
          last_run_at: new Date().toISOString(),
          last_status: "exception",
          metadata: { error: msg },
        },
        { onConflict: "id" },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
