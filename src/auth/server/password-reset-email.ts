import { resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";

const LOG_PREFIX = "[FIRE Nepal auth][password-reset-email]";

function maskRecipient(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "(invalid)";
  const safeLocal = local.length <= 2 ? "***" : `${local.slice(0, 2)}…`;
  return `${safeLocal}@${domain}`;
}

export type SendPasswordResetEmailResult =
  | { ok: true; resendId?: string; httpStatus: number }
  | { ok: false; httpStatus: number; message: string };

export async function sendPasswordResetOtpEmail(params: {
  toEmail: string;
  otp: string;
  expiresInMinutes: number;
}): Promise<SendPasswordResetEmailResult> {
  const { toEmail, otp, expiresInMinutes } = params;
  const from = resolveResendFromAddress();
  const subject = `${otp} is your FIRE Nepal password reset code`;

  const text = [
    "Hi,",
    "",
    `Your FIRE Nepal password reset code is: ${otp}`,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a reset, you can ignore this email.",
    "",
    "— FIRE Nepal",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;">
  <p style="margin:0 0 8px;">Password reset code:</p>
  <p style="margin:16px 0;font-size:28px;font-weight:800;letter-spacing:0.2em;color:#6ee7b7;">${escapeHtml(otp)}</p>
  <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">Expires in ${expiresInMinutes} minutes.</p>
  <p style="margin:0;color:#64748b;font-size:13px;">If you did not request this, you can ignore this message.</p>
</body></html>`;

  const masked = maskRecipient(toEmail);
  console.info(`${LOG_PREFIX} send_attempt`, JSON.stringify({ to: masked }));

  const r = await sendEmailViaResend({
    from,
    to: [toEmail],
    subject,
    text,
    html,
  });

  if (r.ok) {
    console.info(`${LOG_PREFIX} send_ok`, JSON.stringify({ to: masked, httpStatus: r.status }));
    return { ok: true, resendId: r.id, httpStatus: r.status };
  }
  console.error(`${LOG_PREFIX} send_failed`, JSON.stringify({ to: masked, httpStatus: r.status }));
  return { ok: false, httpStatus: r.status, message: r.message };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
