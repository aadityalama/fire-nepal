import "server-only";

import { getSiteOrigin } from "@/lib/brand/site-seo";
import {
  buildLoanRequestEmail,
  loanRequestReviewUrl,
} from "@/lib/fire-lending/loan-request-email";
import { partyDisplayName, resolveLoanPartyIds } from "@/lib/fire-lending/loan-party-identity";
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
 * Payload names the real borrower/lender — never the placeholder "You".
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

  const { lenderId, borrowerId } = resolveLoanPartyIds(input.loan, input.store.currentUserId);
  const borrowerParty =
    input.store.parties.find((p) => p.id === borrowerId) ||
    (input.loan.role === "borrower" ? input.requester : input.recipient);
  const lenderParty =
    input.store.parties.find((p) => p.id === lenderId) ||
    (input.loan.role === "lender" ? input.requester : input.recipient);

  const borrowerName = partyDisplayName(borrowerParty, "a FIRE Nepal member");
  const lenderName =
    profile.full_name?.trim() ||
    profile.display_name?.trim() ||
    partyDisplayName(lenderParty, "Member");

  // Primary request flow emails the lender about the borrower requester.
  const requesterIsBorrower = input.loan.role === "borrower" || input.requester.id === borrowerId;
  const tpl = buildLoanRequestEmail({
    recipientName: requesterIsBorrower ? lenderName : partyDisplayName(input.recipient, "Member"),
    requesterName: requesterIsBorrower
      ? borrowerName
      : partyDisplayName(input.requester, "a FIRE Nepal member"),
    requesterRoleLabel: requesterIsBorrower ? "Borrower" : "Lender",
    counterpartyRoleLabel: requesterIsBorrower ? "Lender" : "Borrower",
    loanReference: input.loan.agreementNumber,
    amountLabel: formatLendingMoney(input.loan.amount, input.loan.currency),
    interestRate: input.loan.interestRate,
    durationMonths: input.loan.durationMonths,
    requestDateIso: new Date().toISOString(),
    reviewUrl: loanRequestReviewUrl(input.loan.id, getSiteOrigin()),
    logoUrl: resolveApprovalEmailLogoUrl(getSiteOrigin()),
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

  console.info(LOG_PREFIX, "sent", {
    loanId: input.loan.id,
    lenderId,
    borrowerId,
    id: sendRes.id ?? null,
  });
  return { ok: true };
}
