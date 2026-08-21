import { FIRE_NEPAL_CANONICAL_ORIGIN, getSiteOrigin } from "@/lib/brand/site-seo";
import {
  FIRE_NEPAL_EMAIL_CONTACT,
  resolveApprovalEmailLogoUrl,
} from "@/lib/membership-approval-email/email-templates";

export const ADMIN_NEW_USER_EMAIL_SUBJECT = "🔥 New FIRE Nepal User Registration";

const BRAND = {
  accent: "#10b981",
  bg: "#04120d",
  card: "#052116",
  text: "#e4e4e7",
  muted: "#a1a1aa",
  soft: "#bbf7d0",
};

export type AdminNewUserEmailInput = {
  name: string;
  email: string;
  userId: string;
  registeredAtIso: string;
  adminPanelUrl: string;
  logoUrl: string;
  accountStatus?: string;
};

export function adminPanelUrl(siteOrigin?: string): string {
  const origin = (siteOrigin || getSiteOrigin() || FIRE_NEPAL_CANONICAL_ORIGIN).replace(/\/+$/, "");
  return `${origin}/admin`;
}

export function formatRegistrationDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(d);
}

export function resolveAdminNewUserLogoUrl(siteOrigin?: string): string {
  return resolveApprovalEmailLogoUrl(siteOrigin);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailRow(label: string, valueHtml: string): string {
  return `<tr>
<td style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:${BRAND.muted};width:42%;">${escapeHtml(label)}</td>
<td style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:#fff;text-align:right;">${valueHtml}</td>
</tr>`;
}

function brandedFooter(logoUrl: string): string {
  const c = FIRE_NEPAL_EMAIL_CONTACT;
  const contactUrl = `${c.websiteUrl}${c.contactPath}`;
  return `<tr><td style="padding:28px 24px;background:#031710;color:${BRAND.soft};text-align:center;border-top:1px solid rgba(187,247,208,0.18);">
<img src="${escapeHtml(logoUrl)}" width="64" height="64" alt="FIRE Nepal logo" style="display:block;margin:0 auto 14px;width:64px;height:64px;border:0;border-radius:16px;object-fit:contain;background:#052116;"/>
<p style="margin:0;font-size:18px;font-weight:950;color:#ffffff;">${escapeHtml(c.brandName)}</p>
<p style="margin:6px 0 16px;font-size:12px;font-weight:800;letter-spacing:0.04em;color:${BRAND.soft};">${escapeHtml(c.tagline)}</p>
<p style="margin:0 0 6px;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#6ee7b7;">Official website</p>
<a href="${escapeHtml(c.websiteUrl)}" style="color:#7CFFB3;font-size:14px;font-weight:900;text-decoration:none;">${escapeHtml(c.websiteLabel)}</a>
<p style="margin:16px 0 6px;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#6ee7b7;">Contact</p>
<a href="mailto:${escapeHtml(c.supportEmail)}" style="color:#7CFFB3;font-size:14px;font-weight:900;text-decoration:none;">${escapeHtml(c.supportEmail)}</a>
<p style="margin:10px 0 0;">
<a href="${escapeHtml(contactUrl)}" style="color:#a7f3d0;font-size:13px;font-weight:800;text-decoration:underline;">Support / Contact</a>
</p>
<p style="margin:20px 0 0;font-size:11px;font-weight:700;color:#86efac;">${escapeHtml(c.copyright)}</p>
</td></tr>`;
}

/**
 * Branded admin alert for a newly registered FIRE Nepal account.
 * Never include passwords or auth secrets in this template.
 */
export function buildAdminNewUserEmail(input: AdminNewUserEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = input.name.trim() || "—";
  const email = input.email.trim();
  const userId = input.userId.trim();
  const registeredAt = formatRegistrationDateTime(input.registeredAtIso);
  const status = (input.accountStatus ?? "Active").trim() || "Active";
  const subject = ADMIN_NEW_USER_EMAIL_SUBJECT;
  const contactUrl = `${FIRE_NEPAL_EMAIL_CONTACT.websiteUrl}${FIRE_NEPAL_EMAIL_CONTACT.contactPath}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(subject)}</title>
<style>
@media only screen and (max-width:640px){
  .fn-shell{width:100%!important;}
  .fn-pad{padding:22px 18px!important;}
  .fn-cta{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:center!important;}
}
</style>
</head>
<body style="margin:0;background:#020806;font-family:Georgia,'Times New Roman',serif;color:${BRAND.text};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(160deg,#020806 0%,#031710 45%,#052116 100%);padding:24px 12px;">
<tr><td align="center">
<table class="fn-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${BRAND.bg};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td class="fn-pad" style="padding:26px 28px;border-bottom:1px solid rgba(16,185,129,0.28);background:linear-gradient(135deg,#052116 0%,#0f5132 70%);">
<p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.soft};font-weight:800;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">FIRE Nepal</p>
<h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;font-weight:900;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">New user registration</h1>
</td></tr>
<tr><td class="fn-pad" style="padding:28px 28px 8px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">A new user has registered on FIRE Nepal.</p>
<p style="margin:0 0 12px;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">User Details</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
${detailRow("Name", escapeHtml(name))}
${detailRow("Email", escapeHtml(email))}
${detailRow("User ID", `<code style="font-size:12px;font-weight:700;color:#fff;">${escapeHtml(userId)}</code>`)}
${detailRow("Registration Date", escapeHtml(registeredAt))}
${detailRow("Account Status", `<span style="color:${BRAND.accent};">${escapeHtml(status)}</span>`)}
</table>
<p style="margin:22px 0 8px;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">Admin Panel</p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:${BRAND.muted};">
<a href="${escapeHtml(input.adminPanelUrl)}" style="color:#7CFFB3;font-weight:800;text-decoration:underline;">${escapeHtml(input.adminPanelUrl)}</a>
</p>
<p style="margin:26px 0 8px;">
<a class="fn-cta" href="${escapeHtml(input.adminPanelUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">Open Admin Panel →</a>
</p>
<p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:${BRAND.muted};">Please review the new member from the Admin Panel if necessary.</p>
<p style="margin:20px 0 0;font-size:11px;color:${BRAND.muted};">This is an automated notification. Please do not reply to this email.</p>
</td></tr>
${brandedFooter(input.logoUrl)}
</table>
</td></tr></table>
</body></html>`;

  const text = [
    "A new user has registered on FIRE Nepal.",
    "",
    "User Details:",
    `• Name: ${name}`,
    `• Email: ${email}`,
    `• User ID: ${userId}`,
    `• Registration Date: ${registeredAt}`,
    `• Account Status: ${status}`,
    "",
    "Admin Panel:",
    input.adminPanelUrl,
    "",
    "Please review the new member from the Admin Panel if necessary.",
    "",
    FIRE_NEPAL_EMAIL_CONTACT.brandName,
    `Website: ${FIRE_NEPAL_EMAIL_CONTACT.websiteUrl}`,
    `Support: ${FIRE_NEPAL_EMAIL_CONTACT.supportEmail}`,
    `Contact: ${contactUrl}`,
    FIRE_NEPAL_EMAIL_CONTACT.copyright,
  ].join("\n");

  return { subject, html, text };
}
