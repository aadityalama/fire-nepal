import "server-only";

import { getSiteOrigin } from "@/lib/brand/site-seo";
import {
  buildLoanRequestEmail,
  loanRequestReviewUrl,
} from "@/lib/fire-lending/loan-request-email";
import { resolveApprovalEmailLogoUrl } from "@/lib/membership-approval-email/email-templates";
import { formatLendingMoney } from "@/lib/fire-lending/format";
import type { FireLendingLoan, FireLendingParty, FireLendingStore } from "@/lib/fire-lending/types";
import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const LOG_PREFIX = "[FIRE Nepal loan-request-email]";

export type SendLoanRequestEmailInput = {
  store: FireLendingStore;
  loan: FireLendingLoan;
  requester: FireLendingParty;
  recipient: FireLendingParty;
};

/**
 * Best-effort professional email to the counterparty when a loan request is sent.
 * Looks up the recipient by FIRE Nepal ID → user_profiles → verified auth email.
 */
export async function sendLoanRequestNotificationEmail(
  input: SendLoanRequestEmailInput,
): Promise<{ ok: true; skipped?: string } | { ok: false; error: string }> {
  if (!isResendApiKeyConfigured()) {
    return { ok: true, skipped: "resend_not_configured" };
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: true, skipped: "service_role_missing" };
  }

  const fireId = input.recipient.fireNepalId?.trim().toUpperCase();
  if (!fireId) {
    return { ok: true, skipped: "recipient_fire_id_missing" };
  }

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select("id, full_name, display_name, fire_nepal_id")
    .eq("fire_nepal_id", fireId)
    .maybeSingle();

  if (profileErr || !profile?.id) {
    console.info(LOG_PREFIX, "recipient profile not found", { fireId });
    return { ok: true, skipped: "recipient_profile_not_found" };
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(profile.id);
  if (authErr || !authData?.user) {
    return { ok: true, skipped: "auth_user_lookup_failed" };
  }
  const email = authData.user.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return { ok: true, skipped: "auth_email_missing" };
  }
  if (!authData.user.email_confirmed_at) {
    return { ok: true, skipped: "email_not_verified" };
  }

  const siteOrigin = getSiteOrigin();
  const requesterIsLender = input.loan.role === "lender";
  const tpl = buildLoanRequestEmail({
    recipientName:
      profile.full_name?.trim() ||
      profile.display_name?.trim() ||
      input.recipient.name ||
      "Member",
    requesterName: input.requester.name,
    requesterRoleLabel: requesterIsLender ? "Lender" : "Borrower",
    counterpartyRoleLabel: requesterIsLender ? "Borrower" : "Lender",
    loanReference: input.loan.agreementNumber,
    amountLabel: formatLendingMoney(input.loan.amount, input.loan.currency),
    interestRate: input.loan.interestRate,
    durationMonths: input.loan.durationMonths,
    requestDateIso: new Date().toISOString(),
    reviewUrl: loanRequestReviewUrl(input.loan.id, siteOrigin),
    logoUrl: resolveApprovalEmailLogoUrl(siteOrigin),
  });

  const sendRes = await sendEmailViaResend({
    from: resolveResendFromAddress(),
    to: [email],
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  if (!sendRes.ok) {
    console.error(LOG_PREFIX, "send failed", sendRes.message);
    return { ok: false, error: sendRes.message };
  }

  console.info(LOG_PREFIX, "sent", { loanId: input.loan.id, id: sendRes.id ?? null });
  return { ok: true };
}
