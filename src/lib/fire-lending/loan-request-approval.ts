import { bothPartiesSigned } from "@/lib/fire-lending/agreement-signatures";
import { todayIso, uid } from "@/lib/fire-lending/format";
import {
  isSelfLoan,
  partyDisplayName,
  resolveActorRoleOnLoan,
  resolveLoanPartyIds,
  SELF_LOAN_ERROR,
} from "@/lib/fire-lending/loan-party-identity";
import type {
  FireLendingLoan,
  FireLendingNotification,
  FireLendingRequest,
  FireLendingStore,
  RequestStatus,
} from "@/lib/fire-lending/types";

export type LoanRequestAction = Extract<RequestStatus, "accepted" | "rejected" | "changes_requested">;

export type SendLoanRequestInput = {
  loanId: string;
  /** Authenticated member id of the loan creator / requester (must be the borrower). */
  actorPartyId: string;
  message?: string;
};

export type RespondToLoanRequestInput = {
  requestId: string;
  /** Authenticated member id attempting Accept / Reject (must be the lender). */
  actorPartyId: string;
  action: LoanRequestAction;
  note?: string;
};

export type LoanRequestMutationResult =
  | { ok: true; store: FireLendingStore; request: FireLendingRequest }
  | { ok: false; error: string; store: FireLendingStore; status?: number };

/**
 * Only the lender (request.toPartyId / loan.lenderId) may Accept/Reject.
 * The borrower/requester never may. Both signatures required when a loan is linked.
 */
export function canRespondToLoanRequest(
  request: FireLendingRequest | undefined,
  actorPartyId: string,
  linkedLoan?: FireLendingLoan,
  storeCurrentUserId?: string,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!request) {
    return { ok: false, error: "Loan request not found.", status: 404 };
  }
  if (request.status !== "pending") {
    return {
      ok: false,
      error: `This loan request is already ${request.status.replace("_", " ")}.`,
      status: 409,
    };
  }
  if (request.fromPartyId === actorPartyId) {
    return {
      ok: false,
      error: "You cannot accept or reject your own loan request.",
      status: 403,
    };
  }
  if (request.toPartyId !== actorPartyId) {
    return {
      ok: false,
      error: "Only the lender can accept or reject this loan request.",
      status: 403,
    };
  }

  if (linkedLoan) {
    if (linkedLoan.identityInvalid || isSelfLoan(linkedLoan)) {
      return { ok: false, error: SELF_LOAN_ERROR, status: 400 };
    }
    const { lenderId, borrowerId } = resolveLoanPartyIds(linkedLoan, storeCurrentUserId);
    if (!lenderId || !borrowerId || lenderId === borrowerId) {
      return { ok: false, error: SELF_LOAN_ERROR, status: 400 };
    }
    // Actor must be the lender on the linked loan — never the borrower.
    const role = resolveActorRoleOnLoan(linkedLoan, actorPartyId, storeCurrentUserId);
    if (role !== "lender") {
      return {
        ok: false,
        error: "Only the lender can accept or reject this loan request.",
        status: 403,
      };
    }
    if (actorPartyId !== lenderId || request.toPartyId !== lenderId) {
      return {
        ok: false,
        error: "Only the lender can accept or reject this loan request.",
        status: 403,
      };
    }
    if (!bothPartiesSigned(linkedLoan)) {
      return {
        ok: false,
        error: "Both lender and borrower must sign the agreement before Accept or Reject.",
        status: 403,
      };
    }
  }
  if (request.loanId && !linkedLoan) {
    return { ok: false, error: "Linked loan not found for this request.", status: 404 };
  }

  return { ok: true };
}

/** True when the authenticated user is the recipient (lender) of a pending request. */
export function isLoanRequestRecipient(request: FireLendingRequest, actorPartyId: string): boolean {
  return request.toPartyId === actorPartyId && request.status === "pending";
}

/** True when the authenticated user created the request (borrower). */
export function isLoanRequestRequester(request: FireLendingRequest, actorPartyId: string): boolean {
  return request.fromPartyId === actorPartyId;
}

/** Accept/Reject controls: lender only, after both signatures, never on invalid identity. */
export function canShowLoanRequestApprovalControls(
  request: FireLendingRequest,
  actorPartyId: string,
  linkedLoan: FireLendingLoan | undefined,
  storeCurrentUserId?: string,
): boolean {
  if (!isLoanRequestRecipient(request, actorPartyId)) return false;
  if (request.status !== "pending") return false;
  if (!linkedLoan) return false;
  if (linkedLoan.identityInvalid || isSelfLoan(linkedLoan)) return false;
  const { lenderId, borrowerId } = resolveLoanPartyIds(linkedLoan, storeCurrentUserId);
  if (!lenderId || !borrowerId || lenderId === borrowerId) return false;
  if (resolveActorRoleOnLoan(linkedLoan, actorPartyId, storeCurrentUserId) !== "lender") return false;
  if (actorPartyId !== lenderId) return false;
  return bothPartiesSigned(linkedLoan);
}

export function findPendingRequestForLoan(
  store: FireLendingStore,
  loanId: string,
): FireLendingRequest | undefined {
  return store.requests.find((r) => r.loanId === loanId && r.status === "pending");
}

export function findRequestForLoan(
  store: FireLendingStore,
  loanId: string,
): FireLendingRequest | undefined {
  const linked = store.requests.filter((r) => r.loanId === loanId);
  if (linked.length === 0) return undefined;
  return (
    linked.find((r) => r.status === "pending") ||
    linked.find((r) => r.status === "accepted") ||
    linked[0]
  );
}

/** In-app / email body: borrower (sender) has sent a request to the lender (recipient). */
export function loanRequestNotificationBody(borrowerName: string): string {
  return `${borrowerName} has sent you a loan request. Please review the loan details and respond.`;
}

/** @deprecated Use loanRequestNotificationBody — kept for older test imports. */
export function borrowerNotificationBody(senderName: string): string {
  return loanRequestNotificationBody(senderName);
}

export function borrowerNotificationTitle(): string {
  return "New Loan Request";
}

/** Prevent duplicate in-app notifications for the same loan request event. */
export function hasLoanRequestNotification(
  store: FireLendingStore,
  opts: { loanId: string; toPartyId: string; requestId?: string },
): boolean {
  return store.notifications.some(
    (n) =>
      n.kind === "loan_request" &&
      n.forPartyId === opts.toPartyId &&
      (n.relatedLoanId === opts.loanId ||
        (opts.requestId != null && n.relatedRequestId === opts.requestId)),
  );
}

/**
 * Borrower (User A) sends a loan request to the lender (User B).
 * fromPartyId = borrowerId, toPartyId = lenderId.
 * Rejects self-loans and non-borrower senders.
 */
export function sendLoanRequest(
  store: FireLendingStore,
  input: SendLoanRequestInput,
): LoanRequestMutationResult {
  const loan = store.loans.find((l) => l.id === input.loanId);
  if (!loan) {
    return { ok: false, error: "Loan not found. Cannot send request.", store, status: 404 };
  }

  const requesterId = input.actorPartyId || store.currentUserId;
  if (!requesterId) {
    return { ok: false, error: "You must be signed in to send a loan request.", store, status: 401 };
  }

  if (loan.identityInvalid || isSelfLoan(loan)) {
    return { ok: false, error: SELF_LOAN_ERROR, store, status: 400 };
  }

  const { lenderId, borrowerId } = resolveLoanPartyIds(loan, store.currentUserId);
  if (!lenderId || !borrowerId || lenderId === borrowerId) {
    return { ok: false, error: SELF_LOAN_ERROR, store, status: 400 };
  }

  // Loan request flow: User A (borrower) → User B (lender).
  if (requesterId !== borrowerId) {
    return {
      ok: false,
      error: "Only the borrower can send a loan request. Select “I am borrowing” and choose a lender.",
      store,
      status: 403,
    };
  }

  const toPartyId = lenderId;
  if (toPartyId === requesterId) {
    return {
      ok: false,
      error: "You cannot send a loan request to yourself. Select a different lender.",
      store,
      status: 400,
    };
  }

  if (findPendingRequestForLoan(store, loan.id)) {
    return {
      ok: false,
      error: "A loan request is already pending for this loan. Wait for the lender’s response.",
      store,
      status: 409,
    };
  }

  const borrowerParty = store.parties.find((p) => p.id === borrowerId);
  const borrowerName = partyDisplayName(borrowerParty, "a FIRE Nepal member");
  const createdAt = todayIso();
  const createdAtDisplay = new Date().toISOString();

  const request: FireLendingRequest = {
    id: uid("req"),
    loanId: loan.id,
    fromPartyId: borrowerId,
    toPartyId: lenderId,
    amount: loan.amount,
    currency: loan.currency,
    interestRate: loan.interestRate,
    durationMonths: loan.durationMonths,
    purpose: loan.purpose,
    status: "pending",
    createdAt,
    message: input.message,
  };

  const alreadyNotified = hasLoanRequestNotification(store, {
    loanId: loan.id,
    toPartyId: lenderId,
  });

  const notification: FireLendingNotification | null = alreadyNotified
    ? null
    : {
        id: uid("ntf"),
        kind: "loan_request",
        title: borrowerNotificationTitle(),
        body: `${loanRequestNotificationBody(borrowerName)} Ref: ${loan.agreementNumber} · ${createdAtDisplay}`,
        createdAt,
        read: false,
        href: `/fire-lending/loans/${loan.id}`,
        forPartyId: lenderId,
        relatedRequestId: request.id,
        relatedLoanId: loan.id,
      };

  const nextLoans: FireLendingLoan[] = store.loans.map((l) =>
    l.id === loan.id
      ? {
          ...l,
          lenderId,
          borrowerId,
          status: bothPartiesSigned(l) ? ("pending_approval" as const) : ("pending_signature" as const),
        }
      : l,
  );

  const nextStore: FireLendingStore = {
    ...store,
    loans: nextLoans,
    requests: [request, ...store.requests],
    notifications: notification ? [notification, ...store.notifications] : store.notifications,
  };

  return { ok: true, store: nextStore, request };
}

/**
 * Only the lender may Accept / Reject, and only after both signatures.
 * Self-loans and borrower self-approval are rejected.
 */
export function respondToLoanRequest(
  store: FireLendingStore,
  input: RespondToLoanRequestInput,
): LoanRequestMutationResult {
  const request = store.requests.find((r) => r.id === input.requestId);
  const linkedLoan = request?.loanId
    ? store.loans.find((l) => l.id === request.loanId)
    : undefined;
  const auth = canRespondToLoanRequest(request, input.actorPartyId, linkedLoan, store.currentUserId);
  if (!request || !auth.ok) {
    return {
      ok: false,
      error: auth.ok === false ? auth.error : "Loan request not found.",
      store,
      status: auth.ok === false ? auth.status : 404,
    };
  }

  const updatedRequest: FireLendingRequest = {
    ...request,
    status: input.action,
    changeRequest:
      input.action === "changes_requested" ? input.note || request.changeRequest : request.changeRequest,
  };

  const loans = store.loans.map((l) => {
    if (!request.loanId || l.id !== request.loanId) return l;
    if (input.action === "accepted") {
      return {
        ...l,
        status: "active" as const,
        startDate: l.startDate || todayIso(),
      };
    }
    if (input.action === "rejected") {
      return { ...l, status: "rejected" as const };
    }
    return { ...l, status: "pending_approval" as const };
  });

  const agreements = store.agreements.map((a) => {
    if (!request.loanId || a.loanId !== request.loanId) return a;
    if (input.action === "rejected") {
      return { ...a, status: "void" as const };
    }
    if (input.action === "accepted") {
      return { ...a, status: "active" as const };
    }
    return a;
  });

  const actionLabel =
    input.action === "accepted" ? "accepted" : input.action === "rejected" ? "rejected" : "requested changes to";

  const notifications: FireLendingNotification[] = [
    {
      id: uid("ntf"),
      kind: "loan_request",
      title:
        input.action === "accepted"
          ? "Loan request accepted"
          : input.action === "rejected"
            ? "Loan request rejected"
            : "Changes requested",
      body: input.note || `The lender ${actionLabel} your loan request.`,
      createdAt: todayIso(),
      read: false,
      href: request.loanId ? `/fire-lending/loans/${request.loanId}` : "/fire-lending/requests",
      forPartyId: request.fromPartyId,
      relatedRequestId: request.id,
      relatedLoanId: request.loanId,
    },
    ...store.notifications,
  ];

  const nextStore: FireLendingStore = {
    ...store,
    requests: store.requests.map((r) => (r.id === request.id ? updatedRequest : r)),
    loans,
    agreements,
    notifications,
  };

  return { ok: true, store: nextStore, request: updatedRequest };
}

/** Wizard approval step copy helpers (borrower / requester side). */
export const LOAN_REQUEST_UI = {
  title: "Loan Request",
  prompt: "Do you want to send this loan request to the lender?",
  requestButton: "Request",
  confirmSend: "Send Request",
  confirmCancel: "Cancel",
  successMessage: "Loan request sent successfully. Waiting for the lender’s response.",
  waitingTitle: "Request Sent — Waiting for Lender",
  pendingStatus: "pending" as const,
  readyForApproval: "Both parties have signed. Loan request is ready for approval.",
  signaturesRequiredBeforeApproval: "Both parties must sign before Accept or Reject is available.",
  mustBeBorrower: "Only the borrower can send a loan request. Choose “I am borrowing” and select a lender.",
} as const;
