import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { ScheduledReminderDbRow } from "@/lib/scheduled-reminders/api-mapper";
import { dbRowToReminder } from "@/lib/scheduled-reminders/api-mapper";
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

function slotLabel(slot: string): string {
  switch (slot) {
    case "d7":
      return "7 days before due";
    case "d3":
      return "3 days before due";
    case "d1":
      return "1 day before due";
    case "due":
      return "Due now";
    case "overdue":
      return "Overdue reminder";
    default:
      return slot;
  }
}

function buildEmailHtml(input: {
  title: string;
  amountLine: string;
  dueDate: string;
  dueTime: string;
  timezone: string;
  slot: string;
}): string {
  const slot = slotLabel(input.slot);
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
  <h2 style="margin:0 0 8px">FIRE Nepal reminder</h2>
  <p style="margin:0 0 12px"><strong>${escapeHtml(input.title)}</strong></p>
  <p style="margin:0 0 8px">${escapeHtml(slot)}</p>
  <p style="margin:0 0 8px">Due: <strong>${escapeHtml(input.dueDate)}</strong> at <strong>${escapeHtml(input.dueTime)}</strong> (${escapeHtml(input.timezone)})</p>
  ${input.amountLine ? `<p style="margin:0 0 8px">${escapeHtml(input.amountLine)}</p>` : ""}
  <p style="margin:16px 0 0;font-size:13px;color:#64748b">Sent automatically by FIRE Nepal Smart Reminders.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export type ScheduledRemindersCronResult = {
  ok: boolean;
  remindersChecked: number;
  emailsSent: number;
  skipped: number;
  firesFound: number;
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

  console.info(`${LOG_PREFIX} fetched incomplete reminders:`, list.length);

  for (const row of list) {
    const shape = rowToShape(row);
    const rolledDue =
      shape.repeatFrequency !== "once"
        ? rollForwardDueYmdIfNeeded(shape.dueDate, shape.repeatFrequency, nowUtc, shape.timezone)
        : shape.dueDate;

    // Persist rolled recurring anchors so admin/UI stay aligned with catch-up math.
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
    const amountLine =
      r.amountNpr != null && Number.isFinite(r.amountNpr) ? `Amount: NPR ${r.amountNpr.toLocaleString("en-IN")}` : "";

    console.info(`${LOG_PREFIX} reminder due fires`, {
      id: row.id,
      title: r.title,
      timezone: r.timezone,
      dueDate: r.dueDate,
      dueTime: r.dueTime,
      fireCount: fires.length,
      slots: fires.map((f) => f.slot),
    });

    for (const fire of fires) {
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
      const to = (row.email ?? "").trim();
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

      const subject = `FIRE Nepal · ${r.title} (${slotLabel(fire.slot)})`;
      const html = buildEmailHtml({
        title: r.title,
        amountLine,
        dueDate: r.dueDate,
        dueTime: r.dueTime,
        timezone: r.timezone,
        slot: fire.slot,
      });
      const text = `${r.title}\n${slotLabel(fire.slot)}\nDue ${r.dueDate} ${r.dueTime} (${r.timezone})\n${amountLine}`;

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
        subject,
        html,
        text,
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
