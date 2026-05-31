import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";

const LOG_PREFIX = "[FIRE Nepal auth][verification-email]";

function maskRecipient(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "(invalid)";
  const safeLocal = local.length <= 2 ? "***" : `${local.slice(0, 2)}…`;
  return `${safeLocal}@${domain}`;
}

export type SendVerificationEmailResult =
  | { ok: true; resendId?: string; httpStatus: number }
  | { ok: false; httpStatus: number; message: string };

/**
 * Sends the legacy product-auth 6-digit OTP via Resend (HTML + plain text).
 */
export async function sendSignupVerificationOtpEmail(params: {
  toEmail: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}): Promise<SendVerificationEmailResult> {
  const { toEmail, name, otp, expiresInMinutes } = params;
  const from = resolveResendFromAddress();
  const subject = `${otp} is your FIRE Nepal verification code`;

  const text = [
    `Hi ${name},`,
    "",
    `Your FIRE Nepal verification code is: ${otp}`,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not create an account, you can ignore this email.",
    "",
    "— FIRE Nepal",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;">
  <p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
  <p style="margin:0 0 8px;">Your verification code is:</p>
  <p style="margin:16px 0;font-size:28px;font-weight:800;letter-spacing:0.2em;color:#6ee7b7;">${escapeHtml(otp)}</p>
  <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">Expires in ${expiresInMinutes} minutes.</p>
  <p style="margin:0;color:#64748b;font-size:13px;">If you did not sign up for FIRE Nepal, you can ignore this message.</p>
</body></html>`;

  const masked = maskRecipient(toEmail);
  console.info(
    `${LOG_PREFIX} send_attempt`,
    JSON.stringify({ to: masked, fromConfigured: Boolean(from), subjectLen: subject.length }),
  );

  const r = await sendEmailViaResend({
    from,
    to: [toEmail],
    subject,
    text,
    html,
  });

  if (r.ok) {
    console.info(
      `${LOG_PREFIX} send_ok`,
      JSON.stringify({ to: masked, httpStatus: r.status, resendId: r.id ?? null }),
    );
    return { ok: true, resendId: r.id, httpStatus: r.status };
  }

  console.error(
    `${LOG_PREFIX} send_failed`,
    JSON.stringify({ to: masked, httpStatus: r.status, message: r.message.slice(0, 300) }),
  );
  return { ok: false, httpStatus: r.status, message: r.message };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
