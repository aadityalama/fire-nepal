import { after } from "next/server";
import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";

const LOG_PREFIX = "[FIRE Nepal admin-notify]";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAdminNewUserEmail(params: {
  name: string;
  email: string;
  userId: string;
  registeredAtIso: string;
}): Promise<void> {
  const to = readAdminNotificationEmail();
  if (!to) {
    console.info(LOG_PREFIX, JSON.stringify({ event: "skip_new_user", reason: "recipient_not_configured" }));
    return;
  }

  const { name, email, userId, registeredAtIso } = params;
  const subject = "🔥 New FIRE Nepal User Registered";
  const text = [
    "A new user registered on FIRE Nepal.",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `User ID: ${userId}`,
    `Registration time: ${registeredAtIso}`,
  ].join("\n");

  const html = `
    <p>A new user registered on FIRE Nepal.</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(name)}</li>
      <li><strong>Email:</strong> ${escapeHtml(email)}</li>
      <li><strong>User ID:</strong> <code>${escapeHtml(userId)}</code></li>
      <li><strong>Registration time:</strong> ${escapeHtml(registeredAtIso)}</li>
    </ul>
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
        event: "new_user_email_failed",
        status: r.status,
        message: safeLogDetail(r.message, 500),
      }),
    );
  } else {
    console.info(LOG_PREFIX, JSON.stringify({ event: "new_user_email_sent", status: r.status, resendId: r.id ?? null }));
  }
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
