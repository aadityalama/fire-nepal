import { REMINDER_TYPE_LABEL } from "@/components/smart-reminders/reminder-labels";
import type { ReminderType } from "@/lib/smart-reminders/types";
import { getSiteOrigin } from "@/lib/brand/site-seo";
import { utcToLocalYmd } from "@/lib/scheduled-reminders/schedule-logic";

export type ReminderEmailStatus = "Upcoming" | "Due Today" | "Overdue";

export function reminderEmailStatus(dueDate: string, timezone: string, nowUtc = new Date()): ReminderEmailStatus {
  const today = utcToLocalYmd(nowUtc, timezone || "Asia/Kathmandu");
  if (dueDate < today) return "Overdue";
  if (dueDate === today) return "Due Today";
  return "Upcoming";
}

export function reminderViewUrl(reminderId: string): string {
  const origin = getSiteOrigin().replace(/\/+$/, "") || "https://www.firenepal.com";
  return `${origin}/smart-reminders?reminder=${encodeURIComponent(reminderId)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slotHeadline(slot: string): string {
  switch (slot) {
    case "d7":
      return "Coming up in 7 days";
    case "d3":
      return "Coming up in 3 days";
    case "d1":
      return "Due tomorrow";
    case "due":
      return "Due today";
    case "overdue":
      return "Overdue";
    default:
      return "Reminder";
  }
}

function statusColor(status: ReminderEmailStatus): string {
  if (status === "Overdue") return "#ef4444";
  if (status === "Due Today") return "#f59e0b";
  return "#10b981";
}

function categoryLabel(reminderType: string): string {
  if (reminderType in REMINDER_TYPE_LABEL) {
    return REMINDER_TYPE_LABEL[reminderType as ReminderType];
  }
  return reminderType.replace(/_/g, " ");
}

export function buildScheduledReminderEmail(input: {
  reminderId: string;
  title: string;
  amountNpr: number | null;
  reminderType: ReminderType | string;
  dueDate: string;
  dueTime: string;
  timezone: string;
  slot: string;
  status: ReminderEmailStatus;
}): { subject: string; html: string; text: string } {
  const category = categoryLabel(String(input.reminderType));
  const amount =
    input.amountNpr != null && Number.isFinite(input.amountNpr)
      ? `NPR ${Math.round(input.amountNpr).toLocaleString("en-IN")}`
      : "—";
  const viewUrl = reminderViewUrl(input.reminderId);
  const headline = slotHeadline(input.slot);
  const status = input.status;
  const accent = statusColor(status);

  const subject = `FIRE Nepal · ${input.title} (${status})`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#020806;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e4e4e7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020806;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#04120d;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:24px 28px;border-bottom:1px solid rgba(16,185,129,0.25);">
<p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#10b981;font-weight:800;">FIRE Nepal</p>
<h1 style="margin:10px 0 0;font-size:22px;font-weight:900;color:#fff;">Smart Reminder</h1>
</td></tr>
<tr><td style="padding:26px 28px 8px;">
<p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${accent};">${escapeHtml(headline)}</p>
<h2 style="margin:0 0 16px;font-size:20px;font-weight:900;color:#fff;">${escapeHtml(input.title)}</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
<tr><td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#a1a1aa;">Amount</td>
<td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:#fff;text-align:right;">${escapeHtml(amount)}</td></tr>
<tr><td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#a1a1aa;">Category</td>
<td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:#fff;text-align:right;">${escapeHtml(category)}</td></tr>
<tr><td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#a1a1aa;">Due date</td>
<td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:#fff;text-align:right;">${escapeHtml(input.dueDate)} · ${escapeHtml(input.dueTime)} (${escapeHtml(input.timezone)})</td></tr>
<tr><td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:#a1a1aa;">Status</td>
<td style="padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:${accent};text-align:right;">${escapeHtml(status)}</td></tr>
</table>
<p style="margin:24px 0 0;">
<a href="${escapeHtml(viewUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">View Reminder</a>
</p>
</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#a1a1aa;">
Sent automatically by FIRE Nepal Smart Reminders. You can manage email preferences in the app.
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `FIRE Nepal reminder: ${input.title}`,
    `Status: ${status}`,
    `Amount: ${amount}`,
    `Category: ${category}`,
    `Due: ${input.dueDate} at ${input.dueTime} (${input.timezone})`,
    `View Reminder: ${viewUrl}`,
  ].join("\n");

  return { subject, html, text };
}
