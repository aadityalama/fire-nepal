import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteOrigin } from "@/lib/brand/site-seo";
import {
  buildPlanSelectionEmail,
  resolvePlanSelectionLogoUrl,
} from "@/lib/membership-plan-selection-email/email-templates";
import { buildPlanSelectionUrl } from "@/lib/membership-plan-selection-email/invite-token";
import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import type { Database } from "@/types/supabase-database";

const LOG_PREFIX = "[FIRE Nepal plan-selection-email]";

/** Block accidental re-sends within this window (ms). */
export const PLAN_SELECTION_EMAIL_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const PLAN_SELECTION_EMAIL_SUCCESS_MESSAGE = "Plan selection email sent successfully.";

type ServiceSb = SupabaseClient<Database>;

function redactEmailLikeSubstrings(s: string): string {
  return s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]");
}

function safeLogDetail(s: string, maxLen: number): string {
  return redactEmailLikeSubstrings(s).slice(0, maxLen);
}

function isUniqueViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const msg = err.message ?? "";
  return msg.includes("duplicate") || msg.includes("unique");
}

export type SendPlanSelectionEmailResult =
  | { ok: true; resendId?: string; message: string }
  | { ok: false; status: number; error: string; code?: string };

async function resolveVerifiedEmail(
  admin: ServiceSb,
  userId: string,
): Promise<{ email: string } | { error: string; status: number; code: string }> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return { error: "User not found", status: 404, code: "user_not_found" };
    }
    const email = data.user.email?.trim().toLowerCase() ?? "";
    if (!email || !email.includes("@")) {
      return { error: "Member does not have a verified email address.", status: 400, code: "email_missing" };
    }
    if (!data.user.email_confirmed_at) {
      return {
        error: "Member does not have a verified email address.",
        status: 400,
        code: "email_not_verified",
      };
    }
    return { email };
  } catch {
    return { error: "Could not verify member email.", status: 500, code: "auth_lookup_failed" };
  }
}

async function recentlySent(admin: ServiceSb, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - PLAN_SELECTION_EMAIL_DEDUP_WINDOW_MS).toISOString();
  const { data } = await admin
    .from("membership_plan_selection_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("delivery_status", "sent")
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

/**
 * Admin Quick Action: email a Free member a secure plan-selection link.
 * Enforces Free-only + verified email + 24h dedupe.
 */
export async function sendPlanSelectionEmailForAdmin(
  admin: ServiceSb,
  input: { userId: string; memberName: string; plan: string },
): Promise<SendPlanSelectionEmailResult> {
  const { userId, memberName, plan } = input;

  if (plan !== "free") {
    return {
      ok: false,
      status: 400,
      error: "Plan selection emails apply to Free members only.",
      code: "not_free",
    };
  }

  if (!isResendApiKeyConfigured()) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: "resend_not_configured", userId }));
    return { ok: false, status: 503, error: "Email provider is not configured.", code: "resend_not_configured" };
  }

  if (await recentlySent(admin, userId)) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: "already_sent_recently", userId }));
    return {
      ok: false,
      status: 409,
      error: "A plan selection email was already sent recently. Please wait before sending again.",
      code: "duplicate",
    };
  }

  const recipient = await resolveVerifiedEmail(admin, userId);
  if ("error" in recipient) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: recipient.code, userId }));
    await admin.from("membership_plan_selection_emails").insert({
      user_id: userId,
      email: "unknown",
      delivery_status: "skipped",
      subject: null,
      provider_message: recipient.code,
      resend_id: null,
    });
    return { ok: false, status: recipient.status, error: recipient.error, code: recipient.code };
  }

  const siteOrigin = getSiteOrigin();
  const planSelectionUrl = buildPlanSelectionUrl(userId, siteOrigin);
  const tpl = buildPlanSelectionEmail({
    memberName,
    planSelectionUrl,
    logoUrl: resolvePlanSelectionLogoUrl(siteOrigin),
  });

  const sendRes = await sendEmailViaResend({
    from: resolveResendFromAddress(),
    to: [recipient.email],
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  if (!sendRes.ok) {
    console.error(
      LOG_PREFIX,
      JSON.stringify({
        event: "send_failed",
        userId,
        status: sendRes.status,
        message: safeLogDetail(sendRes.message, 500),
      }),
    );
    await admin.from("membership_plan_selection_emails").insert({
      user_id: userId,
      email: recipient.email,
      delivery_status: "failed",
      subject: tpl.subject,
      provider_message: sendRes.message.slice(0, 2000),
      resend_id: null,
    });
    return { ok: false, status: 502, error: "Failed to send plan selection email. Please try again.", code: "send_failed" };
  }

  const { error: insErr } = await admin.from("membership_plan_selection_emails").insert({
    user_id: userId,
    email: recipient.email,
    delivery_status: "sent",
    subject: tpl.subject,
    provider_message: null,
    resend_id: sendRes.id ?? null,
  });

  if (insErr && isUniqueViolation(insErr)) {
    return {
      ok: false,
      status: 409,
      error: "A plan selection email was already sent recently. Please wait before sending again.",
      code: "duplicate",
    };
  }

  console.info(
    LOG_PREFIX,
    JSON.stringify({ event: "sent", userId, status: sendRes.status, resendId: sendRes.id ?? null }),
  );

  return { ok: true, resendId: sendRes.id, message: PLAN_SELECTION_EMAIL_SUCCESS_MESSAGE };
}
