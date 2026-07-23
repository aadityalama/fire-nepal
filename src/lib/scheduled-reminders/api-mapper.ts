import type { Reminder, ReminderType, RepeatFrequency } from "@/lib/smart-reminders/types";
import { REMINDER_TYPES, REPEAT_FREQUENCIES } from "@/lib/smart-reminders/types";
import type { Database } from "@/types/supabase-database";
import { normalizeDueTime } from "@/lib/scheduled-reminders/schedule-logic";

export type ScheduledReminderUpdate = Database["public"]["Tables"]["scheduled_reminders"]["Update"];

export type ScheduledReminderDbRow = {
  id: string;
  user_id: string;
  title: string;
  amount: string | number | null;
  due_date: string;
  due_time: string;
  timezone: string;
  email: string;
  repeat_frequency: string;
  notify_7d: boolean;
  notify_3d: boolean;
  notify_1d: boolean;
  notify_at_due: boolean;
  notify_overdue: boolean;
  reminder_type: string;
  notes: string | null;
  shared_with_family: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

function asReminderType(t: string): ReminderType {
  return REMINDER_TYPES.includes(t as ReminderType) ? (t as ReminderType) : "room_rent";
}

function asRepeatFrequency(t: string): RepeatFrequency {
  return REPEAT_FREQUENCIES.includes(t as RepeatFrequency) ? (t as RepeatFrequency) : "monthly";
}

export function dbRowToReminder(row: ScheduledReminderDbRow): Reminder {
  const amt = row.amount;
  const amountNpr =
    amt == null || amt === ""
      ? null
      : typeof amt === "number"
        ? Math.round(amt)
        : Math.round(Number.parseFloat(String(amt)));
  return {
    id: row.id,
    title: row.title,
    reminderType: asReminderType(row.reminder_type),
    amountNpr: amountNpr != null && Number.isFinite(amountNpr) ? Math.max(0, amountNpr) : null,
    dueDate: row.due_date,
    dueTime: normalizeDueTime(row.due_time),
    timezone: row.timezone?.trim() || "Asia/Kathmandu",
    email: row.email,
    repeatFrequency: asRepeatFrequency(row.repeat_frequency),
    notify7DaysBefore: row.notify_7d,
    notify3DaysBefore: row.notify_3d,
    notify1DayBefore: row.notify_1d,
    notifyAtDueTime: row.notify_at_due,
    notifyOverdue: row.notify_overdue,
    sharedWithFamily: row.shared_with_family,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export type CreateScheduledReminderBody = {
  title: string;
  amountNpr?: number | null;
  dueDate: string;
  dueTime: string;
  timezone: string;
  email: string;
  repeatFrequency: RepeatFrequency;
  notify7DaysBefore: boolean;
  notify3DaysBefore: boolean;
  notify1DayBefore: boolean;
  notifyAtDueTime: boolean;
  notifyOverdue: boolean;
  reminderType: ReminderType;
  notes?: string;
  sharedWithFamily: boolean;
};

export function reminderToInsert(userId: string, body: CreateScheduledReminderBody) {
  return {
    user_id: userId,
    title: body.title.trim(),
    amount: body.amountNpr == null ? null : body.amountNpr,
    due_date: body.dueDate,
    due_time: normalizeDueTime(body.dueTime),
    timezone: body.timezone?.trim() || "Asia/Kathmandu",
    email: body.email.trim().toLowerCase(),
    repeat_frequency: body.repeatFrequency,
    notify_7d: body.notify7DaysBefore,
    notify_3d: body.notify3DaysBefore,
    notify_1d: body.notify1DayBefore,
    notify_at_due: body.notifyAtDueTime,
    notify_overdue: body.notifyOverdue,
    reminder_type: body.reminderType,
    notes: body.notes?.trim() || null,
    shared_with_family: body.sharedWithFamily,
    is_completed: false,
  };
}

export function reminderPatchToUpdate(patch: Partial<CreateScheduledReminderBody>): ScheduledReminderUpdate {
  const out: ScheduledReminderUpdate = {};
  if (patch.title != null) out.title = patch.title.trim();
  if (patch.amountNpr !== undefined) out.amount = patch.amountNpr;
  if (patch.dueDate != null) out.due_date = patch.dueDate;
  if (patch.dueTime != null) out.due_time = normalizeDueTime(patch.dueTime);
  if (patch.timezone != null) out.timezone = patch.timezone.trim() || "Asia/Kathmandu";
  if (patch.email != null) out.email = patch.email.trim().toLowerCase();
  if (patch.repeatFrequency != null) out.repeat_frequency = patch.repeatFrequency;
  if (patch.notify7DaysBefore !== undefined) out.notify_7d = patch.notify7DaysBefore;
  if (patch.notify3DaysBefore !== undefined) out.notify_3d = patch.notify3DaysBefore;
  if (patch.notify1DayBefore !== undefined) out.notify_1d = patch.notify1DayBefore;
  if (patch.notifyAtDueTime !== undefined) out.notify_at_due = patch.notifyAtDueTime;
  if (patch.notifyOverdue !== undefined) out.notify_overdue = patch.notifyOverdue;
  if (patch.reminderType != null) out.reminder_type = patch.reminderType;
  if (patch.notes !== undefined) out.notes = patch.notes?.trim() || null;
  if (patch.sharedWithFamily !== undefined) out.shared_with_family = patch.sharedWithFamily;
  out.updated_at = new Date().toISOString();
  return out;
}
