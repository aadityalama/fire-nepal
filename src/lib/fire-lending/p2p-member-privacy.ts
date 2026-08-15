/**
 * P2P Lending — privacy & authorization rules for member discovery.
 *
 * Authorized audience: signed-in FIRE Nepal users with access to /fire-lending.
 * Purpose: counterparty discovery and lending decisions only.
 *
 * APPROVED for search / lending profile responses:
 * - FIRE Nepal ID, display name, avatar
 * - Member verification status
 * - Trust Score + breakdown (from computeTrustScore / computeTrustScoreBreakdown)
 * - Active loan count, completed loans, repayment performance, on-time %
 * - Current loan status (high-level enum only, when disclosure is authorized)
 * - Lending/borrowing history summary (aggregate, no counterparties)
 * - Member since, public membership plan / country of work / currency
 *
 * NEVER expose (strip if present on source rows):
 * - password / auth secrets
 * - phone, email
 * - government ID numbers
 * - bank account details
 * - exact private income / expenses / addresses
 * - another member’s private financial records, loan amounts, notes, or raw snapshots
 */

export const P2P_MEMBER_APPROVED_SEARCH_FIELDS = [
  "fireNepalId",
  "displayName",
  "avatarUrl",
  "verificationStatus",
  "trustScore",
  "trustLabel",
  "completedLoans",
  "onTimeRepaymentPct",
  "onTimePayments",
  "latePayments",
  "activeLoanCount",
] as const;

export const P2P_MEMBER_APPROVED_PROFILE_FIELDS = [
  ...P2P_MEMBER_APPROVED_SEARCH_FIELDS,
  "trustBreakdown",
  "repaymentPerformance",
  "currentLoanStatus",
  "lendingHistorySummary",
  "memberSince",
  "publicLendingInfo",
] as const;

/** Fields that must never appear on P2P member API payloads. */
export const P2P_MEMBER_FORBIDDEN_FIELDS = [
  "password",
  "email",
  "phone",
  "mobile",
  "phone_dial_code",
  "phone_national_digits",
  "government_id",
  "national_id",
  "citizenship",
  "bank_account",
  "bankAccount",
  "iban",
  "income",
  "expenses",
  "address",
  "private_address",
  "notes",
  "payload",
  "state",
  "raw",
  "id", // internal user UUID — not for client discovery UI
] as const;

const FORBIDDEN_KEY = new RegExp(
  `^(${P2P_MEMBER_FORBIDDEN_FIELDS.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`,
  "i",
);

/** Deep-ish guard: reject objects that still carry forbidden keys at the top level. */
export function assertNoForbiddenP2PFields(payload: Record<string, unknown>, context: string): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_KEY.test(key)) {
      throw new Error(`P2P privacy violation in ${context}: forbidden field "${key}"`);
    }
  }
}

export function isP2PDiscoveryAuthorized(opts: {
  authenticated: boolean;
  suspended?: boolean;
  archived?: boolean;
}): boolean {
  if (!opts.authenticated) return false;
  if (opts.suspended || opts.archived) return false;
  return true;
}
