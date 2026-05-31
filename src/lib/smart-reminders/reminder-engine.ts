import type { InAppNotification, Recurrence, Reminder, ReminderHistoryEntry, ReminderPriority, ReminderType } from "./types";
import { addMonths, addYears, daysBetween, formatYmd, parseYmd, startOfLocalDay } from "./date-utils";

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

export function nextDueAfterPaid(due: string, recurrence: Recurrence): string {
  const base = parseYmd(due);
  if (recurrence === "monthly") return formatYmd(addMonths(base, 1));
  if (recurrence === "yearly") return formatYmd(addYears(base, 1));
  return due;
}

/**
 * If multiple periods were missed, fast-forward scheduled due date until it's not before `today`,
 * preserving cadence from the original due anchor.
 */
export function rollForwardDueDateIfNeeded(due: string, recurrence: Recurrence, today: Date): string {
  if (recurrence === "once") return due;
  let cur = due;
  const t0 = startOfLocalDay(today).getTime();
  let guard = 0;
  while (parseYmd(cur).getTime() < t0 && guard < 240) {
    cur = nextDueAfterPaid(cur, recurrence);
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
    recurrence: reminder.recurrence,
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

export function draftNotificationsForDay(input: {
  reminders: Reminder[];
  now: Date;
  existingDedupeKeys: Set<string>;
  emailNotificationsEnabled: boolean;
}): EngineNotificationDraft[] {
  const todayYmd = formatYmd(startOfLocalDay(input.now));
  const drafts: EngineNotificationDraft[] = [];

  for (const r of input.reminders) {
    const due = startOfLocalDay(parseYmd(r.dueDate));
    const today = startOfLocalDay(input.now);
    const diff = daysBetween(today, due);

    if (diff === 0) {
      const dedupeKey = buildDedupeKey(r.id, "payment_due", todayYmd);
      if (!input.existingDedupeKeys.has(dedupeKey)) {
        drafts.push({
          id: stableNotificationId([r.id, "due", todayYmd]),
          dedupeKey,
          reminderId: r.id,
          kind: "payment_due",
          title: "Payment due today",
          body: `${r.title} · due ${r.dueDate}${r.amountNpr != null ? ` · NPR ${r.amountNpr.toLocaleString("en-IN")}` : ""}`,
          createdAt: input.now.toISOString(),
        });
      }
    }

    if (diff < 0) {
      const overdueYmd = todayYmd;
      const dedupeKey = buildDedupeKey(r.id, "overdue", overdueYmd);
      if (!input.existingDedupeKeys.has(dedupeKey)) {
        drafts.push({
          id: stableNotificationId([r.id, "overdue", overdueYmd]),
          dedupeKey,
          reminderId: r.id,
          kind: "overdue",
          title: "Overdue reminder",
          body: `${r.title} was due ${r.dueDate}. Settle or mark paid to keep your family plan on track.`,
          createdAt: input.now.toISOString(),
        });
      }
    }
  }

  return drafts;
}
