import "server-only";

import { getSiteOrigin } from "@/lib/brand/site-seo";
import {
  buildLoanRequestEmail,
  loanRequestReviewUrl,
} from "@/lib/fire-lending/loan-request-email";
import { resolveApprovalEmailLogoUrl } from "@/lib/membership-approval-email/email-templates";
import { formatLendingMoney } from "@/lib/fire-lending/format";
import {
  partyDisplayName,
  resolveLoanPartyIds,
  SELF_LOAN_ERROR,
} from "@/lib/fire-lending/loan-party-identity";
import type { FireLendingLoan, FireLendingStore } from "@/lib/fire-lending/types";
import { isResendApiKeyConfigured, resolveResendFromAddress, sendEmailViaResend } from "@/lib/resend-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const LOG_PREFIX = "[FIRE Nepal loan-request-email]";

export type SendLoanRequestEmailInput = {
  store: FireLendingStore;
  loan: FireLendingLoan;
};

/**
 * Email the lender (User B) that the borrower (User A) sent a loan request.
 * Names come from loan.lenderId / loan.borrowerId — never both from the current user.
 */
export async function sendLoanRequestNotificationEmail(
  input: SendLoanRequestEmailInput,
): Promise<{ ok: true; skipped?: string } | { ok: false; error: string }> {
  if (!isResendApiKeyConfigured()) {
    return { ok: true, skipped: "resend_not_configured" };
  }

  const { lenderId, borrowerId } = resolveLoanPartyIds(input.loan, input.store.currentUserId);
  if (!lenderId || !borrowerId || lenderId === borrowerId) {
    return { ok: false, error: SELF_LOAN_ERROR };
  }

  const lenderParty = input.store.parties.find((p) => p.id === lenderId);
  const borrowerParty = input.store.parties.find((p) => p.id === borrowerId);
  const lenderName = partyDisplayName(lenderParty, "Member");
  const borrowerName = partyDisplayName(borrowerParty, "a FIRE Nepal member");

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return { ok: true, skipped: "service_role_missing" };
  }

  // Recipient is the lender.
  const fireId = lenderParty?.fireNepalId?.trim().toUpperCase();
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
  const recipientName =
    profile.full_name?.trim() || profile.display_name?.trim() || lenderName;

  const tpl = buildLoanRequestEmail({
    recipientName,
    requesterName: borrowerName,
    requesterRoleLabel: "Borrower",
    counterpartyRoleLabel: "Lender",
    loanReference: input.loan.agreementNumber,
    amountLabel: formatLendingMoney(input.loan.amount, input.loan.currency),
    interestRate: input.loan.interestRate,
    durationMonths: input.loan.durationMonths,
    requestDateIso: new Date().toISOString(),
    reviewUrl: loanRequestReviewUrl(input.loan.id, siteOrigin),
    logoUrl: resolveApprovalEmailLogoUrl(siteOrigin),
  });

  if (/^you has sent you/i.test(tpl.text) || /You has sent you/i.test(tpl.html)) {
    console.error(LOG_PREFIX, "refusing self-referential email copy");
    return { ok: false, error: "Invalid personalized email content." };
  }

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

  console.info(LOG_PREFIX, "sent", { loanId: input.loan.id, lenderId, borrowerId, id: sendRes.id ?? null });
  return { ok: true };
}
