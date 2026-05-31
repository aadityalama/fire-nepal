import { createDefaultSmartRemindersStore } from "./default-state";
import type { SmartRemindersStore } from "./types";
import { RECURRENCE, REMINDER_TYPES } from "./types";

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
      const recurrence = asString(r.recurrence);
      const createdAt = asString(r.createdAt);
      if (!id || !title || !reminderType || !dueDate || !recurrence || !createdAt) return null;
      if (!REMINDER_TYPES.includes(reminderType as never)) return null;
      if (!RECURRENCE.includes(recurrence as never)) return null;
      const amountNpr = asNum(r.amountNpr);
      return {
        id,
        title,
        reminderType: reminderType as (typeof REMINDER_TYPES)[number],
        amountNpr: amountNpr == null ? null : Math.max(0, Math.round(amountNpr)),
        dueDate,
        recurrence: recurrence as (typeof RECURRENCE)[number],
        sharedWithFamily: asBool(r.sharedWithFamily) ?? false,
        notes: asString(r.notes) ?? undefined,
        createdAt,
        emailNotify: asBool(r.emailNotify) ?? false,
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
      const recurrence = asString(h.recurrence);
      if (!id || !reminderId || !title || !reminderType || !paidAt || !dueDate || !recurrence) return null;
      if (!REMINDER_TYPES.includes(reminderType as never)) return null;
      if (!RECURRENCE.includes(recurrence as never)) return null;
      const amountNpr = asNum(h.amountNpr);
      return {
        id,
        reminderId,
        title,
        reminderType: reminderType as (typeof REMINDER_TYPES)[number],
        amountNpr: amountNpr == null ? null : Math.max(0, Math.round(amountNpr)),
        paidAt,
        dueDate,
        recurrence: recurrence as (typeof RECURRENCE)[number],
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
