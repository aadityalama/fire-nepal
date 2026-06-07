import { NextResponse } from "next/server";
import { runMembershipRenewalRemindersCron } from "@/lib/membership-renewal-reminders/cron-dispatch";
import {
  upsertMembershipRenewalRemindersCronHealth,
  upsertScheduledRemindersCronHealth,
} from "@/lib/scheduled-reminders/cron-health";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type ServiceSb = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

async function runMembershipRenewalWithHealth(sb: ServiceSb, scheduleFromVercel: string | null) {
  try {
    const membershipRenewal = await runMembershipRenewalRemindersCron(new Date());
    const mh = await upsertMembershipRenewalRemindersCronHealth(sb, {
      last_status: membershipRenewal.ok ? "ok" : "error",
      metadata: {
        ...membershipRenewal,
        schedule: scheduleFromVercel,
      },
    });
    if (!mh.ok) {
      console.error("[cron/scheduled-reminders] membership renewal system_health upsert failed:", mh.message);
    }
    return membershipRenewal;
  } catch (me) {
    const inner = me instanceof Error ? me.message : "Membership renewal cron failed";
    const mh = await upsertMembershipRenewalRemindersCronHealth(sb, {
      last_status: "exception",
      metadata: { error: inner, schedule: scheduleFromVercel },
    });
    if (!mh.ok) {
      console.error("[cron/scheduled-reminders] membership renewal exception upsert failed:", mh.message);
    }
    return {
      ok: false as const,
      error: inner,
      candidates: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }
}

/** Hobby-safe daily cron in `vercel.json`; route reconciles a multi-day lookback window per run. */
export const maxDuration = 300;

/**
 * Vercel Cron: checks reminders due in a rolling lookback window (see `firesDueCatchUp`) and sends via Resend.
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

    const membershipRenewal = await runMembershipRenewalWithHealth(sb, scheduleFromVercel);

    return NextResponse.json(
      {
        ...result,
        membershipRenewal,
        mode: secret ? "authenticated" : "dev-open",
        schedule: scheduleFromVercel ?? "0 6 * * *",
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
    const membershipRenewal = await runMembershipRenewalWithHealth(sb, scheduleFromVercel);
    return NextResponse.json(
      { ok: false, error: msg, healthLogged: done.ok, membershipRenewal },
      { status: 500 },
    );
  }
}
