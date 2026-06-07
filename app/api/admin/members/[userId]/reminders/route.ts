import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import { sendMembershipReminderForAdmin } from "@/lib/membership-renewal-reminders/cron-dispatch";
import { MEMBERSHIP_AUTO_REMINDER_TYPES } from "@/lib/membership-renewal-reminders/reminder-next";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string }> };

type Body = {
  action?: "preview" | "send_now" | "resend_last";
};

export async function POST(request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body.action === "preview" || body.action === "send_now" || body.action === "resend_last" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be preview, send_now, or resend_last" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const authUser = authData.user;
  const emailAddr = authUser.email;
  if (!emailAddr) {
    return NextResponse.json({ error: "User has no email on file" }, { status: 400 });
  }
  const email = emailAddr.trim();

  const { data: prof } = await admin
    .from("profiles")
    .select("plan_type, suspended_at, expires_at")
    .eq("id", userId)
    .maybeSingle();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = prof?.plan_type;
  if (plan !== "premium" && plan !== "elite") {
    return NextResponse.json({ error: "Reminders apply to premium or elite members only" }, { status: 400 });
  }
  if (prof?.suspended_at) {
    return NextResponse.json({ error: "Suspended accounts cannot receive renewal reminders" }, { status: 400 });
  }

  const expiresAtIso = prof?.expires_at ?? sub?.current_period_end ?? null;
  if (!expiresAtIso) {
    return NextResponse.json({ error: "Member has no expiry date on file" }, { status: 400 });
  }

  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";
  const { data: up } = await admin.from("user_profiles").select("display_name").eq("id", userId).maybeSingle();
  const display = up?.display_name?.trim();
  const memberName = display || fromMeta || email.split("@")[0] || "Member";
  const paidPlan = plan === "elite" ? "elite" : "premium";

  if (action === "preview") {
    const r = await sendMembershipReminderForAdmin(admin, {
      userId,
      email,
      memberName,
      plan: paidPlan,
      expiresAtIso,
      rowReminderType: "admin_send",
      previewOnly: true,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    return NextResponse.json({ ok: true, preview: r.preview });
  }

  if (action === "send_now") {
    const r = await sendMembershipReminderForAdmin(admin, {
      userId,
      email,
      memberName,
      plan: paidPlan,
      expiresAtIso,
      rowReminderType: "admin_send",
      previewOnly: false,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    return NextResponse.json({ ok: true, resendId: r.resendId });
  }

  const { data: last } = await admin
    .from("membership_reminder_emails")
    .select("reminder_type")
    .eq("user_id", userId)
    .eq("delivery_status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last?.reminder_type) {
    return NextResponse.json({ error: "No successful reminder to resend" }, { status: 400 });
  }

  const autoList = MEMBERSHIP_AUTO_REMINDER_TYPES as readonly string[];
  let contentKind: AutoReminderType | "admin_send" = "admin_send";
  if (autoList.includes(last.reminder_type)) {
    contentKind = last.reminder_type as AutoReminderType;
  }

  const r = await sendMembershipReminderForAdmin(admin, {
    userId,
    email,
    memberName,
    plan: paidPlan,
    expiresAtIso,
    rowReminderType: "admin_resend",
    contentKind,
    previewOnly: false,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true, resendId: r.resendId });
}
