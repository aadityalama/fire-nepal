import { NextResponse } from "next/server";
import { runMembershipRenewalRemindersCron } from "@/lib/membership-renewal-reminders/cron-dispatch";
import { upsertMembershipRenewalRemindersCronHealth } from "@/lib/scheduled-reminders/cron-health";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** Optional standalone cron (same logic as chained run from `/api/cron/scheduled-reminders`). */
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

  const startLog = await upsertMembershipRenewalRemindersCronHealth(sb, {
    last_status: "running",
    metadata: { phase: "started", schedule: scheduleFromVercel },
  });
  if (!startLog.ok) {
    console.error("[cron/membership-renewal-reminders] system_health start upsert failed:", startLog.message);
  }

  try {
    const result = await runMembershipRenewalRemindersCron(new Date());
    const status = result.ok ? 200 : 503;

    const done = await upsertMembershipRenewalRemindersCronHealth(sb, {
      last_status: result.ok ? "ok" : "error",
      metadata: {
        ...result,
        schedule: scheduleFromVercel,
      },
    });
    if (!done.ok) {
      console.error("[cron/membership-renewal-reminders] system_health finish upsert failed:", done.message);
    }

    return NextResponse.json(
      {
        ...result,
        mode: secret ? "authenticated" : "dev-open",
        schedule: scheduleFromVercel ?? "unset",
        provider: "resend",
        healthLogged: done.ok,
      },
      { status },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron failed";
    const done = await upsertMembershipRenewalRemindersCronHealth(sb, {
      last_status: "exception",
      metadata: { error: msg, schedule: scheduleFromVercel },
    });
    if (!done.ok) {
      console.error("[cron/membership-renewal-reminders] system_health exception upsert failed:", done.message);
    }
    return NextResponse.json({ ok: false, error: msg, healthLogged: done.ok }, { status: 500 });
  }
}
