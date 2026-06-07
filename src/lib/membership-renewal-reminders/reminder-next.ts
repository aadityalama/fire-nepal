import { addDays, startOfDay } from "date-fns";
import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import { autoReminderDue } from "@/lib/membership-renewal-reminders/reminder-eligibility";

export type { AutoReminderType };

export const MEMBERSHIP_AUTO_REMINDER_TYPES: AutoReminderType[] = [
  "expiry_7_days",
  "expiry_3_days",
  "expiry_today",
  "expired_7_days",
];

/** First calendar day on/after `from` when an automatic reminder fires and `sentTypesForPeriod` does not already include that kind for this membership end. */
export function nextUnsentAutoReminder(
  expiresAt: Date,
  from: Date,
  sentTypesForPeriod: Set<AutoReminderType>,
  maxDaysAhead = 120,
): { kind: AutoReminderType; on: Date } | null {
  if (Number.isNaN(expiresAt.getTime())) return null;
  const start = startOfDay(from);
  for (let i = 0; i <= maxDaysAhead; i++) {
    const probe = addDays(start, i);
    const k = autoReminderDue(expiresAt, probe);
    if (!k) continue;
    if (sentTypesForPeriod.has(k)) continue;
    return { kind: k, on: probe };
  }
  return null;
}

export function formatMembershipReminderType(t: string): string {
  const map: Record<string, string> = {
    expiry_7_days: "7 days before expiry",
    expiry_3_days: "3 days before expiry",
    expiry_today: "Expiry day",
    expired_7_days: "7 days after expiry",
    admin_send: "Manual send",
    admin_resend: "Manual resend",
  };
  return map[t] ?? t;
}
