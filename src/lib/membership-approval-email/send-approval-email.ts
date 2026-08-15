import type { SupabaseClient } from "@supabase/supabase-js";
import { scheduleAdminNotification } from "@/lib/admin-notifications";
import { getSiteOrigin } from "@/lib/brand/site-seo";
import {
  buildMembershipApprovalEmail,
  membershipPlanViewUrl,
  resolveApprovalEmailLogoUrl,
} from "@/lib/membership-approval-email/email-templates";
import type { MembershipPaymentMethod, MembershipRequestPlan } from "@/lib/membership-payment";
import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import type { Database } from "@/types/supabase-database";

const LOG_PREFIX = "[FIRE Nepal membership-approval-email]";

export type MembershipApprovalEmailParams = {
  membershipRequestId: string;
  userId: string;
  /** Email snapshot stored on the membership request at submit time. */
  requestEmail: string;
  plan: MembershipRequestPlan;
  amountNpr: number;
  paymentMethod: MembershipPaymentMethod;
  /** User-entered payment/txn reference when present; otherwise request id is used. */
  paymentReference: string | null;
  approvedAtIso: string;
  expiryAtIso: string;
};

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

async function resolveVerifiedRecipientEmail(
  admin: ServiceSb,
  userId: string,
): Promise<{ email: string | null; reason?: string }> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return { email: null, reason: "auth_user_lookup_failed" };
    }
    const authEmail = data.user.email?.trim().toLowerCase() ?? "";
    if (!authEmail || !authEmail.includes("@")) {
      return { email: null, reason: "auth_email_missing" };
    }
    if (!data.user.email_confirmed_at) {
      return { email: null, reason: "email_not_verified" };
    }
    return { email: authEmail };
  } catch {
    // Do not send without confirming email_confirmed_at from Auth.
    return { email: null, reason: "auth_lookup_exception" };
  }
}

async function resolveMemberName(admin: ServiceSb, userId: string): Promise<string> {
  const { data } = await admin.from("user_profiles").select("full_name, display_name").eq("id", userId).maybeSingle();
  const full = data?.full_name?.trim();
  if (full) return full;
  const display = data?.display_name?.trim();
  if (display) return display;
  return "Member";
}

async function alreadySent(admin: ServiceSb, membershipRequestId: string): Promise<boolean> {
  const { data } = await admin
    .from("membership_approval_emails")
    .select("id")
    .eq("membership_request_id", membershipRequestId)
    .eq("delivery_status", "sent")
    .maybeSingle();
  return Boolean(data?.id);
}

async function logDelivery(
  admin: ServiceSb,
  row: {
    membership_request_id: string;
    user_id: string;
    email: string;
    delivery_status: "sent" | "failed" | "skipped";
    subject: string | null;
    provider_message: string | null;
    resend_id: string | null;
  },
): Promise<"ok" | "duplicate" | "error"> {
  const { error } = await admin.from("membership_approval_emails").insert(row);
  if (!error) return "ok";
  if (isUniqueViolation(error)) return "duplicate";
  console.error(
    LOG_PREFIX,
    JSON.stringify({
      event: "delivery_log_failed",
      membershipRequestId: row.membership_request_id,
      message: safeLogDetail(error.message, 400),
    }),
  );
  return "error";
}

/**
 * Sends the member payment-plan approval email after a successful admin approve.
 * Idempotent per membership_request_id (unique partial index on successful sends).
 */
export async function sendMembershipApprovalEmail(
  admin: ServiceSb,
  params: MembershipApprovalEmailParams,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const {
    membershipRequestId,
    userId,
    requestEmail,
    plan,
    amountNpr,
    paymentMethod,
    paymentReference,
    approvedAtIso,
    expiryAtIso,
  } = params;

  if (!isResendApiKeyConfigured()) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: "resend_not_configured", membershipRequestId }));
    return { ok: false, skipped: true, reason: "resend_not_configured" };
  }

  if (await alreadySent(admin, membershipRequestId)) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: "already_sent", membershipRequestId }));
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  const recipient = await resolveVerifiedRecipientEmail(admin, userId);
  if (!recipient.email) {
    console.info(
      LOG_PREFIX,
      JSON.stringify({
        event: "skip",
        reason: recipient.reason ?? "no_verified_email",
        membershipRequestId,
        userId,
      }),
    );
    await logDelivery(admin, {
      membership_request_id: membershipRequestId,
      user_id: userId,
      email: requestEmail.trim().toLowerCase() || "unknown",
      delivery_status: "skipped",
      subject: null,
      provider_message: recipient.reason ?? "no_verified_email",
      resend_id: null,
    });
    return { ok: false, skipped: true, reason: recipient.reason ?? "no_verified_email" };
  }

  const siteOrigin = getSiteOrigin();
  const memberName = await resolveMemberName(admin, userId);
  const referenceId = (paymentReference?.trim() || membershipRequestId).slice(0, 200);
  const tpl = buildMembershipApprovalEmail({
    memberName,
    referenceId,
    plan,
    amountNpr,
    paymentMethod,
    approvedAtIso,
    expiryAtIso,
    viewPlanUrl: membershipPlanViewUrl(siteOrigin),
    logoUrl: resolveApprovalEmailLogoUrl(siteOrigin),
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
        membershipRequestId,
        userId,
        status: sendRes.status,
        message: safeLogDetail(sendRes.message, 500),
      }),
    );
    await logDelivery(admin, {
      membership_request_id: membershipRequestId,
      user_id: userId,
      email: recipient.email,
      delivery_status: "failed",
      subject: tpl.subject,
      provider_message: sendRes.message.slice(0, 2000),
      resend_id: null,
    });
    return { ok: false, reason: "send_failed" };
  }

  const logResult = await logDelivery(admin, {
    membership_request_id: membershipRequestId,
    user_id: userId,
    email: recipient.email,
    delivery_status: "sent",
    subject: tpl.subject,
    provider_message: null,
    resend_id: sendRes.id ?? null,
  });

  if (logResult === "duplicate") {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip", reason: "already_sent_race", membershipRequestId }));
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  console.info(
    LOG_PREFIX,
    JSON.stringify({
      event: "sent",
      membershipRequestId,
      userId,
      status: sendRes.status,
      resendId: sendRes.id ?? null,
    }),
  );
  return { ok: true };
}

/** Fire-and-forget after the HTTP response — never blocks or fails the approve API. */
export function scheduleMembershipApprovalEmail(admin: ServiceSb, params: MembershipApprovalEmailParams): void {
  scheduleAdminNotification(async () => {
    await sendMembershipApprovalEmail(admin, params);
  });
}
