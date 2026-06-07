import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { ScheduledReminderDbRow } from "@/lib/scheduled-reminders/api-mapper";
import { dbRowToReminder } from "@/lib/scheduled-reminders/api-mapper";
import {
  firesDueCatchUp,
  type ScheduledReminderShape,
} from "@/lib/scheduled-reminders/schedule-logic";

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

export async function runScheduledRemindersCron(nowUtc = new Date()): Promise<{
  ok: boolean;
  remindersChecked: number;
  emailsSent: number;
  skipped: number;
  error?: string;
}> {
  const sb = createSupabaseServiceRoleClient();
  if (!sb) {
    return { ok: false, remindersChecked: 0, emailsSent: 0, skipped: 0, error: "Missing Supabase service role or URL" };
  }

  const { data: rows, error: listErr } = await sb
    .from("scheduled_reminders")
    .select("*")
    .eq("is_completed", false);

  if (listErr) {
    return { ok: false, remindersChecked: 0, emailsSent: 0, skipped: 0, error: listErr.message };
  }

  const list = (rows ?? []) as ScheduledReminderDbRow[];
  let emailsSent = 0;
  let skipped = 0;

  for (const row of list) {
    const shape = rowToShape(row);
    const fires = firesDueCatchUp(shape, nowUtc, { rollAnchor: true });
    if (!fires.length) continue;

    const r = dbRowToReminder(row);
    const amountLine =
      r.amountNpr != null && Number.isFinite(r.amountNpr) ? `Amount: NPR ${r.amountNpr.toLocaleString("en-IN")}` : "";

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
        if (insErr?.code === "23505" || insErr?.message?.includes("duplicate") || insErr?.message?.includes("unique")) {
          skipped += 1;
          continue;
        }
        if (insErr) {
          skipped += 1;
          continue;
        }
        skipped += 1;
        continue;
      }

      const sendId = sendRow.id as string;
      const to = row.email.trim();
      if (!to) {
        await sb.from("scheduled_reminder_email_sends").delete().eq("id", sendId);
        skipped += 1;
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

      const res = await sendEmailViaResend({
        from: resolveResendFromAddress(),
        to: [to],
        subject,
        html,
        text,
      });
      if (!res.ok) {
        await sb.from("reminder_logs").insert({
          reminder_id: row.id,
          user_id: row.user_id,
          event_type: "email_failed",
          provider_message: res.message.slice(0, 2000),
          metadata: { slot: fire.slot, anchorDueDate: fire.anchorDueDate },
        });
        await sb.from("scheduled_reminder_email_sends").delete().eq("id", sendId);
        skipped += 1;
        continue;
      }
      emailsSent += 1;
    }
  }

  return { ok: true, remindersChecked: list.length, emailsSent, skipped };
}
