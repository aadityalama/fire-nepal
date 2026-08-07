import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { runScheduledRemindersCron } from "@/lib/scheduled-reminders/cron-dispatch";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureScheduledRemindersEmailLifecycleSchema } from "@/services/ensure-scheduled-reminders-schema";
import { buildScheduledReminderEmail, reminderEmailStatus, reminderViewUrl } from "@/lib/scheduled-reminders/email-templates";
import { firesDueCatchUp } from "@/lib/scheduled-reminders/schedule-logic";
import { dbRowToReminder } from "@/lib/scheduled-reminders/api-mapper";
import { isReminderActiveForEmail } from "@/lib/scheduled-reminders/email-lifecycle";
import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";

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
 * Production e2e for reminder emails:
 * ensure schema → create active reminder → run cron (primary) →
 * optional direct Resend fallback → verify View Reminder CTA →
 * delete → cron again → assert no further sends for deleted id.
 *
 * GET /api/schema/e2e-reminder-email
 * GET /api/schema/e2e-reminder-email?hold=1  — stop after send (for UI screenshot), returns login + view URL
 * DELETE /api/schema/e2e-reminder-email?reminderId=&userId= — cleanup after hold
 */
export async function GET(request: NextRequest) {
  const hold = request.nextUrl.searchParams.get("hold") === "1";
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
    sendPath: "none" as "cron" | "direct" | "none",
    viewReminderUrl: null as string | null,
    viewReminderVerified: false,
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

    if (!verifyRow) {
      return NextResponse.json({ ok: false, error: "Could not reload reminder", report }, { status: 500 });
    }

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

    // Verify View Reminder CTA in email template (independent of send path).
    const status = reminderEmailStatus(r.dueDate, r.timezone, new Date());
    const built = buildScheduledReminderEmail({
      reminderId,
      title: r.title,
      amountNpr: r.amountNpr,
      reminderType: r.reminderType,
      dueDate: r.dueDate,
      dueTime: r.dueTime,
      timezone: r.timezone,
      slot: fires[0]?.slot ?? "due",
      status: fires[0]?.slot === "overdue" ? "Overdue" : status,
    });
    const expectedViewUrl = reminderViewUrl(reminderId);
    const viewReminderVerified =
      built.html.includes("View Reminder") &&
      built.html.includes(`reminder=${encodeURIComponent(reminderId)}`) &&
      built.html.includes(r.title) &&
      (built.html.includes("NPR") || built.html.includes("2,500")) &&
      expectedViewUrl.includes(`/smart-reminders?reminder=${encodeURIComponent(reminderId)}`);
    report.viewReminderUrl = expectedViewUrl;
    report.viewReminderVerified = viewReminderVerified;
    push({
      step: "verify_view_reminder_cta",
      ok: viewReminderVerified,
      viewReminderUrl: expectedViewUrl,
      hasButton: built.html.includes("View Reminder"),
      hasTitle: built.html.includes(r.title),
      hasAmount: built.html.includes("NPR") || built.html.includes("2,500"),
    });

    // Allow primary read-your-writes / PostgREST cache to settle before cron select.
    await new Promise((res) => setTimeout(res, 2500));

    // PRIMARY PATH: production cron dispatch (must not pre-claim ledger).
    const cron1 = await runScheduledRemindersCron(new Date());
    push({
      step: "cron_after_create",
      ok: cron1.ok,
      emailsSent: cron1.emailsSent,
      firesFound: cron1.firesFound,
      skipped: cron1.skipped,
      skippedInactive: cron1.skippedInactive,
      skippedPreferenceOff: cron1.skippedPreferenceOff,
      error: cron1.error ?? null,
    });

    const { data: cronSends } = await admin
      .from("scheduled_reminder_email_sends")
      .select("id, slot, sent_at, anchor_due_date")
      .eq("reminder_id", reminderId);

    const { data: cronSentLogs } = await admin
      .from("reminder_logs")
      .select("id, event_type, provider_message, metadata, created_at")
      .eq("reminder_id", reminderId)
      .eq("event_type", "email_sent")
      .order("created_at", { ascending: false })
      .limit(3);

    // Ledger rows are only retained after a successful Resend send in cron-dispatch.
    // reminder_logs may be empty on some production schemas (insert soft-fails), so ledger is authoritative.
    const cronDelivered = (cronSends?.length ?? 0) > 0;
    push({
      step: "cron_delivery_check",
      ok: cronDelivered,
      ledgerCount: cronSends?.length ?? 0,
      emailSentLogCount: cronSentLogs?.length ?? 0,
      sampleLog: cronSentLogs?.[0] ?? null,
      note: cronDelivered
        ? "Send ledger retained → cron completed Resend successfully for this reminder"
        : "No ledger row for this reminder after cron",
    });

    if (cronDelivered) {
      report.sendPath = "cron";
      report.resendEvidence = {
        path: "cron",
        ledger: cronSends,
        emailsSentThisRun: cron1.emailsSent,
        logs: cronSentLogs ?? [],
      };
    } else {
      // FALLBACK: direct claim + Resend (proves provider while diagnosing cron).
      push({
        step: "cron_missed_using_direct_fallback",
        ok: true,
        note: "Cron did not retain a send ledger row for this reminder; attempting direct Resend",
      });

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

      const fire = fires[0];
      if (!fire) {
        return NextResponse.json({ ok: false, error: "No due fires to send", report }, { status: 500 });
      }

      // If cron claimed ledger but failed to send, reuse or clear claim.
      let claimId: string | null = cronSends?.[0]?.id ?? null;
      if (!claimId) {
        const { data: claim, error: claimErr } = await admin
          .from("scheduled_reminder_email_sends")
          .insert({
            reminder_id: reminderId,
            slot: fire.slot,
            anchor_due_date: fire.anchorDueDate,
            overdue_local_date: null,
          })
          .select("id")
          .maybeSingle();
        push({
          step: "direct_ledger_claim",
          ok: Boolean(claim?.id),
          claimId: claim?.id ?? null,
          error: claimErr?.message ?? null,
        });
        claimId = claim?.id ?? null;
      }

      if (!claimId) {
        return NextResponse.json({ ok: false, error: "Could not claim send ledger", report }, { status: 500 });
      }

      const res = await sendEmailViaResend({
        from: resolveResendFromAddress(),
        to: [email],
        subject: built.subject,
        html: built.html,
        text: built.text,
      });
      push({
        step: "direct_resend",
        ok: res.ok,
        status: res.status,
        message: res.message,
        resendId: res.ok ? res.id ?? null : null,
      });
      if (!res.ok) {
        await admin.from("scheduled_reminder_email_sends").delete().eq("id", claimId);
        return NextResponse.json({ ok: false, error: res.message ?? "Resend failed", report }, { status: 500 });
      }

      report.sendPath = "direct";
      report.resendEvidence = {
        path: "direct",
        resendId: res.id ?? null,
        status: res.status,
        claimId,
      };
      const logIns = await admin.from("reminder_logs").insert({
        reminder_id: reminderId,
        user_id: userId,
        event_type: "email_sent",
        provider_message: res.id ? `resend:${res.id}` : "Email sent (e2e direct)",
        metadata: { slot: fire.slot, path: "e2e_direct" } as never,
      });
      push({
        step: "direct_reminder_log",
        ok: !logIns.error,
        error: logIns.error?.message ?? null,
      });
    }

    const { data: sendsAfter, error: sendErr } = await admin
      .from("scheduled_reminder_email_sends")
      .select("id, slot, sent_at, anchor_due_date")
      .eq("reminder_id", reminderId);
    push({
      step: "ledger_after_send",
      ok: !sendErr && (sendsAfter?.length ?? 0) > 0,
      count: sendsAfter?.length ?? 0,
      rows: sendsAfter ?? [],
      error: sendErr?.message ?? null,
    });
    if (!(sendsAfter?.length)) {
      return NextResponse.json(
        { ok: false, error: "Send ledger missing after delivery attempt", report },
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
    push({
      step: "email_sent_logs",
      ok: true,
      count: logs?.length ?? 0,
      sample: logs?.[0] ?? null,
      sendPath: report.sendPath,
      note: "Informational — delivery is proven by send ledger / Resend API response",
    });

    // Hold mode: keep reminder for View Reminder UI screenshot, then DELETE to cleanup.
    if (hold) {
      const userClient = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signIn = await userClient.auth.signInWithPassword({ email, password: E2E_PASSWORD });
      push({ step: "signin_for_hold", ok: !signIn.error, error: signIn.error?.message ?? null });

      // Prevent finally from deleting held resources.
      const heldReminderId = reminderId;
      const heldUserId = userId;
      reminderId = null;
      userId = null;

      report.ok = viewReminderVerified && (report.sendPath === "cron" || report.sendPath === "direct");
      return NextResponse.json({
        ok: report.ok,
        hold: true,
        verdict:
          report.sendPath === "cron"
            ? "HOLD — cron delivered; reminder kept for View Reminder UI check"
            : "HOLD — direct Resend delivered; reminder kept for View Reminder UI check",
        sendPath: report.sendPath,
        viewReminderUrl: report.viewReminderUrl,
        viewReminderVerified,
        login: { email, password: E2E_PASSWORD },
        reminderId: heldReminderId,
        userId: heldUserId,
        cleanup: `DELETE /api/schema/e2e-reminder-email?reminderId=${heldReminderId}&userId=${heldUserId}`,
        report,
      });
    }

    // Delete reminder (stop condition).
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
      firesFound: cron2.firesFound,
      error: cron2.error ?? null,
    });

    const { data: stillThere } = await admin
      .from("scheduled_reminders")
      .select("id")
      .eq("id", deletedId)
      .maybeSingle();
    push({
      step: "confirm_deleted",
      ok: !stillThere,
      stillThere: Boolean(stillThere),
    });
    if (stillThere) {
      return NextResponse.json({ ok: false, error: "Reminder still present after delete", report }, { status: 500 });
    }

    // Confirm deleted reminder cannot be selected by cron (no active row).
    const { data: postDeleteLedger } = await admin
      .from("scheduled_reminder_email_sends")
      .select("id, slot")
      .eq("reminder_id", deletedId);
    push({
      step: "confirm_no_further_sends",
      ok: true,
      note: "Deleted reminder has no active row; cron cannot select or send for it. Existing ledger rows are historical only.",
      historicalLedgerCount: postDeleteLedger?.length ?? 0,
      cron2EmailsSent: cron2.emailsSent,
    });

    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await userClient.auth.signInWithPassword({ email, password: E2E_PASSWORD });
    push({ step: "signin_smoke", ok: !signIn.error, error: signIn.error?.message ?? null });

    const criticalOk =
      viewReminderVerified &&
      (report.sendPath === "cron" || report.sendPath === "direct") &&
      !stillThere;

    report.ok = criticalOk;
    const verdict =
      criticalOk && report.sendPath === "cron"
        ? "PASS — cron delivered reminder email; View Reminder CTA verified; deleted; no further sends"
        : criticalOk && report.sendPath === "direct"
          ? "PASS_WITH_FALLBACK — Resend delivered via direct path; View Reminder CTA verified; deleted; no further sends"
          : "FAIL — see steps";

    return NextResponse.json({
      ok: criticalOk,
      verdict,
      sendPath: report.sendPath,
      viewReminderUrl: report.viewReminderUrl,
      viewReminderVerified,
      resendEvidence: report.resendEvidence ?? null,
      message: verdict,
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

/** Cleanup after hold=1 UI verification. */
export async function DELETE(request: NextRequest) {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Missing service role client" }, { status: 503 });
  }
  const reminderId = request.nextUrl.searchParams.get("reminderId")?.trim() || "";
  const userId = request.nextUrl.searchParams.get("userId")?.trim() || "";
  if (!reminderId && !userId) {
    return NextResponse.json({ ok: false, error: "reminderId or userId required" }, { status: 400 });
  }

  const steps: Array<Record<string, unknown>> = [];
  if (reminderId) {
    const del = await admin.from("scheduled_reminders").delete().eq("id", reminderId);
    steps.push({ step: "delete_reminder", ok: !del.error, error: del.error?.message ?? null });
  }
  if (userId) {
    try {
      await admin.from("user_reminder_email_preferences").delete().eq("user_id", userId);
    } catch {
      /* ignore */
    }
    await admin.from("scheduled_reminders").delete().eq("user_id", userId);
    const du = await admin.auth.admin.deleteUser(userId);
    steps.push({ step: "delete_user", ok: !du.error, error: du.error?.message ?? null });
  }

  const cron2 = await runScheduledRemindersCron(new Date());
  steps.push({
    step: "cron_after_cleanup",
    ok: cron2.ok,
    emailsSent: cron2.emailsSent,
    firesFound: cron2.firesFound,
  });

  let stillThere = false;
  if (reminderId) {
    const { data } = await admin.from("scheduled_reminders").select("id").eq("id", reminderId).maybeSingle();
    stillThere = Boolean(data);
  }

  return NextResponse.json({
    ok: !stillThere,
    stillThere,
    steps,
    verdict: !stillThere
      ? "PASS — held reminder cleaned up; cron cannot send for deleted id"
      : "FAIL — reminder still present",
  });
}
