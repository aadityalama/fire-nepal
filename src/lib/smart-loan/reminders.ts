export const SMART_LOAN_OVERDUE_SUBJECT = "🚨 Loan Payment Overdue Notice";

export type SmartLoanReminderRecipientKind = "borrower" | "lender";

export type SmartLoanReminderStatus = "sent" | "skipped" | "failed";

export type SmartLoanReminderInput = {
  id: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  lenderName: string;
  lenderEmail: string;
  loanAmount: number;
  remainingAmount: number;
  agreementDate: string;
  dueDate: string;
  interestRate: number;
  currency: string;
  daysUntilDue: number;
  daysOverdue: number;
};

export type SmartLoanReminderLog = {
  id: string;
  loanId: string;
  date: string;
  recipient: string;
  recipientKind: SmartLoanReminderRecipientKind;
  emailSent: boolean;
  status: SmartLoanReminderStatus;
  message: string;
};

type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

type EmailTheme = {
  name: "upcoming" | "today" | "overdue";
  label: string;
  primary: string;
  secondary: string;
  soft: string;
  border: string;
  text: string;
};

const FIRE_NEPAL_WEBSITE = "https://firenepal.com";
const FIRE_NEPAL_SUPPORT_EMAIL = "support@firenepal.com";

export function shouldSendSmartLoanReminder(daysUntilDue: number) {
  return daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 0 || daysUntilDue < 0;
}

function formatMoney(value: number, currency: string) {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (currency === "KRW") return `KRW ${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(safeValue)}`;
  if (currency === "USD") return `USD ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(safeValue)}`;
  return `NPR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(safeValue)}`;
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildSubject(loan: SmartLoanReminderInput) {
  if (loan.daysOverdue > 0) return SMART_LOAN_OVERDUE_SUBJECT;
  if (loan.daysUntilDue === 0) return "Loan payment due today";
  return `Loan payment reminder: due in ${loan.daysUntilDue} days`;
}

function reminderTheme(loan: SmartLoanReminderInput): EmailTheme {
  if (loan.daysOverdue > 0) {
    return {
      name: "overdue",
      label: `${loan.daysOverdue} days overdue`,
      primary: "#dc2626",
      secondary: "#991b1b",
      soft: "#fef2f2",
      border: "#fecaca",
      text: "#7f1d1d",
    };
  }

  if (loan.daysUntilDue === 0) {
    return {
      name: "today",
      label: "Due today",
      primary: "#f97316",
      secondary: "#c2410c",
      soft: "#fff7ed",
      border: "#fed7aa",
      text: "#7c2d12",
    };
  }

  return {
    name: "upcoming",
    label: `${loan.daysUntilDue} days remaining`,
    primary: "#2563eb",
    secondary: "#1d4ed8",
    soft: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e3a8a",
  };
}

function buildLogoMarkup(size = 64) {
  const logoUrl = process.env.FIRE_NEPAL_LOGO_URL || "https://firenepal.com/logo.png";
  return `
    <img
      src="${escapeHtml(logoUrl)}"
      width="${size}"
      height="${size}"
      alt="FIRE Nepal logo"
      style="display:block;width:${size}px;height:${size}px;border:0;border-radius:18px;object-fit:contain;background:#052116"
    />`;
}

function detailRow(label: string, value: string, theme: EmailTheme) {
  return `
    <tr>
      <td style="padding:13px 14px;border-bottom:1px solid ${theme.border};font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#64748b;background:#f8fafc">${escapeHtml(label)}</td>
      <td style="padding:13px 14px;border-bottom:1px solid ${theme.border};font-size:14px;font-weight:800;color:#0f172a;background:#ffffff">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildSmartLoanReminderEmail(loan: SmartLoanReminderInput) {
  const theme = reminderTheme(loan);
  const amount = formatMoney(loan.loanAmount, loan.currency);
  const remaining = formatMoney(loan.remainingAmount, loan.currency);
  const agreementDate = formatDate(loan.agreementDate);
  const dueDate = formatDate(loan.dueDate);
  const daysStatus = loan.daysOverdue > 0 ? `${loan.daysOverdue} days overdue` : loan.daysUntilDue === 0 ? "Due today" : `${loan.daysUntilDue} days remaining`;
  const overdueLine =
    loan.daysOverdue > 0
      ? `Your payment is overdue by ${loan.daysOverdue} days.\nPlease complete payment immediately.`
      : loan.daysUntilDue === 0
        ? "Your payment is due today.\nPlease complete payment immediately."
        : `Your payment is due in ${loan.daysUntilDue} days.\nPlease prepare the payment before the due date.`;

  const text = `Borrower Name: ${loan.borrowerName}
Loan Amount: ${amount}
Remaining Amount: ${remaining}
Agreement Date: ${agreementDate}
Due Date: ${dueDate}
Days Remaining / Overdue: ${daysStatus}
Interest Rate: ${loan.interestRate}%
Lender Name: ${loan.lenderName}

${overdueLine}

Best Regards,

FIRE Nepal Team
Financial Independence for Nepalis Worldwide

FIRE Nepal
Financial Independence Retire Early

Helping Nepalis Abroad Build Wealth,
Track Loans, Manage Assets and
Achieve Financial Freedom.

Website:
${FIRE_NEPAL_WEBSITE}

Support:
${FIRE_NEPAL_SUPPORT_EMAIL}

© 2026 FIRE Nepal. All Rights Reserved.`;

  const html = `
    <div style="margin:0;padding:0;background:#031710;color:#e2e8f0;font-family:Inter,Segoe UI,Arial,sans-serif">
      <style>
        @media (prefers-color-scheme: dark) {
          .fn-card { background:#052116 !important; color:#f8fafc !important; }
          .fn-muted { color:#a7f3d0 !important; }
          .fn-detail-label { background:#06281a !important; color:#bbf7d0 !important; }
          .fn-detail-value { background:#041b12 !important; color:#ffffff !important; }
        }
        @media only screen and (max-width: 640px) {
          .fn-shell { width:100% !important; }
          .fn-pad { padding:22px !important; }
          .fn-title { font-size:28px !important; line-height:1.05 !important; }
          .fn-detail-label, .fn-detail-value { display:block !important; width:auto !important; }
        }
      </style>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#031710 0%,#052116 46%,#0f5132 100%);padding:0">
        <tr>
          <td align="center" style="padding:28px 14px">
            <table class="fn-shell" role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:100%;border-collapse:collapse">
              <tr>
                <td class="fn-pad" style="overflow:hidden;border-radius:28px;border:1px solid rgba(167,243,208,.24);background:#ffffff;box-shadow:0 28px 80px rgba(0,0,0,.32)">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                    <tr>
                      <td style="padding:28px;background:linear-gradient(135deg,#052116 0%,#0f5132 58%,${theme.secondary} 100%);color:#ffffff">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                          <tr>
                            <td style="vertical-align:middle;width:78px">${buildLogoMarkup(64)}</td>
                            <td style="vertical-align:middle;padding-left:16px">
                              <p style="margin:0 0 5px;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#bbf7d0">FIRE Nepal</p>
                              <h1 style="margin:0;font-size:25px;line-height:1.12;font-weight:900;color:#ffffff">FIRE Nepal Loan Reminder</h1>
                              <p style="margin:8px 0 0;font-size:13px;font-weight:700;color:#d1fae5">Financial Independence for Nepalis Worldwide</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td class="fn-card fn-pad" style="padding:30px;background:#ffffff;color:#0f172a">
                        <span style="display:inline-block;border-radius:999px;background:${theme.soft};border:1px solid ${theme.border};padding:8px 12px;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${theme.text}">
                          ${escapeHtml(theme.label)}
                        </span>
                        <h2 class="fn-title" style="margin:18px 0 10px;font-size:34px;line-height:1.05;font-weight:950;letter-spacing:-.04em;color:${theme.primary}">
                          ${escapeHtml(buildSubject(loan))}
                        </h2>
                        <p class="fn-muted" style="margin:0 0 22px;font-size:16px;line-height:1.65;font-weight:700;color:#334155">
                          ${escapeHtml(overdueLine).replace(/\n/g, "<br />")}
                        </p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="overflow:hidden;border-collapse:separate;border-spacing:0;border:1px solid ${theme.border};border-radius:18px">
                          <tbody>
                            ${detailRow("Borrower Name", loan.borrowerName, theme)}
                            ${detailRow("Loan Amount", amount, theme)}
                            ${detailRow("Remaining Amount", remaining, theme)}
                            ${detailRow("Agreement Date", agreementDate, theme)}
                            ${detailRow("Due Date", dueDate, theme)}
                            ${detailRow("Days Remaining / Overdue", daysStatus, theme)}
                            ${detailRow("Lender Name", loan.lenderName, theme)}
                          </tbody>
                        </table>
                        <div style="margin-top:24px;border-radius:20px;background:linear-gradient(135deg,#ecfdf5,#f8fafc);border:1px solid #bbf7d0;padding:18px">
                          <p style="margin:0 0 10px;font-size:14px;font-weight:900;color:#047857">Best Regards,</p>
                          <p style="margin:0;font-size:15px;font-weight:900;color:#052116">FIRE Nepal Team</p>
                          <p style="margin:3px 0 0;font-size:13px;font-weight:700;color:#047857">Financial Independence for Nepalis Worldwide</p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px;background:#041b12;color:#d1fae5;text-align:center;border-top:1px solid rgba(187,247,208,.18)">
                        <div style="margin:0 auto 14px;width:72px">${buildLogoMarkup(72)}</div>
                        <p style="margin:0;font-size:20px;font-weight:950;color:#ffffff">FIRE Nepal</p>
                        <p style="margin:5px 0 16px;font-size:13px;font-weight:800;color:#bbf7d0">Financial Independence Retire Early</p>
                        <p style="margin:0 auto 18px;max-width:390px;font-size:13px;line-height:1.65;font-weight:700;color:#a7f3d0">
                          Helping Nepalis Abroad Build Wealth,<br />
                          Track Loans, Manage Assets and<br />
                          Achieve Financial Freedom.
                        </p>
                        <p style="margin:0 0 6px;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#6ee7b7">Website</p>
                        <a href="${FIRE_NEPAL_WEBSITE}" style="color:#7CFFB3;font-size:14px;font-weight:900;text-decoration:none">${FIRE_NEPAL_WEBSITE}</a>
                        <p style="margin:16px 0 6px;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#6ee7b7">Support</p>
                        <a href="mailto:${FIRE_NEPAL_SUPPORT_EMAIL}" style="color:#7CFFB3;font-size:14px;font-weight:900;text-decoration:none">${FIRE_NEPAL_SUPPORT_EMAIL}</a>
                        <p style="margin:20px 0 0;font-size:11px;font-weight:700;color:#86efac">© 2026 FIRE Nepal. All Rights Reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;

  return { subject: buildSubject(loan), text, html };
}

async function sendResendEmail(payload: ResendEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, message: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return { ok: true, status: response.status, message: "Email sent" };

  const details = await response.text();
  return { ok: false, status: response.status, message: details || "Email provider rejected the request" };
}

function makeLog(
  loan: SmartLoanReminderInput,
  recipient: string,
  recipientKind: SmartLoanReminderRecipientKind,
  emailSent: boolean,
  status: SmartLoanReminderStatus,
  message: string,
): SmartLoanReminderLog {
  const date = new Date().toISOString();
  return {
    id: `${loan.id}-${recipientKind}-${date}`,
    loanId: loan.id,
    date,
    recipient,
    recipientKind,
    emailSent,
    status,
    message,
  };
}

export async function dispatchSmartLoanReminders(loans: SmartLoanReminderInput[]) {
  const from = process.env.RESEND_FROM_EMAIL || "FIRE Nepal <reminders@fire-nepal.com>";
  const dueLoans = loans.filter((loan) => loan.remainingAmount > 0 && shouldSendSmartLoanReminder(loan.daysUntilDue));
  const logs: SmartLoanReminderLog[] = [];

  for (const loan of dueLoans) {
    const email = buildSmartLoanReminderEmail(loan);
    const recipients = [
      { email: loan.borrowerEmail, kind: "borrower" as const },
      { email: loan.lenderEmail, kind: "lender" as const },
    ].filter((recipient) => recipient.email.trim());

    if (!recipients.length) {
      logs.push(makeLog(loan, "No recipient email", "borrower", false, "skipped", "Borrower and lender email are missing"));
      continue;
    }

    for (const recipient of recipients) {
      try {
        const result = await sendResendEmail({
          from,
          to: [recipient.email],
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        logs.push(makeLog(loan, recipient.email, recipient.kind, result.ok, result.ok ? "sent" : "failed", result.message));
      } catch (error) {
        logs.push(makeLog(loan, recipient.email, recipient.kind, false, "failed", error instanceof Error ? error.message : "Unknown email error"));
      }
    }
  }

  return {
    checked: loans.length,
    due: dueLoans.length,
    sent: logs.filter((log) => log.emailSent).length,
    logs,
  };
}
