import type { InsurancePolicy } from "@/lib/insurance/insurance-types";
import {
  buildPremiumDueInfo,
  premiumReminderMarksForDays,
  premiumReminderMessage,
  type PremiumReminderMark,
} from "@/lib/insurance/insurance-utils";

export const INSURANCE_PREMIUM_REMINDERS_KEY = "fire-nepal-insurance-premium-reminders-v1";
export const INSURANCE_PREMIUM_REMINDER_DISMISSED_KEY = "fire-nepal-insurance-premium-reminder-dismissed-v1";

type ReminderPrefs = {
  enabled: boolean;
};

const DEFAULT_PREFS: ReminderPrefs = { enabled: true };

export function loadPremiumReminderPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(INSURANCE_PREMIUM_REMINDERS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return { enabled: parsed.enabled !== false };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePremiumReminderPrefs(prefs: ReminderPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSURANCE_PREMIUM_REMINDERS_KEY, JSON.stringify(prefs));
}

function loadDismissedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(INSURANCE_PREMIUM_REMINDER_DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function saveDismissedKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSURANCE_PREMIUM_REMINDER_DISMISSED_KEY, JSON.stringify([...keys]));
}

function reminderKey(policyId: string, dueDate: string, mark: PremiumReminderMark) {
  return `${policyId}:${dueDate}:${mark}`;
}

export type PremiumReminderNotification = {
  policy: InsurancePolicy;
  mark: PremiumReminderMark;
  dueDate: string;
  message: string;
  key: string;
};

/** Collect due premium reminder notifications (30 / 7 / 1 / 0 days) not yet dismissed. */
export function collectPremiumReminderNotifications(
  policies: InsurancePolicy[],
  now = new Date(),
): PremiumReminderNotification[] {
  const prefs = loadPremiumReminderPrefs();
  if (!prefs.enabled) return [];

  const dismissed = loadDismissedKeys();
  const out: PremiumReminderNotification[] = [];

  for (const policy of policies) {
    const info = buildPremiumDueInfo(policy, now);
    if (!info.hasSchedule || !info.dueDate || info.overdue) continue;
    const marks = premiumReminderMarksForDays(info.daysRemaining);
    for (const mark of marks) {
      const key = reminderKey(policy.id, info.dueDate, mark);
      if (dismissed.has(key)) continue;
      out.push({
        policy,
        mark,
        dueDate: info.dueDate,
        message: premiumReminderMessage(policy, mark, info.dueDate),
        key,
      });
    }
  }

  return out;
}

export function dismissPremiumReminder(key: string) {
  const dismissed = loadDismissedKeys();
  dismissed.add(key);
  saveDismissedKeys(dismissed);
}

export function premiumReminderStatusLabel(enabled: boolean) {
  return enabled
    ? "Enabled · 30d / 7d / 1d / due date"
    : "Disabled";
}
