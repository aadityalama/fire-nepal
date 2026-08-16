/**
 * Peer-loan party identity helpers for request lifecycle.
 * Lender / borrower are derived from loan.role + counterpartyId + session user.
 * Never treat a "You" placeholder as a third-person display name.
 */
import type { FireLendingLoan, FireLendingParty, LoanRole } from "@/lib/fire-lending/types";

export const SELF_LOAN_ERROR =
  "Lender and borrower must be different members. A loan cannot be created with the same person as both parties.";

export type LoanPartyIds = {
  lenderId: string;
  borrowerId: string;
};

/** Resolve durable lender / borrower party ids from loan.role + counterparty. */
export function resolveLoanPartyIds(
  loan: Pick<FireLendingLoan, "role" | "counterpartyId" | "lenderId" | "borrowerId">,
  storeCurrentUserId: string,
): LoanPartyIds {
  const storedLender = String(loan.lenderId ?? "").trim();
  const storedBorrower = String(loan.borrowerId ?? "").trim();
  if (storedLender && storedBorrower && storedLender !== storedBorrower) {
    return { lenderId: storedLender, borrowerId: storedBorrower };
  }

  const me = String(storeCurrentUserId ?? "").trim();
  const other = String(loan.counterpartyId ?? "").trim();
  if (loan.role === "lender") {
    return { lenderId: me, borrowerId: other };
  }
  return { lenderId: other, borrowerId: me };
}

export function buildLenderBorrowerIds(input: {
  creatorPartyId: string;
  counterpartyId: string;
  creatorRole: LoanRole;
}): { ok: true; lenderId: string; borrowerId: string } | { ok: false; error: string } {
  const creator = String(input.creatorPartyId ?? "").trim();
  const counterparty = String(input.counterpartyId ?? "").trim();
  if (!creator || !counterparty) {
    return { ok: false, error: "Both lender and borrower are required." };
  }
  if (creator === counterparty) {
    return { ok: false, error: SELF_LOAN_ERROR };
  }
  const lenderId = input.creatorRole === "lender" ? creator : counterparty;
  const borrowerId = input.creatorRole === "borrower" ? creator : counterparty;
  return { ok: true, lenderId, borrowerId };
}

/**
 * Safe display name for notifications/email.
 * Never emit the demo placeholder "You" as a third-person requester name.
 */
export function partyDisplayName(
  party: FireLendingParty | undefined | null,
  fallback = "a FIRE Nepal member",
): string {
  const name = party?.name?.trim() || "";
  if (!name || /^you$/i.test(name)) return fallback;
  return name;
}

/** True when lender and borrower collapse to the same party id. */
export function isSelfLoan(
  loan: Pick<FireLendingLoan, "role" | "counterpartyId" | "lenderId" | "borrowerId">,
  storeCurrentUserId: string,
): boolean {
  const { lenderId, borrowerId } = resolveLoanPartyIds(loan, storeCurrentUserId);
  return Boolean(lenderId && borrowerId && lenderId === borrowerId);
}
