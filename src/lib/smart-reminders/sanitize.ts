import { createDefaultSmartRemindersStore } from "./default-state";
import type { SmartRemindersStore } from "./types";
import { RECURRENCE, REMINDER_TYPES, REPEAT_FREQUENCIES } from "./types";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapLegacyRecurrence(s: string | null): (typeof REPEAT_FREQUENCIES)[number] | null {
  if (!s) return null;
  if (REPEAT_FREQUENCIES.includes(s as never)) return s as (typeof REPEAT_FREQUENCIES)[number];
  if (RECURRENCE.includes(s as never)) return s as "once" | "monthly" | "yearly";
  return null;
}

function defaultNotifyFromEmailNotify(emailNotify: boolean | null | undefined): {
  n7: boolean;
  n3: boolean;
  n1: boolean;
  at: boolean;
  od: boolean;
} {
  const on = emailNotify ?? false;
  return { n7: on, n3: on, n1: on, at: on, od: on };
}

export function sanitizeSmartRemindersStore(raw: unknown): SmartRemindersStore {
  const base = createDefaultSmartRemindersStore();
  if (!isObj(raw)) return base;

  const settingsIn = isObj(raw.settings) ? raw.settings : null;
  const upcomingWithinDays = asNum(settingsIn?.upcomingWithinDays);
  const emailNotificationsEnabled = asBool(settingsIn?.emailNotificationsEnabled);

  const remindersIn = Array.isArray(raw.reminders) ? raw.reminders : null;
  const reminders = (remindersIn ?? [])
    .map((r) => {
      if (!isObj(r)) return null;
      const id = asString(r.id);
      const title = asString(r.title);
      const reminderType = asString(r.reminderType);
      const dueDate = asString(r.dueDate);
      const createdAt = asString(r.createdAt);
      if (!id || !title || !reminderType || !dueDate || !createdAt) return null;
      if (!REMINDER_TYPES.includes(reminderType as never)) return null;

      const repeatRaw = asString(r.repeatFrequency) ?? asString(r.recurrence);
      const repeatFrequency = mapLegacyRecurrence(repeatRaw);
      if (!repeatFrequency) return null;

      const amountNpr = asNum(r.amountNpr);
      const dueTime = asString(r.dueTime) ?? "09:00";
      const timezone = asString(r.timezone) ?? "Asia/Kathmandu";
      const email = asString(r.email)?.trim() ?? "";

      const legacyEmail = asBool(r.emailNotify);
      const defs = defaultNotifyFromEmailNotify(legacyEmail);

      const notify7DaysBefore = asBool(r.notify7DaysBefore) ?? defs.n7;
      const notify3DaysBefore = asBool(r.notify3DaysBefore) ?? defs.n3;
      const notify1DayBefore = asBool(r.notify1DayBefore) ?? defs.n1;
      const notifyAtDueTime = asBool(r.notifyAtDueTime) ?? defs.at;
      const notifyOverdue = asBool(r.notifyOverdue) ?? defs.od;

      return {
        id,
        title,
        reminderType: reminderType as (typeof REMINDER_TYPES)[number],
        amountNpr: amountNpr == null ? null : Math.max(0, Math.round(amountNpr)),
        dueDate,
        dueTime: /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : "09:00",
        timezone: timezone.length ? timezone : "Asia/Kathmandu",
        email,
        repeatFrequency,
        notify7DaysBefore,
        notify3DaysBefore,
        notify1DayBefore,
        notifyAtDueTime,
        notifyOverdue,
        sharedWithFamily: asBool(r.sharedWithFamily) ?? false,
        notes: asString(r.notes) ?? undefined,
        createdAt,
        emailNotify: legacyEmail ?? undefined,
      };
    })
    .filter(Boolean) as SmartRemindersStore["reminders"];

  const historyIn = Array.isArray(raw.history) ? raw.history : [];
  const history = historyIn
    .map((h) => {
      if (!isObj(h)) return null;
      const id = asString(h.id);
      const reminderId = asString(h.reminderId);
      const title = asString(h.title);
      const reminderType = asString(h.reminderType);
      const paidAt = asString(h.paidAt);
      const dueDate = asString(h.dueDate);
      const repeatRaw = asString(h.repeatFrequency) ?? asString(h.recurrence);
      const repeatFrequency = mapLegacyRecurrence(repeatRaw);
      if (!id || !reminderId || !title || !reminderType || !paidAt || !dueDate || !repeatFrequency) return null;
      if (!REMINDER_TYPES.includes(reminderType as never)) return null;
      const amountNpr = asNum(h.amountNpr);
      return {
        id,
        reminderId,
        title,
        reminderType: reminderType as (typeof REMINDER_TYPES)[number],
        amountNpr: amountNpr == null ? null : Math.max(0, Math.round(amountNpr)),
        paidAt,
        dueDate,
        repeatFrequency,
        sharedWithFamily: asBool(h.sharedWithFamily) ?? false,
      };
    })
    .filter(Boolean) as SmartRemindersStore["history"];

  const notificationsIn = Array.isArray(raw.notifications) ? raw.notifications : [];
  const notifications = notificationsIn
    .map((n) => {
      if (!isObj(n)) return null;
      const id = asString(n.id);
      const kind = asString(n.kind);
      const title = asString(n.title);
      const body = asString(n.body);
      const createdAt = asString(n.createdAt);
      if (!id || !kind || !title || !body || !createdAt) return null;
      if (kind !== "payment_due" && kind !== "overdue" && kind !== "email_sent" && kind !== "family_shared") return null;
      const reminderId = n.reminderId == null ? null : asString(n.reminderId);
      return {
        id,
        reminderId,
        kind,
        title,
        body,
        createdAt,
        read: asBool(n.read) ?? false,
      } as SmartRemindersStore["notifications"][number];
    })
    .filter(Boolean) as SmartRemindersStore["notifications"];

  return {
    version: 1,
    reminders: remindersIn === null ? base.reminders : reminders,
    history,
    notifications,
    settings: {
      emailNotificationsEnabled: emailNotificationsEnabled ?? base.settings.emailNotificationsEnabled,
      upcomingWithinDays:
        upcomingWithinDays == null
          ? base.settings.upcomingWithinDays
          : Math.min(60, Math.max(1, Math.round(upcomingWithinDays))),
    },
  };
}
