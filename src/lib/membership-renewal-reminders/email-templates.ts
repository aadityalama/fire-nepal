import type { AutoReminderType } from "@/lib/membership-renewal-reminders/reminder-eligibility";

export type RenewalEmailBranding = {
  memberName: string;
  planLabel: string;
  expiryDateFormatted: string;
  renewalUrl: string;
};

const BRAND = {
  accent: "#10b981",
  bg: "#04120d",
  text: "#e4e4e7",
  muted: "#a1a1aa",
};

function shell(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#020806;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${BRAND.text};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020806;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BRAND.bg};border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:24px 28px;border-bottom:1px solid rgba(16,185,129,0.25);">
<p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.accent};font-weight:800;">FIRE Nepal</p>
<h1 style="margin:10px 0 0;font-size:22px;font-weight:900;color:#fff;">Membership renewal</h1>
</td></tr>
<tr><td style="padding:26px 28px 32px;">${inner}</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:${BRAND.muted};">
You are receiving this because you have a FIRE Nepal membership. Questions? Reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;
}

function cta(renewalUrl: string): string {
  return `<p style="margin:24px 0 0;">
<a href="${renewalUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">Renew on FIRE Nepal</a>
</p>`;
}

export function buildRenewalReminderEmail(
  kind: AutoReminderType | "admin_send",
  b: RenewalEmailBranding,
): { subject: string; html: string; text: string } {
  const intro = `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Hi <strong>${escapeHtml(b.memberName)}</strong>,</p>`;
  const planLine = `<p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:${BRAND.muted};">Plan: <strong style="color:#fff;">${escapeHtml(b.planLabel)}</strong></p>`;
  const expLine = `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${BRAND.muted};">Current access ends: <strong style="color:#fff;">${escapeHtml(b.expiryDateFormatted)}</strong></p>`;

  let body = "";
  let subject = "";
  switch (kind) {
    case "expiry_7_days":
      subject = "Your FIRE Nepal membership renews in 7 days";
      body = `${intro}${planLine}${expLine}<p style="margin:0;font-size:15px;line-height:1.55;">Your membership will expire in <strong>seven days</strong>. Renew now to keep Premium tools, portfolio sync, and the full FIRE Nepal experience without interruption.</p>${cta(b.renewalUrl)}`;
      break;
    case "expiry_3_days":
      subject = "3 days left on your FIRE Nepal membership";
      body = `${intro}${planLine}${expLine}<p style="margin:0;font-size:15px;line-height:1.55;">Only <strong>three days</strong> remain on your current term. Renew today to avoid losing paid features.</p>${cta(b.renewalUrl)}`;
      break;
    case "expiry_today":
      subject = "Your FIRE Nepal membership expires today";
      body = `${intro}${planLine}${expLine}<p style="margin:0;font-size:15px;line-height:1.55;">Your membership <strong>ends today</strong>. You can still renew to extend access immediately.</p>${cta(b.renewalUrl)}`;
      break;
    case "expired_7_days":
      subject = "We miss you — renew your FIRE Nepal membership";
      body = `${intro}${planLine}${expLine}<p style="margin:0;font-size:15px;line-height:1.55;">Your paid access ended a week ago. You can rejoin anytime — your data stays on your account where supported.</p>${cta(b.renewalUrl)}`;
      break;
    default:
      subject = "FIRE Nepal membership reminder";
      body = `${intro}${planLine}${expLine}<p style="margin:0;font-size:15px;line-height:1.55;">This is a reminder about your FIRE Nepal membership.</p>${cta(b.renewalUrl)}`;
  }

  const html = shell(body);
  const text = `${subject}\n\nHi ${b.memberName},\nPlan: ${b.planLabel}\nAccess ends: ${b.expiryDateFormatted}\n\nRenew: ${b.renewalUrl}\n`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
