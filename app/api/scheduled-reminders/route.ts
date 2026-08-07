import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  type CreateScheduledReminderBody,
  dbRowToReminder,
  reminderToInsert,
} from "@/lib/scheduled-reminders/api-mapper";
import { ensureEmailNotifyRegistration, getUserEmailNotificationsEnabled } from "@/lib/scheduled-reminders/email-lifecycle";
import { REMINDER_TYPES, REPEAT_FREQUENCIES, type RepeatFrequency, type ReminderType } from "@/lib/smart-reminders/types";
import { formatScheduledRemindersDbError } from "@/lib/supabase/scheduled-reminders-db-error";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function validateBody(raw: unknown): Omit<CreateScheduledReminderBody, "email"> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) return null;
  const dueDate = typeof o.dueDate === "string" ? o.dueDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const dueTimeRaw = typeof o.dueTime === "string" ? o.dueTime.trim() : "09:00";
  const dueTimeM = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(dueTimeRaw);
  const dueTime = dueTimeM ? `${dueTimeM[1]}:${dueTimeM[2]}` : "09:00";
  const timezone = typeof o.timezone === "string" && o.timezone.trim() ? o.timezone.trim() : "Asia/Kathmandu";
  const rf = typeof o.repeatFrequency === "string" ? o.repeatFrequency : "monthly";
  if (!REPEAT_FREQUENCIES.includes(rf as RepeatFrequency)) return null;
  const rt = typeof o.reminderType === "string" ? o.reminderType : "room_rent";
  if (!REMINDER_TYPES.includes(rt as ReminderType)) return null;
  const amountRaw = o.amountNpr;
  const amountNpr =
    amountRaw == null
      ? null
      : typeof amountRaw === "number" && Number.isFinite(amountRaw)
        ? Math.max(0, Math.round(amountRaw))
        : null;

  const flags = ensureEmailNotifyRegistration({
    notify7DaysBefore: Boolean(o.notify7DaysBefore),
    notify3DaysBefore: Boolean(o.notify3DaysBefore),
    notify1DayBefore: Boolean(o.notify1DayBefore),
    notifyAtDueTime: o.notifyAtDueTime !== false,
    notifyOverdue: o.notifyOverdue !== false,
  });

  return {
    title,
    amountNpr,
    dueDate,
    dueTime,
    timezone,
    repeatFrequency: rf as RepeatFrequency,
    ...flags,
    reminderType: rt as ReminderType,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    sharedWithFamily: Boolean(o.sharedWithFamily),
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);
    const { data, error } = await sb
      .from("scheduled_reminders")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("is_completed", false)
      .eq("is_archived", false)
      .order("due_date", { ascending: true });
    if (error) {
      // Backward-compatible if migration not applied yet (is_archived missing).
      const fallback = await sb
        .from("scheduled_reminders")
        .select("*")
        .eq("user_id", u.user.id)
        .eq("is_completed", false)
        .order("due_date", { ascending: true });
      if (fallback.error) return bad(formatScheduledRemindersDbError(error.message), 500);
      const reminders = (fallback.data ?? []).map((row) => dbRowToReminder(row as never));
      return NextResponse.json({ ok: true, reminders });
    }
    const reminders = (data ?? []).map((row) => dbRowToReminder(row as never));
    return NextResponse.json({ ok: true, reminders });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  const bodyWithoutEmail = validateBody(raw);
  if (!bodyWithoutEmail) return bad("Invalid reminder payload");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);
    const authEmail = (u.user.email ?? "").trim().toLowerCase();
    if (!authEmail || !authEmail.includes("@")) {
      return bad("Your account has no registered email address for reminders.", 400);
    }

    const prefsOn = await getUserEmailNotificationsEnabled(sb as never, u.user.id);
    const body: CreateScheduledReminderBody = {
      ...bodyWithoutEmail,
      email: authEmail,
    };
    const insert = reminderToInsert(u.user.id, body, { emailEnabled: prefsOn });
    let { data, error } = await sb.from("scheduled_reminders").insert(insert).select("*").single();
    if (error && /email_enabled|is_archived|last_email_sent_at|column/i.test(error.message)) {
      const legacy = { ...insert } as Record<string, unknown>;
      delete legacy.email_enabled;
      delete legacy.is_archived;
      const retry = await sb.from("scheduled_reminders").insert(legacy as never).select("*").single();
      data = retry.data;
      error = retry.error;
    }
    if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
    return NextResponse.json({
      ok: true,
      reminder: dbRowToReminder(data as never),
      emailRegistered: true,
      emailEnabled: prefsOn,
      destinationEmail: authEmail,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
