import { differenceInCalendarDays, startOfDay } from "date-fns";

export type AutoReminderType = "expiry_7_days" | "expiry_3_days" | "expiry_today" | "expired_7_days";

/** Which automatic reminder (if any) is due on `now`'s calendar day for this membership end. */
export function autoReminderDue(
  expiresAt: Date,
  now: Date = new Date(),
): AutoReminderType | null {
  if (Number.isNaN(expiresAt.getTime())) return null;
  const startToday = startOfDay(now);
  const startExp = startOfDay(expiresAt);
  const calRemaining = differenceInCalendarDays(startExp, startToday);

  if (calRemaining === 7) return "expiry_7_days";
  if (calRemaining === 3) return "expiry_3_days";
  if (calRemaining === 0) return "expiry_today";

  const expiredByInstant = expiresAt.getTime() < now.getTime();
  if (expiredByInstant || calRemaining < 0) {
    const daysSince = differenceInCalendarDays(startToday, startExp);
    if (daysSince === 7) return "expired_7_days";
  }

  return null;
}
