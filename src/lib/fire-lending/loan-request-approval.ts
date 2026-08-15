import { todayIso, uid } from "@/lib/fire-lending/format";
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
  /** Authenticated member id of the loan creator / requester. */
  actorPartyId: string;
  message?: string;
};

export type RespondToLoanRequestInput = {
  requestId: string;
  /** Authenticated member id attempting Accept / Reject. */
  actorPartyId: string;
  action: LoanRequestAction;
  note?: string;
};

export type LoanRequestMutationResult =
  | { ok: true; store: FireLendingStore; request: FireLendingRequest }
  | { ok: false; error: string; store: FireLendingStore };

/** Counterparty (toPartyId) may Accept/Reject; the requester (fromPartyId) never may. */
export function canRespondToLoanRequest(
  request: FireLendingRequest | undefined,
  actorPartyId: string,
): { ok: true } | { ok: false; error: string } {
  if (!request) {
    return { ok: false, error: "Loan request not found." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: `This loan request is already ${request.status.replace("_", " ")}.` };
  }
  if (request.fromPartyId === actorPartyId) {
    return { ok: false, error: "You cannot accept or reject your own loan request." };
  }
  if (request.toPartyId !== actorPartyId) {
    return { ok: false, error: "Only the borrower/counterparty can accept or reject this request." };
  }
  return { ok: true };
}

/** True when the authenticated user is the recipient of a pending request. */
export function isLoanRequestRecipient(request: FireLendingRequest, actorPartyId: string): boolean {
  return request.toPartyId === actorPartyId && request.status === "pending";
}

/** True when the authenticated user created the request. */
export function isLoanRequestRequester(request: FireLendingRequest, actorPartyId: string): boolean {
  return request.fromPartyId === actorPartyId;
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

export function borrowerNotificationBody(requesterName: string): string {
  return `You have received a new loan request from ${requesterName}.`;
}

/**
 * Requester sends a loan request to the loan counterparty.
 * Prevents duplicate pending requests for the same loan.
 */
export function sendLoanRequest(
  store: FireLendingStore,
  input: SendLoanRequestInput,
): LoanRequestMutationResult {
  const loan = store.loans.find((l) => l.id === input.loanId);
  if (!loan) {
    return { ok: false, error: "Loan not found. Cannot send request.", store };
  }

  const requesterId = input.actorPartyId || store.currentUserId;
  if (!requesterId) {
    return { ok: false, error: "You must be signed in to send a loan request.", store };
  }

  // Creator of the loan request is the authenticated user; recipient is always the counterparty.
  const toPartyId = loan.counterpartyId;
  if (!toPartyId || toPartyId === requesterId) {
    return { ok: false, error: "Select a valid borrower/counterparty before sending the request.", store };
  }

  if (findPendingRequestForLoan(store, loan.id)) {
    return {
      ok: false,
      error: "A loan request is already pending for this loan. Wait for the borrower’s response.",
      store,
    };
  }

  const requester = store.parties.find((p) => p.id === requesterId);
  const requesterName = requester?.name?.trim() || "a FIRE Nepal member";

  const request: FireLendingRequest = {
    id: uid("req"),
    loanId: loan.id,
    fromPartyId: requesterId,
    toPartyId,
    amount: loan.amount,
    currency: loan.currency,
    interestRate: loan.interestRate,
    durationMonths: loan.durationMonths,
    purpose: loan.purpose,
    status: "pending",
    createdAt: todayIso(),
    message: input.message,
  };

  const notification: FireLendingNotification = {
    id: uid("ntf"),
    kind: "loan_request",
    title: "New loan request",
    body: borrowerNotificationBody(requesterName),
    createdAt: todayIso(),
    read: false,
    href: "/fire-lending/requests",
    forPartyId: toPartyId,
    relatedRequestId: request.id,
    relatedLoanId: loan.id,
  };

  const nextLoans: FireLendingLoan[] = store.loans.map((l) =>
    l.id === loan.id ? { ...l, status: "pending_approval" as const } : l,
  );

  const nextStore: FireLendingStore = {
    ...store,
    loans: nextLoans,
    requests: [request, ...store.requests],
    notifications: [notification, ...store.notifications],
  };

  return { ok: true, store: nextStore, request };
}

/**
 * Only the counterparty (toPartyId) may Accept / Reject.
 * Updates linked loan status and notifies the requester.
 */
export function respondToLoanRequest(
  store: FireLendingStore,
  input: RespondToLoanRequestInput,
): LoanRequestMutationResult {
  const request = store.requests.find((r) => r.id === input.requestId);
  const auth = canRespondToLoanRequest(request, input.actorPartyId);
  if (!request || !auth.ok) {
    return { ok: false, error: auth.ok === false ? auth.error : "Loan request not found.", store };
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
      return { ...l, status: "pending_signature" as const };
    }
    if (input.action === "rejected") {
      return { ...l, status: "rejected" as const };
    }
    // changes_requested — keep waiting on approval
    return { ...l, status: "pending_approval" as const };
  });

  const agreements = store.agreements.map((a) => {
    if (!request.loanId || a.loanId !== request.loanId) return a;
    if (input.action === "rejected") {
      return { ...a, status: "void" as const };
    }
    return a;
  });

  const actionLabel =
    input.action === "accepted" ? "accepted" : input.action === "rejected" ? "rejected" : "requested changes to";

  const notifications: FireLendingNotification[] = [
    {
      id: uid("ntf"),
      kind: "loan_request",
      title: input.action === "accepted" ? "Loan request accepted" : input.action === "rejected" ? "Loan request rejected" : "Changes requested",
        body:
        input.note ||
        `The borrower ${actionLabel} your loan request.`,
      createdAt: todayIso(),
      read: false,
      href: request.loanId ? `/fire-lending/loans/${request.loanId}` : "/fire-lending/requests",
      forPartyId: request.fromPartyId,
      relatedRequestId: request.id,
      relatedLoanId: request.loanId,
    },
    ...store.notifications,
  ];

  if (input.action === "accepted" && request.loanId) {
    const loan = loans.find((l) => l.id === request.loanId);
    if (loan) {
      notifications.unshift({
        id: uid("ntf"),
        kind: "signature",
        title: "Signature required",
        body: `Agreement ${loan.agreementNumber} is ready for digital signatures.`,
        createdAt: todayIso(),
        read: false,
        href: "/fire-lending/agreements",
        forPartyId: request.fromPartyId,
        relatedLoanId: loan.id,
      });
    }
  }

  const nextStore: FireLendingStore = {
    ...store,
    requests: store.requests.map((r) => (r.id === request.id ? updatedRequest : r)),
    loans,
    agreements,
    notifications,
  };

  return { ok: true, store: nextStore, request: updatedRequest };
}

/** Wizard approval step copy helpers (requester side). */
export const LOAN_REQUEST_UI = {
  title: "Loan Request",
  prompt: "Do you want to send this loan request to the borrower?",
  requestButton: "Request",
  confirmSend: "Send Request",
  confirmCancel: "Cancel",
  successMessage: "Loan request sent successfully. Waiting for the borrower’s response.",
  waitingTitle: "Request Sent — Waiting for Borrower",
  pendingStatus: "pending" as const,
} as const;
