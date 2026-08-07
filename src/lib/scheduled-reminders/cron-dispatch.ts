import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { ScheduledReminderDbRow } from "@/lib/scheduled-reminders/api-mapper";
import { dbRowToReminder } from "@/lib/scheduled-reminders/api-mapper";
import {
  getUserEmailNotificationsEnabled,
  isReminderActiveForEmail,
} from "@/lib/scheduled-reminders/email-lifecycle";
import {
  buildScheduledReminderEmail,
  reminderEmailStatus,
} from "@/lib/scheduled-reminders/email-templates";
import {
  firesDueCatchUp,
  rollForwardDueYmdIfNeeded,
  type ScheduledReminderShape,
} from "@/lib/scheduled-reminders/schedule-logic";

const LOG_PREFIX = "[reminders/cron]";

function rowToShape(row: ScheduledReminderDbRow): ScheduledReminderShape {
  const r = dbRowToReminder(row);
  return {
    dueDate: r.dueDate,
    dueTime: r.dueTime,
    timezone: r.timezone,
    repeatFrequency: r.repeatFrequency,
    notify7DaysBefore: r.notify7DaysBefore,
    notify3DaysBefore: r.notify3DaysBefore,
    notify1DayBefore: r.notify1DayBefore,
    notifyAtDueTime: r.notifyAtDueTime,
    notifyOverdue: r.notifyOverdue,
  };
}

function isUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const msg = err.message ?? "";
  return msg.includes("duplicate") || msg.includes("unique");
}

type ServiceSb = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

async function writeReminderLog(
  sb: ServiceSb,
  input: {
    reminder_id?: string | null;
    user_id?: string | null;
    event_type: "email_sent" | "email_failed" | "cron_started" | "cron_completed" | "other";
    provider_message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await sb.from("reminder_logs").insert({
    reminder_id: input.reminder_id ?? null,
    user_id: input.user_id ?? null,
    event_type: input.event_type,
    provider_message: input.provider_message?.slice(0, 2000) ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
  if (error) {
    console.error(`${LOG_PREFIX} reminder_logs insert failed:`, error.message);
  }
}

async function resolveAuthUserEmail(sb: ServiceSb, userId: string, fallback: string): Promise<string> {
  try {
    const { data, error } = await sb.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return fallback.trim().toLowerCase();
    return data.user.email.trim().toLowerCase();
  } catch {
    return fallback.trim().toLowerCase();
  }
}

export type ScheduledRemindersCronResult = {
  ok: boolean;
  remindersChecked: number;
  emailsSent: number;
  skipped: number;
  firesFound: number;
  skippedInactive: number;
  skippedPreferenceOff: number;
  resendConfigured: boolean;
  fromAddress: string;
  nowUtc: string;
  error?: string;
};

export async function runScheduledRemindersCron(nowUtc = new Date()): Promise<ScheduledRemindersCronResult> {
  const fromAddress = resolveResendFromAddress();
  const resendConfigured = isResendApiKeyConfigured();
  const baseMeta = {
    remindersChecked: 0,
    emailsSent: 0,
    skipped: 0,
    firesFound: 0,
    skippedInactive: 0,
    skippedPreferenceOff: 0,
    resendConfigured,
    fromAddress,
    nowUtc: nowUtc.toISOString(),
  };

  console.info(`${LOG_PREFIX} start`, {
    nowUtc: baseMeta.nowUtc,
    resendConfigured,
    fromAddress,
  });

  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    const error = "Missing Supabase service role or URL";
    console.error(`${LOG_PREFIX} abort:`, error);
    return { ok: false, ...baseMeta, error };
  }

  if (!resendConfigured) {
    const error = "RESEND_API_KEY is not configured — reminder emails cannot be delivered";
    console.error(`${LOG_PREFIX} abort:`, error);
    await writeReminderLog(sb, {
      event_type: "cron_started",
      provider_message: error,
      metadata: { phase: "resend_missing", nowUtc: baseMeta.nowUtc },
    });
    return { ok: false, ...baseMeta, error };
  }

  await writeReminderLog(sb, {
    event_type: "cron_started",
    provider_message: "scheduled reminders cron started",
    metadata: { nowUtc: baseMeta.nowUtc, fromAddress },
  });

  const { data: rows, error: listErr } = await sb
    .from("scheduled_reminders")
    .select("*")
    .eq("is_completed", false);

  if (listErr) {
    console.error(`${LOG_PREFIX} fetch failed:`, listErr.message);
    await writeReminderLog(sb, {
      event_type: "cron_completed",
      provider_message: listErr.message,
      metadata: { ok: false, phase: "fetch" },
    });
    return { ok: false, ...baseMeta, error: listErr.message };
  }

  const list = (rows ?? []) as ScheduledReminderDbRow[];
  let emailsSent = 0;
  let skipped = 0;
  let firesFound = 0;
  let skippedInactive = 0;
  let skippedPreferenceOff = 0;

  const prefCache = new Map<string, boolean>();

  console.info(`${LOG_PREFIX} fetched incomplete reminders:`, list.length);

  for (const row of list) {
    if (!isReminderActiveForEmail(row)) {
      skippedInactive += 1;
      skipped += 1;
      continue;
    }

    let prefsOn = prefCache.get(row.user_id);
    if (prefsOn === undefined) {
      prefsOn = await getUserEmailNotificationsEnabled(sb as never, row.user_id);
      prefCache.set(row.user_id, prefsOn);
    }
    if (!prefsOn) {
      skippedPreferenceOff += 1;
      skipped += 1;
      continue;
    }

    const shape = rowToShape(row);
    const rolledDue =
      shape.repeatFrequency !== "once"
        ? rollForwardDueYmdIfNeeded(shape.dueDate, shape.repeatFrequency, nowUtc, shape.timezone)
        : shape.dueDate;

    if (rolledDue !== row.due_date) {
      const { error: rollErr } = await sb
        .from("scheduled_reminders")
        .update({ due_date: rolledDue, updated_at: nowUtc.toISOString() })
        .eq("id", row.id);
      if (rollErr) {
        console.warn(`${LOG_PREFIX} could not persist rolled due_date for ${row.id}:`, rollErr.message);
      } else {
        row.due_date = rolledDue;
        console.info(`${LOG_PREFIX} rolled due_date`, { id: row.id, from: shape.dueDate, to: rolledDue });
      }
    }

    const fires = firesDueCatchUp(rowToShape(row), nowUtc, { rollAnchor: true });
    if (!fires.length) continue;
    firesFound += fires.length;

    const r = dbRowToReminder(row);
    const status = reminderEmailStatus(r.dueDate, r.timezone, nowUtc);
    const to = await resolveAuthUserEmail(sb, row.user_id, row.email);

    console.info(`${LOG_PREFIX} reminder due fires`, {
      id: row.id,
      title: r.title,
      timezone: r.timezone,
      dueDate: r.dueDate,
      dueTime: r.dueTime,
      fireCount: fires.length,
      slots: fires.map((f) => f.slot),
      to,
    });

    for (const fire of fires) {
      // Re-check active right before claim (completed/deleted/archived/disabled mid-run).
      // Use select("*") so environments without lifecycle columns still work.
      const { data: fresh, error: freshErr } = await sb
        .from("scheduled_reminders")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      if (freshErr) {
        console.warn(`${LOG_PREFIX} fresh active check failed; falling back to in-memory row`, {
          reminderId: row.id,
          message: freshErr.message,
        });
      }
      const activeRow = (fresh as ScheduledReminderDbRow | null) ?? row;
      if (!isReminderActiveForEmail(activeRow)) {
        skippedInactive += 1;
        skipped += 1;
        console.info(`${LOG_PREFIX} skip inactive before send`, { reminderId: row.id, slot: fire.slot });
        continue;
      }

      const overdueLocal = fire.slot === "overdue" ? fire.overdueLocalDate : null;

      const { data: sendRow, error: insErr } = await sb
        .from("scheduled_reminder_email_sends")
        .insert({
          reminder_id: row.id,
          slot: fire.slot,
          anchor_due_date: fire.anchorDueDate,
          overdue_local_date: overdueLocal,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !sendRow) {
        if (isUniqueViolation(insErr)) {
          skipped += 1;
          console.info(`${LOG_PREFIX} skip duplicate send`, {
            reminderId: row.id,
            slot: fire.slot,
            anchorDueDate: fire.anchorDueDate,
            overdueLocalDate: overdueLocal,
          });
          continue;
        }
        skipped += 1;
        console.error(`${LOG_PREFIX} send ledger insert failed`, {
          reminderId: row.id,
          slot: fire.slot,
          message: insErr?.message ?? "insert returned no row (check service role + RLS)",
        });
        await writeReminderLog(sb, {
          reminder_id: row.id,
          user_id: row.user_id,
          event_type: "other",
          provider_message: insErr?.message ?? "send ledger insert returned no row",
          metadata: { slot: fire.slot, anchorDueDate: fire.anchorDueDate, phase: "dedupe_insert" },
        });
        continue;
      }

      const sendId = sendRow.id as string;
      if (!to) {
        await sb.from("scheduled_reminder_email_sends").delete().eq("id", sendId);
        skipped += 1;
        console.warn(`${LOG_PREFIX} skip empty email`, { reminderId: row.id, slot: fire.slot });
        await writeReminderLog(sb, {
          reminder_id: row.id,
          user_id: row.user_id,
          event_type: "email_failed",
          provider_message: "Reminder has empty email address",
          metadata: { slot: fire.slot, anchorDueDate: fire.anchorDueDate },
        });
        continue;
      }

      const built = buildScheduledReminderEmail({
        reminderId: row.id,
        title: r.title,
        amountNpr: r.amountNpr,
        reminderType: r.reminderType,
        dueDate: r.dueDate,
        dueTime: r.dueTime,
        timezone: r.timezone,
        slot: fire.slot,
        status: fire.slot === "overdue" ? "Overdue" : status,
      });

      console.info(`${LOG_PREFIX} sending via Resend`, {
        reminderId: row.id,
        to,
        slot: fire.slot,
        fireAtUtc: fire.fireAtUtc.toISOString(),
        from: fromAddress,
      });

      const res = await sendEmailViaResend({
        from: fromAddress,
        to: [to],
        subject: built.subject,
        html: built.html,
        text: built.text,
      });
      if (!res.ok) {
        await writeReminderLog(sb, {
          reminder_id: row.id,
          user_id: row.user_id,
          event_type: "email_failed",
          provider_message: res.message,
          metadata: {
            slot: fire.slot,
            anchorDueDate: fire.anchorDueDate,
            status: res.status,
            fireAtUtc: fire.fireAtUtc.toISOString(),
          },
        });
        await sb.from("scheduled_reminder_email_sends").delete().eq("id", sendId);
        skipped += 1;
        console.error(`${LOG_PREFIX} Resend failed`, {
          reminderId: row.id,
          slot: fire.slot,
          status: res.status,
          message: res.message,
        });
        continue;
      }

      const sentAt = nowUtc.toISOString();
      const { error: lastSentErr } = await sb
        .from("scheduled_reminders")
        .update({ last_email_sent_at: sentAt, email: to, updated_at: sentAt })
        .eq("id", row.id);
      if (lastSentErr) {
        // Lifecycle column may be absent until migration is applied.
        const { error: emailOnlyErr } = await sb
          .from("scheduled_reminders")
          .update({ email: to, updated_at: sentAt })
          .eq("id", row.id);
        if (emailOnlyErr) {
          console.warn(`${LOG_PREFIX} could not persist last_email_sent_at/email`, {
            reminderId: row.id,
            message: lastSentErr.message,
            fallback: emailOnlyErr.message,
          });
        }
      }

      await writeReminderLog(sb, {
        reminder_id: row.id,
        user_id: row.user_id,
        event_type: "email_sent",
        provider_message: res.id ? `resend:${res.id}` : "Email sent",
        metadata: {
          slot: fire.slot,
          anchorDueDate: fire.anchorDueDate,
          overdueLocalDate: overdueLocal,
          fireAtUtc: fire.fireAtUtc.toISOString(),
          resendId: res.id ?? null,
          to,
          status: built.subject,
          lastEmailSentAt: sentAt,
        },
      });
      emailsSent += 1;
      console.info(`${LOG_PREFIX} email sent`, {
        reminderId: row.id,
        slot: fire.slot,
        resendId: res.id ?? null,
      });
    }
  }

  const result: ScheduledRemindersCronResult = {
    ok: true,
    remindersChecked: list.length,
    emailsSent,
    skipped,
    firesFound,
    skippedInactive,
    skippedPreferenceOff,
    resendConfigured,
    fromAddress,
    nowUtc: baseMeta.nowUtc,
  };

  await writeReminderLog(sb, {
    event_type: "cron_completed",
    provider_message: `checked=${result.remindersChecked} fires=${result.firesFound} sent=${result.emailsSent} skipped=${result.skipped}`,
    metadata: { ...result },
  });

  console.info(`${LOG_PREFIX} complete`, result);
  return result;
}
