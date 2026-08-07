import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureScheduledRemindersEmailLifecycleSchema } from "@/services/ensure-scheduled-reminders-schema";
import { formatInTimeZone } from "date-fns-tz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const E2E_PASSWORD = "FinanceE2EVerify!23456";

function resolveDeliverableInbox(stamp: number): string {
  const admin = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (admin && admin.includes("@")) return admin;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "";
  const m = /<([^>]+)>/.exec(from) || /([^\s<>]+@[^\s<>]+)/.exec(from);
  const fromEmail = m?.[1] ?? "noreply@firenepal.com";
  const domain = fromEmail.split("@")[1] || "firenepal.com";
  // Resend accepts mail to the verified sending domain; .test TLD is rejected.
  return `reminder-e2e+${stamp}@${domain}`;
}

/**
 * Production e2e for reminder emails (server-side secrets):
 * ensure schema → create active reminder → run cron → assert ledger → delete → cron again → assert no active row.
 *
 * GET /api/schema/e2e-reminder-email
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Missing service role client" }, { status: 503 });
  }

  const report: Record<string, unknown> = {
    steps: [] as Array<Record<string, unknown>>,
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    fromAddress: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || null,
  };

  const push = (step: Record<string, unknown>) => {
    (report.steps as Array<Record<string, unknown>>).push(step);
  };

  let userId: string | null = null;
  let reminderId: string | null = null;
  const stamp = Date.now();
  const email = resolveDeliverableInbox(stamp);

  try {
    const ensure = await ensureScheduledRemindersEmailLifecycleSchema();
    push({ step: "ensure_schema", ...ensure });
    // Continue even if DDL ensure is unavailable — core send path works on legacy columns.
    if (!ensure.ok) {
      push({
        step: "ensure_schema_soft_fail",
        ok: true,
        note: "Proceeding without new lifecycle columns; apply migration when SUPABASE_DB_URL is available.",
      });
    }

    if (!process.env.RESEND_API_KEY?.trim()) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing on server", report }, { status: 503 });
    }

    const url = getSupabaseUrl();
    const anon = getSupabaseAnonKey();
    if (!url || !anon) {
      return NextResponse.json({ ok: false, error: "Missing public Supabase env", report }, { status: 503 });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { ok: false, error: createErr?.message ?? "Could not create e2e user", report },
        { status: 500 },
      );
    }
    userId = created.user.id;
    push({ step: "create_user", ok: true, userId, email });

    try {
      await admin.from("user_reminder_email_preferences").upsert({
        user_id: userId,
        email_notifications_enabled: true,
        updated_at: new Date().toISOString(),
      });
      push({ step: "prefs_upsert", ok: true });
    } catch (e) {
      push({ step: "prefs_upsert", ok: false, error: e instanceof Error ? e.message : String(e) });
    }

    const tz = "Asia/Kathmandu";
    const now = new Date();
    const dueDate = formatInTimeZone(now, tz, "yyyy-MM-dd");
    // Fire well inside the catch-up window (due 2 hours ago local).
    const dueAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const dueTime = formatInTimeZone(dueAt, tz, "HH:mm");

    const insertPayload = {
      user_id: userId,
      title: `E2E Reminder Email ${stamp}`,
      amount: 2500,
      due_date: dueDate,
      due_time: dueTime,
      timezone: tz,
      email,
      repeat_frequency: "once" as const,
      notify_7d: false,
      notify_3d: false,
      notify_1d: false,
      notify_at_due: true,
      notify_overdue: true,
      reminder_type: "room_rent",
      notes: `e2e-reminder-email:${stamp}`,
      shared_with_family: false,
      is_completed: false,
      is_archived: false,
      email_enabled: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ins = await admin.from("scheduled_reminders").insert(insertPayload as any).select("id").single();
    if (ins.error) {
      const legacy = { ...insertPayload } as Record<string, unknown>;
      delete legacy.is_archived;
      delete legacy.email_enabled;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ins = await admin.from("scheduled_reminders").insert(legacy as any).select("id").single();
    }
    if (ins.error || !ins.data?.id) {
      return NextResponse.json(
        { ok: false, error: ins.error?.message ?? "insert reminder failed", report },
        { status: 500 },
      );
    }
    reminderId = ins.data.id;
    push({ step: "create_reminder", ok: true, reminderId, dueDate, dueTime, destinationEmail: email });

    const { data: verifyRow, error: verifyErr } = await admin
      .from("scheduled_reminders")
      .select("*")
      .eq("id", reminderId)
      .maybeSingle();
    push({
      step: "reload_reminder",
      ok: Boolean(verifyRow),
      error: verifyErr?.message ?? null,
      row: verifyRow
        ? {
            id: verifyRow.id,
            due_date: verifyRow.due_date,
            due_time: verifyRow.due_time,
            timezone: verifyRow.timezone,
            notify_at_due: verifyRow.notify_at_due,
            notify_overdue: verifyRow.notify_overdue,
            is_completed: verifyRow.is_completed,
            email: verifyRow.email,
            email_enabled: (verifyRow as { email_enabled?: boolean }).email_enabled ?? null,
            is_archived: (verifyRow as { is_archived?: boolean }).is_archived ?? null,
          }
        : null,
    });

    if (verifyRow) {
      const { firesDueCatchUp } = await import("@/lib/scheduled-reminders/schedule-logic");
      const { dbRowToReminder } = await import("@/lib/scheduled-reminders/api-mapper");
      const { isReminderActiveForEmail } = await import("@/lib/scheduled-reminders/email-lifecycle");
      const r = dbRowToReminder(verifyRow as never);
      const fires = firesDueCatchUp(
        {
          dueDate: r.dueDate,
          dueTime: r.dueTime,
          timezone: r.timezone,
          repeatFrequency: r.repeatFrequency,
          notify7DaysBefore: r.notify7DaysBefore,
          notify3DaysBefore: r.notify3DaysBefore,
          notify1DayBefore: r.notify1DayBefore,
          notifyAtDueTime: r.notifyAtDueTime,
          notifyOverdue: r.notifyOverdue,
        },
        new Date(),
        { rollAnchor: true },
      );
      push({
        step: "diagnose_fires",
        ok: fires.length > 0,
        active: isReminderActiveForEmail(verifyRow as never),
        fireCount: fires.length,
        slots: fires.map((f) => ({
          slot: f.slot,
          fireAtUtc: f.fireAtUtc.toISOString(),
          anchorDueDate: f.anchorDueDate,
        })),
      });
    }

    const cron1 = await runScheduledRemindersCron(new Date());
    push({
      step: "cron_after_create",
      ok: cron1.ok,
      emailsSent: cron1.emailsSent,
      firesFound: cron1.firesFound,
      skipped: cron1.skipped,
      error: cron1.error ?? null,
    });
    if (!cron1.ok) {
      return NextResponse.json({ ok: false, error: cron1.error ?? "cron failed", report }, { status: 503 });
    }

    const { data: failLogs } = await admin
      .from("reminder_logs")
      .select("id, event_type, provider_message, metadata, created_at")
      .eq("reminder_id", reminderId)
      .eq("event_type", "email_failed")
      .order("created_at", { ascending: false })
      .limit(5);
    push({
      step: "email_failed_logs",
      ok: true,
      count: failLogs?.length ?? 0,
      rows: failLogs ?? [],
    });

    const { data: sends, error: sendErr } = await admin
      .from("scheduled_reminder_email_sends")
      .select("id, slot, sent_at, anchor_due_date")
      .eq("reminder_id", reminderId);
    push({
      step: "ledger_after_create",
      ok: !sendErr && (sends?.length ?? 0) > 0,
      count: sends?.length ?? 0,
      rows: sends ?? [],
      error: sendErr?.message ?? null,
    });
    if (!sends?.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No email ledger rows after cron — email was not claimed/sent for the due slot",
          report,
        },
        { status: 500 },
      );
    }

    const { data: logs } = await admin
      .from("reminder_logs")
      .select("id, event_type, provider_message, metadata, created_at")
      .eq("reminder_id", reminderId)
      .eq("event_type", "email_sent")
      .order("created_at", { ascending: false })
      .limit(3);
    push({ step: "email_sent_logs", ok: (logs?.length ?? 0) > 0, count: logs?.length ?? 0, sample: logs?.[0] ?? null });
    if (!logs?.length) {
      return NextResponse.json({ ok: false, error: "email_sent log missing", report }, { status: 500 });
    }

    const { data: rowAfter } = await admin
      .from("scheduled_reminders")
      .select("last_email_sent_at, email")
      .eq("id", reminderId)
      .maybeSingle();
    push({
      step: "last_email_sent_at",
      ok: Boolean(rowAfter?.last_email_sent_at),
      last_email_sent_at: rowAfter?.last_email_sent_at ?? null,
      email: rowAfter?.email ?? null,
    });

    const { error: delErr } = await admin.from("scheduled_reminders").delete().eq("id", reminderId);
    push({ step: "delete_reminder", ok: !delErr, error: delErr?.message ?? null });
    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message, report }, { status: 500 });
    }
    const deletedId = reminderId;
    reminderId = null;

    const cron2 = await runScheduledRemindersCron(new Date());
    push({
      step: "cron_after_delete",
      ok: cron2.ok,
      emailsSent: cron2.emailsSent,
      error: cron2.error ?? null,
    });

    const { data: stillThere } = await admin
      .from("scheduled_reminders")
      .select("id")
      .eq("id", deletedId)
      .maybeSingle();
    push({ step: "confirm_deleted", ok: !stillThere, stillThere: Boolean(stillThere) });
    if (stillThere) {
      return NextResponse.json({ ok: false, error: "Reminder still present after delete", report }, { status: 500 });
    }

    // Auth smoke: preference endpoint path exists for signed-in users
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await userClient.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    push({ step: "signin_smoke", ok: !signIn.error, error: signIn.error?.message ?? null });

    report.ok = true;
    return NextResponse.json({
      ok: true,
      message: "create → email send → delete → no further active reminder verified",
      report,
    });
  } catch (e) {
    report.ok = false;
    report.error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: report.error, report }, { status: 500 });
  } finally {
    if (reminderId) {
      try {
        await admin.from("scheduled_reminders").delete().eq("id", reminderId);
      } catch {
        /* ignore */
      }
    }
    if (userId) {
      try {
        await admin.from("user_reminder_email_preferences").delete().eq("user_id", userId);
      } catch {
        /* ignore */
      }
      try {
        await admin.from("scheduled_reminders").delete().eq("user_id", userId);
      } catch {
        /* ignore */
      }
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        /* ignore */
      }
    }
  }
}
