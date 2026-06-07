import "server-only";

import { format, parseISO } from "date-fns";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/admin/list-all-auth-users";
import { buildRenewalReminderEmail } from "@/lib/membership-renewal-reminders/email-templates";
import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import { autoReminderDue } from "@/lib/membership-renewal-reminders/reminder-eligibility";
import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase-database";

const MAX_SENDS_PER_RUN = 120;

type ProfileRow = {
  id: string;
  plan_type: string;
  expires_at: string | null;
  suspended_at: string | null;
};

function displayName(u: User): string {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    "";
  return fromMeta || u.email?.split("@")[0] || "Member";
}

export type MembershipRenewalCronResult = {
  ok: boolean;
  error?: string;
  candidates: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function runMembershipRenewalRemindersCron(now: Date = new Date()): Promise<MembershipRenewalCronResult> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Service role client unavailable", candidates: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/+$/, "") || "https://firenepal.com";
  const renewalUrl = `${origin}/dashboard/membership`;

  const { users, error: listErr } = await listAllAuthUsers();
  if (listErr) {
    return { ok: false, error: listErr, candidates: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const userById = new Map(users.map((u) => [u.id, u]));

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, plan_type, expires_at, suspended_at")
    .in("plan_type", ["premium", "elite"]);
  if (pErr) {
    return { ok: false, error: pErr.message, candidates: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const { data: subs, error: sErr } = await admin.from("subscriptions").select("user_id, current_period_end");
  if (sErr) {
    return { ok: false, error: sErr.message, candidates: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const subEnd = new Map((subs ?? []).map((r) => [r.user_id, r.current_period_end]));

  let candidates = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of profiles ?? []) {
    if (sent + failed >= MAX_SENDS_PER_RUN) break;

    const prof = row as ProfileRow;
    if (prof.suspended_at) continue;
    const expiresIso = prof.expires_at ?? subEnd.get(prof.id) ?? null;
    if (!expiresIso) continue;
    const exp = parseISO(expiresIso);
    if (Number.isNaN(exp.getTime())) continue;

    const due = autoReminderDue(exp, now);
    if (!due) continue;

    candidates += 1;

    const { data: sentDup } = await admin
      .from("membership_reminder_emails")
      .select("id")
      .eq("user_id", prof.id)
      .eq("reminder_type", due)
      .eq("expires_at", expiresIso)
      .eq("delivery_status", "sent")
      .maybeSingle();
    if (sentDup) {
      skipped += 1;
      continue;
    }

    const u = userById.get(prof.id);
    const email = u?.email?.trim();
    if (!email) {
      skipped += 1;
      continue;
    }

    const plan = prof.plan_type === "elite" ? "elite" : "premium";
    const memberName = u ? displayName(u) : "Member";
    const expiryDateFormatted = format(exp, "MMMM d, yyyy");
    const planLabel = plan === "elite" ? "Elite" : "Premium";
    const tpl = buildRenewalReminderEmail(due, {
      memberName,
      planLabel,
      expiryDateFormatted,
      renewalUrl,
    });

    const sendRes = await sendEmailViaResend({
      from: resolveResendFromAddress(),
      to: [email],
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    const delivery_status = sendRes.ok ? "sent" : "failed";
    const { error: insErr } = await admin.from("membership_reminder_emails").insert({
      user_id: prof.id,
      email,
      reminder_type: due,
      delivery_status,
      membership_plan: plan,
      expires_at: expiresIso,
      subject: tpl.subject,
      provider_message: sendRes.ok ? null : sendRes.message.slice(0, 2000),
      resend_id: sendRes.ok ? sendRes.id ?? null : null,
    });

    if (insErr) {
      if (insErr.code === "23505") {
        skipped += 1;
        continue;
      }
      failed += 1;
      continue;
    }

    if (sendRes.ok) sent += 1;
    else failed += 1;
  }

  return { ok: true, candidates, sent, failed, skipped };
}

export async function sendMembershipReminderForAdmin(
  admin: SupabaseClient<Database>,
  input: {
    userId: string;
    email: string;
    memberName: string;
    plan: "premium" | "elite";
    expiresAtIso: string;
    /** Row written to membership_reminder_emails.reminder_type */
    rowReminderType: "admin_send" | "admin_resend";
    /** Template variant for HTML (defaults to admin_send) */
    contentKind?: AutoReminderType | "admin_send";
    previewOnly: boolean;
  },
): Promise<
  | { ok: true; preview?: { subject: string; html: string; text: string }; resendId?: string }
  | { ok: false; error: string }
> {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/+$/, "") || "https://firenepal.com";
  const renewalUrl = `${origin}/dashboard/membership`;
  const exp = parseISO(input.expiresAtIso);
  const expiryDateFormatted = Number.isNaN(exp.getTime()) ? input.expiresAtIso : format(exp, "MMMM d, yyyy");
  const planLabel = input.plan === "elite" ? "Elite" : "Premium";
  const templateKind: AutoReminderType | "admin_send" = input.contentKind ?? "admin_send";
  const tpl = buildRenewalReminderEmail(templateKind, {
    memberName: input.memberName,
    planLabel,
    expiryDateFormatted,
    renewalUrl,
  });

  if (input.previewOnly) {
    return { ok: true, preview: { subject: tpl.subject, html: tpl.html, text: tpl.text } };
  }

  const sendRes = await sendEmailViaResend({
    from: resolveResendFromAddress(),
    to: [input.email],
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  const { error: insErr } = await admin.from("membership_reminder_emails").insert({
    user_id: input.userId,
    email: input.email,
    reminder_type: input.rowReminderType,
    delivery_status: sendRes.ok ? "sent" : "failed",
    membership_plan: input.plan,
    expires_at: input.expiresAtIso,
    subject: tpl.subject,
    provider_message: sendRes.ok ? null : sendRes.message.slice(0, 2000),
    resend_id: sendRes.ok ? sendRes.id ?? null : null,
  });
  if (insErr) {
    return { ok: false, error: insErr.message };
  }
  if (!sendRes.ok) {
    return { ok: false, error: sendRes.message };
  }
  return { ok: true, resendId: sendRes.id };
}
