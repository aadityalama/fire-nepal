import { NextResponse } from "next/server";
import { upsertScheduledRemindersCronHealth } from "@/lib/scheduled-reminders/cron-health";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

/** Vercel Pro (and above): every minute. Must match `vercel.json` `crons[].schedule`. */
export const maxDuration = 300;

/**
 * Vercel Cron: checks reminders due in the current UTC minute and sends via Resend.
 * When `CRON_SECRET` is set on the project, Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const scheduleFromVercel = request.headers.get("x-vercel-cron-schedule");
  const sb = createSupabaseServiceRoleClient();

  if (!sb) {
    const msg = "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing — cannot run cron or log health.";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        mode: secret ? "authenticated" : "dev-open",
        schedule: scheduleFromVercel ?? "unset",
      },
      { status: 503 },
    );
  }

  const healthLog = await upsertScheduledRemindersCronHealth(sb, {
    last_status: "running",
    metadata: { phase: "started", schedule: scheduleFromVercel },
  });
  if (!healthLog.ok) {
    console.error("[cron/scheduled-reminders] system_health start upsert failed:", healthLog.message);
  }

  try {
    const result = await runScheduledRemindersCron(new Date());
    const status = result.ok ? 200 : 503;

    const done = await upsertScheduledRemindersCronHealth(sb, {
      last_status: result.ok ? "ok" : "error",
      metadata: {
        remindersChecked: result.remindersChecked,
        emailsSent: result.emailsSent,
        skipped: result.skipped,
        error: result.error ?? null,
        schedule: scheduleFromVercel,
      },
    });
    if (!done.ok) {
      console.error("[cron/scheduled-reminders] system_health finish upsert failed:", done.message);
    }

    return NextResponse.json(
      {
        ...result,
        mode: secret ? "authenticated" : "dev-open",
        schedule: scheduleFromVercel ?? "* * * * *",
        provider: "resend",
        healthLogged: done.ok,
      },
      { status },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    const done = await upsertScheduledRemindersCronHealth(sb, {
      last_status: "exception",
      metadata: { error: msg, schedule: scheduleFromVercel },
    });
    if (!done.ok) {
      console.error("[cron/scheduled-reminders] system_health exception upsert failed:", done.message);
    }
    return NextResponse.json({ ok: false, error: msg, healthLogged: done.ok }, { status: 500 });
  }
}
