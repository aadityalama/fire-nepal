import { NextResponse } from "next/server";
import { scheduleAdminNotification, sendAdminNewUserEmail } from "@/lib/admin-notifications";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = { userId?: string };

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    "";
  if (fromMeta) return fromMeta;
  const em = user.email?.split("@")[0];
  return em?.trim() || "Member";
}

/**
 * Called by the browser after Supabase `signUp` succeeds so admin email does not block signup.
 * The service role loads the user by id (client cannot forge arbitrary profiles).
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

  const name = displayNameFromUser(u);
  const registeredAtIso = u.created_at ?? new Date().toISOString();

  scheduleAdminNotification(async () => {
    await sendAdminNewUserEmail({
      name,
      email,
      userId: u.id,
      registeredAtIso,
    });
  });

  return NextResponse.json({ ok: true });
}
