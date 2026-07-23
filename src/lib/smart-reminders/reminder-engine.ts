import type { InAppNotification, RepeatFrequency, Reminder, ReminderHistoryEntry, ReminderPriority, ReminderType } from "./types";
import { addDays, addMonths, addYears, daysBetween, formatYmd, parseYmd, startOfLocalDay } from "./date-utils";

const EDUCATION_TYPES = new Set<ReminderType>(["school_fees", "tuition", "exams"]);

export function isEducationReminderType(t: ReminderType): boolean {
  return EDUCATION_TYPES.has(t);
}

export function isBillishReminderType(t: ReminderType): boolean {
  return (
    t === "room_rent" ||
    t === "insurance" ||
    t === "internet" ||
    t === "electricity" ||
    t === "subscriptions"
  );
}

export function nextDueAfterPaid(due: string, repeatFrequency: RepeatFrequency): string {
  const base = parseYmd(due);
  if (repeatFrequency === "once") return due;
  if (repeatFrequency === "daily") return formatYmd(addDays(base, 1));
  if (repeatFrequency === "weekly") return formatYmd(addDays(base, 7));
  if (repeatFrequency === "monthly") return formatYmd(addMonths(base, 1));
  if (repeatFrequency === "yearly") return formatYmd(addYears(base, 1));
  return due;
}

/**
 * If multiple periods were missed, fast-forward scheduled due date until it's not before `today`,
 * preserving cadence from the original due anchor.
 */
export function rollForwardDueDateIfNeeded(due: string, repeatFrequency: RepeatFrequency, today: Date): string {
  if (repeatFrequency === "once") return due;
  let cur = due;
  const t0 = startOfLocalDay(today).getTime();
  let guard = 0;
  while (parseYmd(cur).getTime() < t0 && guard < 240) {
    cur = nextDueAfterPaid(cur, repeatFrequency);
    guard += 1;
  }
  return cur;
}

export function reminderPriority(
  reminder: Reminder,
  now: Date,
  upcomingWithinDays: number,
): ReminderPriority {
  const today = startOfLocalDay(now);
  const due = startOfLocalDay(parseYmd(reminder.dueDate));
  const diff = daysBetween(today, due);
  if (diff < 0) return "overdue";
  if (diff <= upcomingWithinDays) return "upcoming";
  return "ok";
}

export function makeHistoryEntry(reminder: Reminder, paidAt: Date): ReminderHistoryEntry {
  return {
    id: `h_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    reminderId: reminder.id,
    title: reminder.title,
    reminderType: reminder.reminderType,
    amountNpr: reminder.amountNpr,
    paidAt: paidAt.toISOString(),
    dueDate: reminder.dueDate,
    repeatFrequency: reminder.repeatFrequency,
    sharedWithFamily: reminder.sharedWithFamily,
  };
}

export function stableNotificationId(parts: string[]): string {
  return `n_${parts.join("_").replace(/[^a-zA-Z0-9_-]+/g, "")}`;
}

export function buildDedupeKey(reminderId: string, kind: InAppNotification["kind"], ymd: string): string {
  return `${reminderId}:${kind}:${ymd}`;
}

export type EngineNotificationDraft = Omit<InAppNotification, "read"> & { dedupeKey: string };

function anyEmailChannelOn(r: Reminder): boolean {
  return (
    r.notify7DaysBefore ||
    r.notify3DaysBefore ||
    r.notify1DayBefore ||
    r.notifyAtDueTime ||
    r.notifyOverdue ||
    Boolean(r.emailNotify)
  );
}

export function draftNotificationsForDay(input: {
  reminders: Reminder[];
  now: Date;
  existingDedupeKeys: Set<string>;
  emailNotificationsEnabled: boolean;
}): EngineNotificationDraft[] {
  void input.emailNotificationsEnabled;
  const todayYmd = formatYmd(startOfLocalDay(input.now));
  const drafts: EngineNotificationDraft[] = [];

  for (const r of input.reminders) {
    const today = startOfLocalDay(input.now);
    const diff = daysBetween(today, startOfLocalDay(parseYmd(r.dueDate)));

    const push = (kind: InAppNotification["kind"], title: string, body: string, dayKey = todayYmd) => {
      const dedupeKey = buildDedupeKey(r.id, kind, dayKey);
      if (input.existingDedupeKeys.has(dedupeKey)) return;
      drafts.push({
        id: stableNotificationId([r.id, kind, dayKey]),
        dedupeKey,
        reminderId: r.id,
        kind,
        title,
        body,
        createdAt: input.now.toISOString(),
      });
    };

    const amountSuffix = r.amountNpr != null ? ` · NPR ${r.amountNpr.toLocaleString("en-IN")}` : "";

    if (diff < 0) {
      push("overdue", "Overdue reminder", `${r.title} was due ${r.dueDate}. Settle or mark paid to keep your family plan on track.`);
      continue;
    }

    if (diff === 0 && (r.notifyAtDueTime || Boolean(r.emailNotify) || !reminderHasExplicitSlots(r))) {
      push("payment_due", "Payment due today", `${r.title} · due ${r.dueDate}${amountSuffix}`);
    }

    if (diff === 1 && r.notify1DayBefore) {
      push("payment_due", "Due tomorrow", `${r.title} · due ${r.dueDate}${amountSuffix}`);
    }

    if (diff === 3 && r.notify3DaysBefore) {
      push("payment_due", "Due in 3 days", `${r.title} · due ${r.dueDate}${amountSuffix}`);
    }

    if (diff === 7 && r.notify7DaysBefore) {
      push("payment_due", "Due in 7 days", `${r.title} · due ${r.dueDate}${amountSuffix}`);
    }
  }

  return drafts;
}

function reminderHasExplicitSlots(r: Reminder): boolean {
  return (
    r.notify7DaysBefore ||
    r.notify3DaysBefore ||
    r.notify1DayBefore ||
    r.notifyAtDueTime ||
    r.notifyOverdue ||
    Boolean(r.emailNotify)
  );
}

export { anyEmailChannelOn as reminderHasEmailNotifications };
