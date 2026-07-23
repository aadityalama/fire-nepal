import type { ExpenseReminderTiming, ExpenseRepeat, ExpenseWorkspaceMeta } from "@/lib/expense-workspace-ui";
import type { CreateScheduledReminderBody } from "@/lib/scheduled-reminders/api-mapper";
import type { ReminderType, RepeatFrequency } from "@/lib/smart-reminders/types";

export const EXPENSE_REMINDER_TIMEZONE = "Asia/Kathmandu";
export const EXPENSE_REMINDER_DUE_TIME = "09:00";

/** Notes marker so cron/admin can attribute sends to expense workspace rows. */
export function expenseReminderNotes(expenseId: number): string {
  return `expense:${expenseId}`;
}

export function parseExpenseIdFromReminderNotes(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const m = /^expense:(\d+)$/.exec(notes.trim());
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function mapExpenseRepeatToFrequency(repeat: ExpenseRepeat | undefined): RepeatFrequency {
  switch (repeat) {
    case "Weekly":
      return "weekly";
    case "Monthly":
      return "monthly";
    case "Yearly":
      return "yearly";
    case "Never":
    default:
      return "once";
  }
}

export function mapExpenseCategoryToReminderType(category: string): ReminderType {
  const c = category.trim().toLowerCase();
  if (c.includes("rent") || c.includes("room")) return "room_rent";
  if (c.includes("electric")) return "electricity";
  if (c.includes("internet") || c.includes("wifi")) return "internet";
  if (c.includes("insur")) return "insurance";
  if (c.includes("school") || c.includes("fee")) return "school_fees";
  if (c.includes("tuition")) return "tuition";
  if (c.includes("exam")) return "exams";
  if (c.includes("subscr") || c.includes("netflix") || c.includes("spotify")) return "subscriptions";
  if (c.includes("medicine") || c.includes("pharma") || c.includes("health")) return "medicine";
  return "subscriptions";
}

/** Map UI timing toggle to scheduled-reminder notify flags (single primary slot + overdue). */
export function mapExpenseTimingToNotifyFlags(timing: ExpenseReminderTiming | undefined): {
  notify7DaysBefore: boolean;
  notify3DaysBefore: boolean;
  notify1DayBefore: boolean;
  notifyAtDueTime: boolean;
  notifyOverdue: boolean;
} {
  const base = {
    notify7DaysBefore: false,
    notify3DaysBefore: false,
    notify1DayBefore: false,
    notifyAtDueTime: false,
    notifyOverdue: true,
  };
  switch (timing) {
    case "7 Days Before":
      return { ...base, notify7DaysBefore: true };
    case "3 Days Before":
      return { ...base, notify3DaysBefore: true };
    case "1 Day Before":
      return { ...base, notify1DayBefore: true };
    case "On Due Date":
    case "Custom":
    default:
      return { ...base, notifyAtDueTime: true };
  }
}

export function buildExpenseScheduledReminderBody(input: {
  title: string;
  amountNpr: number;
  category: string;
  dueDate: string;
  email: string;
  repeat?: ExpenseRepeat;
  reminderTiming?: ExpenseReminderTiming;
  expenseId: number;
}): CreateScheduledReminderBody {
  const flags = mapExpenseTimingToNotifyFlags(input.reminderTiming);
  return {
    title: input.title.trim(),
    amountNpr: Math.max(0, Math.round(input.amountNpr)),
    dueDate: input.dueDate,
    dueTime: EXPENSE_REMINDER_DUE_TIME,
    timezone: EXPENSE_REMINDER_TIMEZONE,
    email: input.email.trim().toLowerCase(),
    repeatFrequency: mapExpenseRepeatToFrequency(input.repeat),
    ...flags,
    reminderType: mapExpenseCategoryToReminderType(input.category),
    notes: expenseReminderNotes(input.expenseId),
    sharedWithFamily: false,
  };
}

export type SyncExpenseReminderResult =
  | { ok: true; reminderId: string; action: "created" | "updated" | "skipped" }
  | { ok: false; error: string };

/**
 * Create or update the cloud scheduled reminder backing an expense workspace row.
 * No-op when reminders/email are disabled. Does not touch UI.
 */
export async function syncExpenseReminderToCloud(input: {
  expenseId: number;
  title: string;
  amountNpr: number;
  category: string;
  dueDate: string;
  email: string | null | undefined;
  meta: Pick<ExpenseWorkspaceMeta, "repeat" | "reminderEnabled" | "reminderTiming" | "reminderEmail" | "scheduledReminderId" | "paidAt" | "cancelled">;
}): Promise<SyncExpenseReminderResult> {
  const enabled = Boolean(input.meta.reminderEnabled && input.meta.reminderEmail);
  const existingId = input.meta.scheduledReminderId?.trim() || null;

  if (input.meta.paidAt || input.meta.cancelled || !enabled) {
    if (existingId) {
      try {
        const r = await fetch(`/api/scheduled-reminders/${existingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markPaid: true }),
        });
        if (!r.ok && r.status !== 404) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: j.error ?? `Could not complete reminder (${r.status})` };
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Network error completing reminder" };
      }
    }
    return { ok: true, reminderId: existingId ?? "", action: "skipped" };
  }

  const email = input.email?.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Signed-in email required to deliver expense reminder emails" };
  }

  const body = buildExpenseScheduledReminderBody({
    title: input.title,
    amountNpr: input.amountNpr,
    category: input.category,
    dueDate: input.dueDate,
    email,
    repeat: input.meta.repeat,
    reminderTiming: input.meta.reminderTiming,
    expenseId: input.expenseId,
  });

  try {
    if (existingId) {
      const r = await fetch(`/api/scheduled-reminders/${existingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; reminder?: { id: string }; error?: string };
      if (r.status === 404) {
        // Fall through to create
      } else if (!r.ok || !j.ok || !j.reminder?.id) {
        return { ok: false, error: j.error ?? `Could not update reminder (${r.status})` };
      } else {
        return { ok: true, reminderId: j.reminder.id, action: "updated" };
      }
    }

    const r = await fetch("/api/scheduled-reminders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; reminder?: { id: string }; error?: string };
    if (!r.ok || !j.ok || !j.reminder?.id) {
      return { ok: false, error: j.error ?? `Could not create reminder (${r.status})` };
    }
    return { ok: true, reminderId: j.reminder.id, action: "created" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error syncing reminder" };
  }
}

/** Whether an in-app expense notification should fire today for the configured timing. */
export function shouldDeliverExpenseInAppNotification(input: {
  reminderEnabled?: boolean;
  reminderTiming?: ExpenseReminderTiming;
  remainingDays: number;
  tone: "overdue" | "today" | "tomorrow" | "upcoming" | "completed" | "cancelled";
}): boolean {
  if (!input.reminderEnabled) return false;
  if (input.tone === "completed" || input.tone === "cancelled") return false;
  if (input.tone === "overdue") return true;

  const timing = input.reminderTiming ?? "1 Day Before";
  switch (timing) {
    case "On Due Date":
    case "Custom":
      return input.remainingDays === 0;
    case "1 Day Before":
      return input.remainingDays === 1 || input.remainingDays === 0;
    case "3 Days Before":
      return input.remainingDays === 3 || input.remainingDays === 0;
    case "7 Days Before":
      return input.remainingDays === 7 || input.remainingDays === 0;
    default:
      return input.remainingDays === 0;
  }
}
