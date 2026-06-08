import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dbRowToReminder, reminderPatchToUpdate, type CreateScheduledReminderBody } from "@/lib/scheduled-reminders/api-mapper";
import { nextDueAfterPaidYmd } from "@/lib/scheduled-reminders/schedule-logic";
import type { RepeatFrequency } from "@/lib/smart-reminders/types";
import { REPEAT_FREQUENCIES } from "@/lib/smart-reminders/types";
import { formatScheduledRemindersDbError } from "@/lib/supabase/scheduled-reminders-db-error";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function PATCH(request: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const { id } = await Promise.resolve(ctx.params);
  if (!id) return bad("Missing id");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  if (!raw || typeof raw !== "object") return bad("Invalid body");
  const o = raw as Record<string, unknown>;

  const patch: Partial<CreateScheduledReminderBody> = {};
  if (typeof o.title === "string") patch.title = o.title;
  if ("amountNpr" in o) patch.amountNpr = o.amountNpr == null ? null : Number(o.amountNpr);
  if (typeof o.dueDate === "string") patch.dueDate = o.dueDate;
  if (typeof o.dueTime === "string") patch.dueTime = o.dueTime;
  if (typeof o.timezone === "string") patch.timezone = o.timezone;
  if (typeof o.email === "string") patch.email = o.email;
  if (typeof o.repeatFrequency === "string" && REPEAT_FREQUENCIES.includes(o.repeatFrequency as RepeatFrequency)) {
    patch.repeatFrequency = o.repeatFrequency as RepeatFrequency;
  }
  if (typeof o.notify7DaysBefore === "boolean") patch.notify7DaysBefore = o.notify7DaysBefore;
  if (typeof o.notify3DaysBefore === "boolean") patch.notify3DaysBefore = o.notify3DaysBefore;
  if (typeof o.notify1DayBefore === "boolean") patch.notify1DayBefore = o.notify1DayBefore;
  if (typeof o.notifyAtDueTime === "boolean") patch.notifyAtDueTime = o.notifyAtDueTime;
  if (typeof o.notifyOverdue === "boolean") patch.notifyOverdue = o.notifyOverdue;
  if (typeof o.reminderType === "string") patch.reminderType = o.reminderType as CreateScheduledReminderBody["reminderType"];
  if (typeof o.notes === "string" || o.notes === null) patch.notes = typeof o.notes === "string" ? o.notes : undefined;
  if (typeof o.sharedWithFamily === "boolean") patch.sharedWithFamily = o.sharedWithFamily;

  const markPaid = o.markPaid === true;

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    if (markPaid) {
      const { data: cur, error: curErr } = await sb
        .from("scheduled_reminders")
        .select("*")
        .eq("id", id)
        .eq("user_id", u.user.id)
        .single();
      if (curErr) {
        const code = "code" in curErr ? String((curErr as { code?: string }).code) : "";
        if (code === "PGRST116") return bad("Not found", 404);
        return bad(formatScheduledRemindersDbError(curErr.message), 500);
      }
      if (!cur) return bad("Not found", 404);
      const rf = cur.repeat_frequency as RepeatFrequency;
      if (rf === "once") {
        const { data, error } = await sb
          .from("scheduled_reminders")
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", u.user.id)
          .select("*")
          .single();
        if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
        return NextResponse.json({ ok: true, reminder: dbRowToReminder(data as never) });
      }
      const nextDue = nextDueAfterPaidYmd(cur.due_date, rf);
      const { data, error } = await sb
        .from("scheduled_reminders")
        .update({ due_date: nextDue, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", u.user.id)
        .select("*")
        .single();
      if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
      return NextResponse.json({ ok: true, reminder: dbRowToReminder(data as never) });
    }

    const update = reminderPatchToUpdate(patch);
    const meaningfulKeys = Object.keys(update).filter((k) => k !== "updated_at");
    if (!meaningfulKeys.length) return bad("No valid fields to update");

    const { data, error } = await sb
      .from("scheduled_reminders")
      .update(update)
      .eq("id", id)
      .eq("user_id", u.user.id)
      .select("*")
      .single();
    if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
    return NextResponse.json({ ok: true, reminder: dbRowToReminder(data as never) });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function DELETE(_request: Request, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  const { id } = await Promise.resolve(ctx.params);
  if (!id) return bad("Missing id");
  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);
    const { error } = await sb.from("scheduled_reminders").delete().eq("id", id).eq("user_id", u.user.id);
    if (error) return bad(formatScheduledRemindersDbError(error.message), 500);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
