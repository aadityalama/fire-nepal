import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import { PAYMENT_METHOD_LABEL, type MembershipPaymentMethod, type MembershipRequestPlan } from "@/lib/membership-payment";

export const MEMBERSHIP_APPROVAL_EMAIL_SUBJECT = "🎉 Your FIRE Nepal Payment Plan Has Been Approved";

/** Official contact details from FIRE Nepal site/contact configuration (FooterInfoPage). */
export const FIRE_NEPAL_EMAIL_CONTACT = {
  brandName: "FIRE Nepal",
  websiteUrl: FIRE_NEPAL_CANONICAL_ORIGIN,
  websiteLabel: "www.firenepal.com",
  supportEmail: "support@firenepal.com",
  contactPath: "/contact",
  tagline: "Financial Independence • Retirement • Empowerment",
  copyright: "© FIRE Nepal. All rights reserved.",
} as const;

export type MembershipApprovalEmailInput = {
  memberName: string;
  referenceId: string;
  plan: MembershipRequestPlan;
  amountNpr: number;
  paymentMethod: MembershipPaymentMethod;
  approvedAtIso: string;
  expiryAtIso: string;
  viewPlanUrl: string;
  /** Absolute logo URL for email clients (existing asset / FIRE_NEPAL_LOGO_URL). */
  logoUrl: string;
};

const BRAND = {
  accent: "#10b981",
  bg: "#04120d",
  card: "#052116",
  text: "#e4e4e7",
  muted: "#a1a1aa",
  soft: "#bbf7d0",
};

export function planDisplayName(plan: MembershipRequestPlan): string {
  return plan === "elite" ? "Elite" : "Premium";
}

export function formatNprAmount(amountNpr: number): string {
  const n = Number.isFinite(amountNpr) ? Math.round(amountNpr) : 0;
  return n.toLocaleString("en-NP");
}

export function formatApprovalDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(d);
}

/** Annual membership paid in full via the selected QR method — not an installment schedule. */
export function paymentScheduleLabel(paymentMethod: MembershipPaymentMethod): string {
  const method = PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod;
  return `Annual (12 months) · paid via ${method}`;
}

export function resolveApprovalEmailLogoUrl(siteOrigin?: string): string {
  const fromEnv = process.env.FIRE_NEPAL_LOGO_URL?.trim();
  if (fromEnv) return fromEnv;
  const origin = (siteOrigin || FIRE_NEPAL_CANONICAL_ORIGIN).replace(/\/+$/, "");
  return `${origin}/email-logo.png`;
}

export function membershipPlanViewUrl(siteOrigin?: string): string {
  const origin = (siteOrigin || FIRE_NEPAL_CANONICAL_ORIGIN).replace(/\/+$/, "");
  return `${origin}/dashboard/membership`;
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

export function buildMembershipApprovalEmail(input: MembershipApprovalEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const memberName = input.memberName.trim() || "Member";
  const planName = planDisplayName(input.plan);
  const amount = formatNprAmount(input.amountNpr);
  const schedule = paymentScheduleLabel(input.paymentMethod);
  const approvedDate = formatApprovalDate(input.approvedAtIso);
  const expiryDate = formatApprovalDate(input.expiryAtIso);
  const subject = MEMBERSHIP_APPROVAL_EMAIL_SUBJECT;
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
<h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;font-weight:900;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">Payment plan approved</h1>
</td></tr>
<tr><td class="fn-pad" style="padding:28px 28px 8px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hello <strong style="color:#fff;">${escapeHtml(memberName)}</strong>,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Great news! Your payment plan has been successfully approved by FIRE Nepal.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${BRAND.muted};">Your approved plan is now available in your FIRE Nepal account. Please review the payment schedule and complete any required actions before the Expiry Date.</p>
<p style="margin:0 0 12px;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">Payment Plan Details</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
${detailRow("Reference", escapeHtml(input.referenceId))}
${detailRow("Plan", escapeHtml(planName))}
${detailRow("Approved Amount", `NPR ${escapeHtml(amount)}`)}
${detailRow("Payment Schedule", escapeHtml(schedule))}
${detailRow("Approved Date", escapeHtml(approvedDate))}
${detailRow("Expiry Date", escapeHtml(expiryDate))}
${detailRow("Status", `<span style="color:${BRAND.accent};">✅ Approved</span>`)}
</table>
<p style="margin:26px 0 8px;">
<a class="fn-cta" href="${escapeHtml(input.viewPlanUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">View My Payment Plan →</a>
</p>
<p style="margin:22px 0 0;font-size:15px;line-height:1.6;">Thank you for choosing FIRE Nepal. We’re here to help you manage your financial journey with greater clarity and confidence.</p>
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
    "Great news! Your payment plan has been successfully approved by FIRE Nepal.",
    "",
    "Your approved plan is now available in your FIRE Nepal account. Please review the payment schedule and complete any required actions before the Expiry Date.",
    "",
    "Payment Plan Details",
    `* Reference: ${input.referenceId}`,
    `* Plan: ${planName}`,
    `* Approved Amount: NPR ${amount}`,
    `* Payment Schedule: ${schedule}`,
    `* Approved Date: ${approvedDate}`,
    `* Expiry Date: ${expiryDate}`,
    "* Status: ✅ Approved",
    "",
    `View My Payment Plan → ${input.viewPlanUrl}`,
    "",
    "Thank you for choosing FIRE Nepal. We’re here to help you manage your financial journey with greater clarity and confidence.",
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
