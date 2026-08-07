import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getUserEmailNotificationsEnabled,
  upsertUserEmailNotificationsEnabled,
} from "@/lib/scheduled-reminders/email-lifecycle";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);
    const enabled = await getUserEmailNotificationsEnabled(sb as never, u.user.id);
    return NextResponse.json({
      ok: true,
      emailNotificationsEnabled: enabled,
      registeredEmail: u.user.email ?? null,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

/**
 * Persist global email preference and immediately enable/disable email on all
 * active (incomplete, non-archived) reminders for this user.
 */
export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Invalid JSON");
  }
  if (!raw || typeof raw !== "object") return bad("Invalid body");
  const enabled = (raw as { emailNotificationsEnabled?: unknown }).emailNotificationsEnabled;
  if (typeof enabled !== "boolean") return bad("emailNotificationsEnabled must be a boolean");

  try {
    const sb = await createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return bad("Unauthorized", 401);

    const upsert = await upsertUserEmailNotificationsEnabled(sb as never, u.user.id, enabled);
    if (!upsert.ok) return bad(upsert.error, 500);

    const { error: syncErr } = await sb
      .from("scheduled_reminders")
      .update({ email_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("user_id", u.user.id)
      .eq("is_completed", false)
      .eq("is_archived", false);

    if (syncErr) {
      // Soft-fail if columns not migrated yet — preference row still saved.
      console.warn("[reminders/preferences] could not sync email_enabled on reminders:", syncErr.message);
    }

    return NextResponse.json({
      ok: true,
      emailNotificationsEnabled: enabled,
      registeredEmail: u.user.email ?? null,
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
