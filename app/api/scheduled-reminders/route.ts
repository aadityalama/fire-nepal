import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  type CreateScheduledReminderBody,
  dbRowToReminder,
  reminderToInsert,
} from "@/lib/scheduled-reminders/api-mapper";
import { REMINDER_TYPES, REPEAT_FREQUENCIES, type RepeatFrequency, type ReminderType } from "@/lib/smart-reminders/types";
import { formatScheduledRemindersDbError } from "@/lib/supabase/scheduled-reminders-db-error";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function validateBody(raw: unknown): CreateScheduledReminderBody | null {
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
  const email = typeof o.email === "string" ? o.email.trim() : "";
  if (!email || !email.includes("@")) return null;
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

  return {
    title,
    amountNpr,
    dueDate,
    dueTime,
    timezone,
    email,
    repeatFrequency: rf as RepeatFrequency,
    notify7DaysBefore: Boolean(o.notify7DaysBefore),
    notify3DaysBefore: Boolean(o.notify3DaysBefore),
    notify1DayBefore: Boolean(o.notify1DayBefore),
    notifyAtDueTime: o.notifyAtDueTime !== false,
    notifyOverdue: Boolean(o.notifyOverdue),
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
      .order("due_date", { ascending: true });
    if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
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
  const body = validateBody(raw);
  if (!body) return bad("Invalid reminder payload");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);
    const insert = reminderToInsert(u.user.id, body);
    const { data, error } = await sb.from("scheduled_reminders").insert(insert).select("*").single();
    if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
    return NextResponse.json({ ok: true, reminder: dbRowToReminder(data as never) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
