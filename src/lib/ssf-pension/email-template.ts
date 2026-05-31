/** Template for automated pension contribution reminders (connect Resend/SendGrid + user email in production). */

export const SSF_EMAIL_SUBJECT = "Pension contribution reminder – FIRE Nepal";

export function buildSsfReminderEmailBody(opts: { dueDateLabel: string; memberName?: string }): string {
  const greeting = opts.memberName ? `Hi ${opts.memberName},` : "Hi,";
  return `${greeting}

Your contribution due date is approaching (${opts.dueDateLabel}). Please ensure payment is deposited on time to maintain pension and insurance eligibility.

— FIRE Nepal Pension OS
This is an automated reminder.`;
}
