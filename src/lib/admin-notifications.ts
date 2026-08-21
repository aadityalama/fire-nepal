import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import {
  adminPanelUrl,
  buildAdminNewUserEmail,
  resolveAdminNewUserLogoUrl,
} from "@/lib/admin-new-user-email/email-templates";
import { getSiteOrigin } from "@/lib/brand/site-seo";
import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import type { Database } from "@/types/supabase-database";

const LOG_PREFIX = "[FIRE Nepal admin-notify]";

type ServiceSb = SupabaseClient<Database>;

/** Process-local dedupe so one signup cannot fan out multiple Resend sends in the same runtime. */
const sentUserIds = new Set<string>();
const inflightUserIds = new Set<string>();

/** Server-only: never log, return in API JSON, or ship to the client. */
function readAdminNotificationEmail(): string | null {
  const v = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  if (!v || !v.includes("@")) return null;
  return v;
}

/** Strip email-like substrings so provider error bodies cannot leak the admin inbox. */
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

function isMissingRelation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("could not find the table");
}

/**
 * Runs work after the response is sent (Next.js `after`). Falls back to fire-and-forget
 * if `after` is unavailable. Never throws to the caller.
 */
export function scheduleAdminNotification(work: () => Promise<void>): void {
  const run = () =>
    work().catch((e) => {
      const raw = e instanceof Error ? e.stack ?? e.message : String(e);
      console.error(LOG_PREFIX, "background task failed:", safeLogDetail(raw, 800));
    });

  try {
    after(run);
  } catch {
    void run();
  }
}

async function alreadySentInDb(admin: ServiceSb, userId: string): Promise<boolean | "unavailable"> {
  try {
    const { data, error } = await admin
      .from("admin_new_user_emails")
      .select("id")
      .eq("user_id", userId)
      .eq("delivery_status", "sent")
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error)) return "unavailable";
      console.error(
        LOG_PREFIX,
        JSON.stringify({
          event: "dedupe_lookup_failed",
          userId,
          message: safeLogDetail(error.message, 400),
        }),
      );
      return false;
    }
    return Boolean(data?.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(LOG_PREFIX, JSON.stringify({ event: "dedupe_lookup_exception", userId, message: safeLogDetail(msg, 400) }));
    return false;
  }
}

async function logDelivery(
  admin: ServiceSb | null | undefined,
  row: {
    user_id: string;
    email: string;
    delivery_status: "sent" | "failed" | "skipped";
    subject: string | null;
    provider_message: string | null;
    resend_id: string | null;
  },
): Promise<"ok" | "duplicate" | "unavailable" | "error"> {
  if (!admin) return "unavailable";
  try {
    const { error } = await admin.from("admin_new_user_emails").insert(row);
    if (!error) return "ok";
    if (isMissingRelation(error)) return "unavailable";
    if (isUniqueViolation(error)) return "duplicate";
    console.error(
      LOG_PREFIX,
      JSON.stringify({
        event: "delivery_log_failed",
        userId: row.user_id,
        message: safeLogDetail(error.message, 400),
      }),
    );
    return "error";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      LOG_PREFIX,
      JSON.stringify({ event: "delivery_log_exception", userId: row.user_id, message: safeLogDetail(msg, 400) }),
    );
    return "error";
  }
}

export type SendAdminNewUserEmailParams = {
  name: string;
  email: string;
  userId: string;
  registeredAtIso: string;
  /** When provided, uses DB unique index for durable idempotency across instances. */
  admin?: ServiceSb | null;
};

export type SendAdminNewUserEmailResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

/**
 * Sends the admin new-user registration email via Resend.
 * Idempotent per userId (process memory + optional `admin_new_user_emails` table).
 * Never throws — failures are logged so signup can succeed independently.
 */
export async function sendAdminNewUserEmail(params: SendAdminNewUserEmailParams): Promise<SendAdminNewUserEmailResult> {
  const { name, email, userId, registeredAtIso, admin } = params;
  const normalizedUserId = userId.trim();
  const normalizedEmail = email.trim().toLowerCase();

  console.info(
    LOG_PREFIX,
    JSON.stringify({
      event: "signup_detected",
      userId: normalizedUserId,
    }),
  );

  if (!normalizedUserId) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "missing_user_id" }));
    return { ok: false, skipped: true, reason: "missing_user_id" };
  }

  if (sentUserIds.has(normalizedUserId)) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "already_sent_memory", userId: normalizedUserId }));
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  if (inflightUserIds.has(normalizedUserId)) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "inflight", userId: normalizedUserId }));
    return { ok: true, skipped: true, reason: "inflight" };
  }

  if (admin) {
    const dbSent = await alreadySentInDb(admin, normalizedUserId);
    if (dbSent === true) {
      sentUserIds.add(normalizedUserId);
      console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "already_sent", userId: normalizedUserId }));
      return { ok: true, skipped: true, reason: "already_sent" };
    }
  }

  const to = readAdminNotificationEmail();
  if (!to) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "recipient_not_configured", userId: normalizedUserId }));
    return { ok: false, skipped: true, reason: "recipient_not_configured" };
  }

  if (!isResendApiKeyConfigured()) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "resend_not_configured", userId: normalizedUserId }));
    return { ok: false, skipped: true, reason: "resend_not_configured" };
  }

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "invalid_user_email", userId: normalizedUserId }));
    return { ok: false, skipped: true, reason: "invalid_user_email" };
  }

  inflightUserIds.add(normalizedUserId);

  try {
    const siteOrigin = getSiteOrigin();
    const tpl = buildAdminNewUserEmail({
      name,
      email: normalizedEmail,
      userId: normalizedUserId,
      registeredAtIso,
      adminPanelUrl: adminPanelUrl(siteOrigin),
      logoUrl: resolveAdminNewUserLogoUrl(siteOrigin),
      accountStatus: "Active",
    });

    const r = await sendEmailViaResend({
      from: resolveResendFromAddress(),
      to: [to],
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    if (!r.ok) {
      console.error(
        LOG_PREFIX,
        JSON.stringify({
          event: "new_user_email_failed",
          userId: normalizedUserId,
          status: r.status,
          message: safeLogDetail(r.message, 500),
        }),
      );
      await logDelivery(admin, {
        user_id: normalizedUserId,
        email: normalizedEmail,
        delivery_status: "failed",
        subject: tpl.subject,
        provider_message: r.message.slice(0, 2000),
        resend_id: null,
      });
      return { ok: false, reason: "send_failed" };
    }

    const logResult = await logDelivery(admin, {
      user_id: normalizedUserId,
      email: normalizedEmail,
      delivery_status: "sent",
      subject: tpl.subject,
      provider_message: null,
      resend_id: r.id ?? null,
    });

    if (logResult === "duplicate") {
      sentUserIds.add(normalizedUserId);
      console.info(
        LOG_PREFIX,
        JSON.stringify({ event: "skip_new_user", reason: "already_sent_race", userId: normalizedUserId }),
      );
      return { ok: true, skipped: true, reason: "already_sent" };
    }

    sentUserIds.add(normalizedUserId);
    console.info(
      LOG_PREFIX,
      JSON.stringify({
        event: "new_user_email_sent",
        userId: normalizedUserId,
        status: r.status,
        resendId: r.id ?? null,
      }),
    );
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.stack ?? e.message : String(e);
    console.error(
      LOG_PREFIX,
      JSON.stringify({
        event: "new_user_email_failed",
        userId: normalizedUserId,
        message: safeLogDetail(raw, 500),
      }),
    );
    return { ok: false, reason: "exception" };
  } finally {
    inflightUserIds.delete(normalizedUserId);
  }
}

/** Test-only: clear process-local dedupe state. */
export function __resetAdminNewUserEmailDedupeForTests(): void {
  sentUserIds.clear();
  inflightUserIds.clear();
}

export async function sendAdminMembershipRequestEmail(params: {
  name: string;
  email: string;
  planLabel: string;
  amountNpr: number;
  submittedAtIso: string;
  paymentProofUrl: string;
  adminReviewUrl: string;
}): Promise<void> {
  const to = readAdminNotificationEmail();
  if (!to) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_membership_request", reason: "recipient_not_configured" }));
    return;
  }

  const { name, email, planLabel, amountNpr, submittedAtIso, paymentProofUrl, adminReviewUrl } = params;
  const subject = "💰 New Membership Purchase Request";
  const amountStr = `${amountNpr.toLocaleString("en-NP")} NPR`;

  const text = [
    "A membership payment request was submitted.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Plan: ${planLabel}`,
    `Amount: ${amountStr}`,
    `Submitted time: ${submittedAtIso}`,
    `Payment proof URL: ${paymentProofUrl}`,
    "",
    `Review queue: ${adminReviewUrl}`,
  ].join("\n");

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const html = `
    <p>A membership payment request was submitted.</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(name)}</li>
      <li><strong>Email:</strong> ${escapeHtml(email)}</li>
      <li><strong>Plan:</strong> ${escapeHtml(planLabel)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(amountStr)}</li>
      <li><strong>Submitted time:</strong> ${escapeHtml(submittedAtIso)}</li>
      <li><strong>Payment proof URL:</strong> ${
        paymentProofUrl.startsWith("http://") || paymentProofUrl.startsWith("https://")
          ? `<a href="${encodeURI(paymentProofUrl)}">Open proof</a>`
          : `<span>${escapeHtml(paymentProofUrl)}</span>`
      }</li>
    </ul>
    <p><a href="${encodeURI(adminReviewUrl)}">Open admin membership requests</a></p>
  `.trim();

  const r = await sendEmailViaResend({
    from: resolveResendFromAddress(),
    to: [to],
    subject,
    html,
    text,
  });

  if (!r.ok) {
    console.error(
      LOG_PREFIX,
      JSON.stringify({
        event: "membership_request_email_failed",
        status: r.status,
        message: safeLogDetail(r.message, 500),
      }),
    );
  } else {
    console.info(
      LOG_PREFIX,
      JSON.stringify({ event: "membership_request_email_sent", status: r.status, resendId: r.id ?? null }),
    );
  }
}
