import { NextResponse } from "next/server";
import { scheduleAdminNotification, sendAdminNewUserEmail } from "@/lib/admin-notifications";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = { userId?: string };

const LOG_PREFIX = "[FIRE Nepal admin-notify]";

/**
 * Called by the browser after Supabase `signUp` succeeds so admin email does not block signup.
 * The service role loads the user by id (client cannot forge arbitrary profiles).
 * Email send is fire-and-forget via `scheduleAdminNotification` — registration never fails on notify errors.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const u = data.user;
  const email = (u.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "User has no email." }, { status: 400 });
  }

  // Only notify for freshly created accounts (signup window). Prevents re-POSTing old userIds
  // and avoids treating ordinary logins / stale retries as new registrations.
  const createdMs = u.created_at ? Date.parse(u.created_at) : NaN;
  const MAX_AGE_MS = 15 * 60 * 1000;
  if (!Number.isFinite(createdMs) || Date.now() - createdMs > MAX_AGE_MS) {
    console.info(
      LOG_PREFIX,
      JSON.stringify({ event: "skip_new_user", reason: "user_not_recently_created", userId: u.id }),
    );
    return NextResponse.json({ ok: true, skipped: true, reason: "not_recent" });
  }

  // Supabase may return an existing user on repeated signUp (empty identities) — do not notify.
  const identities = Array.isArray(u.identities) ? u.identities : null;
  if (identities && identities.length === 0) {
    console.info(
      LOG_PREFIX,
      JSON.stringify({ event: "skip_new_user", reason: "existing_user_signup_attempt", userId: u.id }),
    );
    return NextResponse.json({ ok: true, skipped: true, reason: "existing_user" });
  }

  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    "";

  const { data: profileRow } = await admin.from("user_profiles").select("full_name").eq("id", u.id).maybeSingle();
  const name = profileRow?.full_name?.trim() || metaName || "";
  const registeredAtIso = u.created_at ?? new Date().toISOString();

  console.info(LOG_PREFIX, JSON.stringify({ event: "signup_notify_queued", userId: u.id }));

  scheduleAdminNotification(async () => {
    await sendAdminNewUserEmail({
      name,
      email,
      userId: u.id,
      registeredAtIso,
      admin,
    });
  });

  return NextResponse.json({ ok: true });
}
