import { todayIso, uid } from "@/lib/fire-lending/format";
import {
  resolveLoanPartyIds as resolveStoredLoanPartyIds,
  type LoanPartyIds,
} from "@/lib/fire-lending/loan-party-identity";
import type {
  FireLendingLoan,
  FireLendingNotification,
  FireLendingStore,
  LoanRole,
} from "@/lib/fire-lending/types";

export type SignAgreementInput = {
  loanId: string;
  /** Authenticated member / party id — never trust a client-supplied role alone. */
  actorPartyId: string;
  /**
   * Requested signature role. Must match the actor's real role on the loan
   * (derived from lender_id / borrower_id), not a forged payload value.
   */
  as: LoanRole;
};

export type SignAgreementResult =
  | { ok: true; store: FireLendingStore; loan: FireLendingLoan }
  | { ok: false; error: string; store: FireLendingStore; status?: number };

/** Resolve durable lender / borrower party ids (stored ids preferred). */
export function resolveLoanPartyIds(
  loan: FireLendingLoan,
  storeCurrentUserId: string,
): LoanPartyIds {
  return resolveStoredLoanPartyIds(loan, storeCurrentUserId);
}

/**
 * Role of the authenticated actor on this loan, or null if they are not a party.
 * Derived only from lender_id / borrower_id — never from a client "as" field.
 */
export function actorRoleOnLoan(
  loan: FireLendingLoan,
  actorPartyId: string,
  storeCurrentUserId: string,
): LoanRole | null {
  if (!actorPartyId) return null;
  const { lenderId, borrowerId } = resolveLoanPartyIds(loan, storeCurrentUserId);
  if (actorPartyId === lenderId) return "lender";
  if (actorPartyId === borrowerId) return "borrower";
  return null;
}

export function bothPartiesSigned(loan: Pick<FireLendingLoan, "lenderSigned" | "borrowerSigned">): boolean {
  return Boolean(loan.lenderSigned && loan.borrowerSigned);
}

export function canSignAgreement(
  loan: FireLendingLoan | undefined,
  actorPartyId: string,
  as: LoanRole,
  storeCurrentUserId: string,
): { ok: true; role: LoanRole } | { ok: false; error: string; status: number } {
  if (!loan) {
    return { ok: false, error: "Loan not found.", status: 404 };
  }
  if (!actorPartyId) {
    return { ok: false, error: "You must be signed in to sign the agreement.", status: 401 };
  }

  const role = actorRoleOnLoan(loan, actorPartyId, storeCurrentUserId);
  if (!role) {
    return {
      ok: false,
      error: "You are not authorized to sign this loan agreement.",
      status: 403,
    };
  }

  // Never allow signing for the other party — ignore/reject mismatched "as".
  if (as !== role) {
    return {
      ok: false,
      error:
        role === "lender"
          ? "You can only sign as the lender for this loan."
          : "You can only sign as the borrower for this loan.",
      status: 403,
    };
  }

  if (as === "lender" && loan.lenderSigned) {
    return { ok: false, error: "Lender signature is already recorded for this loan.", status: 409 };
  }
  if (as === "borrower" && loan.borrowerSigned) {
    return { ok: false, error: "Borrower signature is already recorded for this loan.", status: 409 };
  }

  return { ok: true, role };
}

/** UI copy for the authenticated party's signature panel. */
export function signatureStatusMessage(
  loan: Pick<FireLendingLoan, "lenderSigned" | "borrowerSigned">,
  viewerRole: LoanRole | null,
): string | null {
  const both = bothPartiesSigned(loan);
  if (both) {
    return "Both parties have signed. Loan request is ready for approval.";
  }
  if (viewerRole === "lender" && loan.lenderSigned && !loan.borrowerSigned) {
    return "Lender signature completed. Waiting for borrower signature.";
  }
  if (viewerRole === "borrower" && loan.borrowerSigned && !loan.lenderSigned) {
    return "Borrower signature completed. Waiting for lender signature.";
  }
  if (!loan.lenderSigned && !loan.borrowerSigned) {
    return "Awaiting lender and borrower signatures.";
  }
  if (loan.lenderSigned && !loan.borrowerSigned) {
    return "Awaiting borrower signature.";
  }
  if (!loan.lenderSigned && loan.borrowerSigned) {
    return "Awaiting lender signature.";
  }
  return null;
}

/**
 * Record one party's signature. Enforces role from lender_id/borrower_id.
 * Does not activate the loan until both signatures exist AND approval occurs
 * (accept); when both are present the loan is marked ready for approval.
 */
export function signLoanAgreement(
  store: FireLendingStore,
  input: SignAgreementInput,
): SignAgreementResult {
  const loan = store.loans.find((l) => l.id === input.loanId);
  const auth = canSignAgreement(loan, input.actorPartyId, input.as, store.currentUserId);
  if (!loan || !auth.ok) {
    return {
      ok: false,
      error: auth.ok === false ? auth.error : "Loan not found.",
      store,
      status: auth.ok === false ? auth.status : 404,
    };
  }

  const as = auth.role;
  const signedAt = todayIso();

  const loans = store.loans.map((l) => {
    if (l.id !== loan.id) return l;
    const next: FireLendingLoan = {
      ...l,
      lenderSigned: as === "lender" ? true : l.lenderSigned,
      borrowerSigned: as === "borrower" ? true : l.borrowerSigned,
    };
    const both = bothPartiesSigned(next);
    return {
      ...next,
      // Stay in signature / approval pipeline until counterparty Accepts.
      status: both ? ("pending_approval" as const) : ("pending_signature" as const),
    };
  });

  const updatedLoan = loans.find((l) => l.id === loan.id)!;
  const both = bothPartiesSigned(updatedLoan);

  const { lenderId, borrowerId } = resolveLoanPartyIds(loan, store.currentUserId);
  const notifyPartyId = as === "lender" ? borrowerId : lenderId;

  const notifications: FireLendingNotification[] = [
    {
      id: uid("ntf"),
      kind: "signature",
      title: both ? "Both parties have signed" : as === "lender" ? "Lender signed" : "Borrower signed",
      body: both
        ? `Agreement ${loan.agreementNumber} is fully signed and ready for approval.`
        : `${as === "lender" ? "Lender" : "Borrower"} signed agreement ${loan.agreementNumber}. Waiting for the other party.`,
      createdAt: signedAt,
      read: false,
      href: `/fire-lending/loans/${loan.id}`,
      forPartyId: notifyPartyId,
      relatedLoanId: loan.id,
    },
    ...store.notifications,
  ];

  const nextStore: FireLendingStore = {
    ...store,
    loans,
    agreements: store.agreements.map((a) =>
      a.loanId === loan.id
        ? {
            ...a,
            lenderSignedAt: as === "lender" ? signedAt : a.lenderSignedAt,
            borrowerSignedAt: as === "borrower" ? signedAt : a.borrowerSignedAt,
            status: "awaiting_signatures" as const,
          }
        : a,
    ),
    notifications,
  };

  return { ok: true, store: nextStore, loan: updatedLoan };
}

export const SIGNATURE_UI = {
  signAsLender: "Sign as Lender",
  signAsBorrower: "Sign as Borrower",
  lenderSigned: "Lender Signed",
  borrowerSigned: "Borrower Signed",
  lenderPending: "Pending",
  borrowerPending: "Pending",
  bothReady: "Both parties have signed. Loan request is ready for approval.",
  waitingBorrower: "Lender signature completed. Waiting for borrower signature.",
  waitingLender: "Borrower signature completed. Waiting for lender signature.",
} as const;
