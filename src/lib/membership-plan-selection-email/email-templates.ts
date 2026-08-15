import {
  FIRE_NEPAL_EMAIL_CONTACT,
  resolveApprovalEmailLogoUrl,
} from "@/lib/membership-approval-email/email-templates";
import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";

export const PLAN_SELECTION_EMAIL_SUBJECT = "Choose your FIRE Nepal membership plan";

export type PlanSelectionEmailInput = {
  memberName: string;
  planSelectionUrl: string;
  logoUrl: string;
};

const BRAND = {
  accent: "#10b981",
  bg: "#04120d",
  text: "#e4e4e7",
  muted: "#a1a1aa",
  soft: "#bbf7d0",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export function resolvePlanSelectionLogoUrl(siteOrigin?: string): string {
  return resolveApprovalEmailLogoUrl(siteOrigin || FIRE_NEPAL_CANONICAL_ORIGIN);
}

export function buildPlanSelectionEmail(input: PlanSelectionEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const memberName = input.memberName.trim() || "Member";
  const subject = PLAN_SELECTION_EMAIL_SUBJECT;
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
<body style="margin:0;background:#020806;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:${BRAND.text};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(160deg,#020806 0%,#031710 45%,#052116 100%);padding:24px 12px;">
<tr><td align="center">
<table class="fn-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${BRAND.bg};border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td class="fn-pad" style="padding:26px 28px;border-bottom:1px solid rgba(16,185,129,0.28);background:linear-gradient(135deg,#052116 0%,#0f5132 70%);">
<p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.soft};font-weight:800;">FIRE Nepal</p>
<h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;font-weight:900;color:#fff;">Choose your membership plan</h1>
</td></tr>
<tr><td class="fn-pad" style="padding:28px 28px 8px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hello <strong style="color:#fff;">${escapeHtml(memberName)}</strong>,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">You're invited to choose a FIRE Nepal membership plan. Open the secure link below to review <strong style="color:#fff;">Premium</strong> and <strong style="color:#fff;">Elite</strong>, then continue with payment.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${BRAND.muted};">This link opens your membership plan-selection page. Sign in with your verified FIRE Nepal account to continue.</p>
<p style="margin:26px 0 8px;">
<a class="fn-cta" href="${escapeHtml(input.planSelectionUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">Choose Premium or Elite →</a>
</p>
<p style="margin:22px 0 0;font-size:15px;line-height:1.6;">Thank you for choosing FIRE Nepal.</p>
<p style="margin:18px 0 0;font-size:14px;line-height:1.55;">
Best regards,<br/>
<strong style="color:#fff;">FIRE Nepal Team</strong><br/>
<span style="color:${BRAND.muted};font-size:13px;">${escapeHtml(FIRE_NEPAL_EMAIL_CONTACT.tagline)}</span>
</p>
<p style="margin:20px 0 0;font-size:11px;color:${BRAND.muted};">This is an automated notification. Please do not reply to this email.</p>
</td></tr>
${brandedFooter(input.logoUrl)}
</table>
</td></tr></table>
</body></html>`;

  const text = [
    subject,
    "",
    `Hello ${memberName},`,
    "",
    "You're invited to choose a FIRE Nepal membership plan. Open the secure link below to review Premium and Elite, then continue with payment.",
    "",
    `Choose Premium or Elite → ${input.planSelectionUrl}`,
    "",
    "Sign in with your verified FIRE Nepal account to continue.",
    "",
    "Best regards,",
    "FIRE Nepal Team",
    FIRE_NEPAL_EMAIL_CONTACT.tagline,
    "",
    "This is an automated notification. Please do not reply to this email.",
    "",
    FIRE_NEPAL_EMAIL_CONTACT.brandName,
    `Website: ${FIRE_NEPAL_EMAIL_CONTACT.websiteUrl}`,
    `Support: ${FIRE_NEPAL_EMAIL_CONTACT.supportEmail}`,
    `Contact: ${contactUrl}`,
    FIRE_NEPAL_EMAIL_CONTACT.copyright,
  ].join("\n");

  return { subject, html, text };
}
