import { FIRE_NEPAL_CANONICAL_ORIGIN } from "@/lib/brand/site-seo";
import {
  FIRE_NEPAL_EMAIL_CONTACT,
  resolveApprovalEmailLogoUrl,
} from "@/lib/membership-approval-email/email-templates";

export const LOAN_REQUEST_EMAIL_SUBJECT = "New FIRE Nepal Loan Request";

export type LoanRequestEmailInput = {
  recipientName: string;
  requesterName: string;
  requesterRoleLabel: "Lender" | "Borrower";
  counterpartyRoleLabel: "Lender" | "Borrower";
  loanReference: string;
  amountLabel: string;
  interestRate: number;
  durationMonths: number;
  requestDateIso: string;
  reviewUrl: string;
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

function formatRequestDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(d);
}

function detailRow(label: string, valueHtml: string): string {
  return `<tr>
<td style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:${BRAND.muted};width:42%;">${escapeHtml(label)}</td>
<td style="padding:11px 14px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;font-weight:800;color:#fff;text-align:right;">${valueHtml}</td>
</tr>`;
}

export function loanRequestReviewUrl(loanId: string, siteOrigin?: string): string {
  const origin = (siteOrigin || FIRE_NEPAL_CANONICAL_ORIGIN).replace(/\/+$/, "");
  return `${origin}/fire-lending/loans/${encodeURIComponent(loanId)}`;
}

export function buildLoanRequestEmail(input: LoanRequestEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const recipientName = input.recipientName.trim() || "Member";
  const requesterName = input.requesterName.trim() || "a FIRE Nepal member";
  const subject = LOAN_REQUEST_EMAIL_SUBJECT;
  const requestDate = formatRequestDate(input.requestDateIso);
  const logoUrl = input.logoUrl || resolveApprovalEmailLogoUrl();

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
<h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;font-weight:900;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">New loan request</h1>
</td></tr>
<tr><td class="fn-pad" style="padding:28px 28px 8px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hello <strong style="color:#fff;">${escapeHtml(recipientName)}</strong>,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;"><strong style="color:#fff;">${escapeHtml(requesterName)}</strong> has sent you a loan request. Action is required — please review the loan details and respond in your FIRE Nepal account.</p>
<p style="margin:0 0 12px;font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.accent};">Loan Request Details</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px;">
${detailRow(input.requesterRoleLabel, escapeHtml(requesterName))}
${detailRow(input.counterpartyRoleLabel, escapeHtml(recipientName))}
${detailRow("Loan reference", escapeHtml(input.loanReference))}
${detailRow("Loan amount", escapeHtml(input.amountLabel))}
${detailRow("Interest rate", escapeHtml(`${input.interestRate}%`))}
${detailRow("Duration", escapeHtml(`${input.durationMonths} months`))}
${detailRow("Request date", escapeHtml(requestDate))}
${detailRow("Status", `<span style="color:#fbbf24;">Action required</span>`)}
</table>
<p style="margin:26px 0 8px;">
<a class="fn-cta" href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#059669,#34d399);color:#022c22;font-weight:900;text-decoration:none;font-size:14px;">Review Loan Request</a>
</p>
<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted};">Both parties must complete their agreement signatures before Accept or Reject is available.</p>
<p style="margin:18px 0 0;font-size:14px;line-height:1.55;">
Best regards,<br/>
<strong style="color:#fff;">FIRE Nepal Team</strong><br/>
<span style="color:${BRAND.muted};font-size:13px;">${escapeHtml(FIRE_NEPAL_EMAIL_CONTACT.tagline)}</span>
</p>
<p style="margin:20px 0 0;font-size:11px;color:${BRAND.muted};">This is an automated notification. Please do not reply to this email.</p>
</td></tr>
<tr><td style="padding:28px 24px;background:#031710;color:${BRAND.soft};text-align:center;border-top:1px solid rgba(187,247,208,0.18);">
<img src="${escapeHtml(logoUrl)}" width="64" height="64" alt="FIRE Nepal logo" style="display:block;margin:0 auto 14px;width:64px;height:64px;border:0;border-radius:16px;object-fit:contain;background:#052116;"/>
<p style="margin:0;font-size:18px;font-weight:950;color:#ffffff;">${escapeHtml(FIRE_NEPAL_EMAIL_CONTACT.brandName)}</p>
<p style="margin:20px 0 0;font-size:11px;font-weight:700;color:#86efac;">${escapeHtml(FIRE_NEPAL_EMAIL_CONTACT.copyright)}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    subject,
    "",
    `Hello ${recipientName},`,
    "",
    `${requesterName} has sent you a loan request. Action is required.`,
    "",
    `${input.requesterRoleLabel}: ${requesterName}`,
    `${input.counterpartyRoleLabel}: ${recipientName}`,
    `Loan reference: ${input.loanReference}`,
    `Loan amount: ${input.amountLabel}`,
    `Interest rate: ${input.interestRate}%`,
    `Duration: ${input.durationMonths} months`,
    `Request date: ${requestDate}`,
    "",
    `Review Loan Request: ${input.reviewUrl}`,
    "",
    "Both parties must complete their agreement signatures before Accept or Reject is available.",
    "",
    "FIRE Nepal Team",
  ].join("\n");

  return { subject, html, text };
}
