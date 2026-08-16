/**
 * Cross-user loan request delivery.
 *
 * Each member has a private fire_lending snapshot. Sending a request only mutates
 * the sender's store unless we explicitly mirror it into the recipient's store
 * with party ids remapped to the recipient's `currentUserId` namespace.
 *
 * Visibility rules (Requests UI / badge):
 * - Incoming pending: status === "pending" && toPartyId === sessionUserId
 * - Visible in Requests: fromPartyId === sessionUserId || toPartyId === sessionUserId
 */
import { uid } from "@/lib/fire-lending/format";
import type {
  FireLendingAgreement,
  FireLendingDocument,
  FireLendingLoan,
  FireLendingNotification,
  FireLendingParty,
  FireLendingRequest,
  FireLendingStore,
  LoanRole,
} from "@/lib/fire-lending/types";

export function isRequestVisibleToUser(
  request: FireLendingRequest,
  sessionUserId: string,
): boolean {
  const me = String(sessionUserId ?? "").trim();
  if (!me) return false;
  return request.fromPartyId === me || request.toPartyId === me;
}

/** Requests the session user should see on the Requests page (incoming + outgoing). */
export function requestsVisibleToUser(
  store: FireLendingStore,
  sessionUserId: string = store.currentUserId,
): FireLendingRequest[] {
  return store.requests.filter((r) => isRequestVisibleToUser(r, sessionUserId));
}

/** Pending requests addressed to the session user (badge / inbox count). */
export function incomingPendingRequestsForUser(
  store: FireLendingStore,
  sessionUserId: string = store.currentUserId,
): FireLendingRequest[] {
  const me = String(sessionUserId ?? "").trim();
  return store.requests.filter((r) => r.status === "pending" && r.toPartyId === me);
}

function normalizeFireId(value: string | undefined | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function findPartyByFireId(
  parties: FireLendingParty[],
  fireNepalId: string,
  excludeId?: string,
): FireLendingParty | undefined {
  const id = normalizeFireId(fireNepalId);
  if (!id) return undefined;
  return parties.find(
    (p) => p.id !== excludeId && normalizeFireId(p.fireNepalId) === id,
  );
}

function upsertPartyByFireId(
  store: FireLendingStore,
  source: FireLendingParty,
  preferId?: string,
): { store: FireLendingStore; partyId: string } {
  const fireId = normalizeFireId(source.fireNepalId);
  const existing =
    (preferId ? store.parties.find((p) => p.id === preferId) : undefined) ||
    findPartyByFireId(store.parties, fireId, store.currentUserId);

  if (existing) {
    const updated: FireLendingParty = {
      ...existing,
      name: source.name || existing.name,
      fireNepalId: fireId || existing.fireNepalId,
      photoUrl: source.photoUrl ?? existing.photoUrl,
      verified: source.verified || existing.verified,
      identityVerified: source.identityVerified || existing.identityVerified,
      trustScore: Math.max(existing.trustScore, source.trustScore),
      onTimePayments: Math.max(existing.onTimePayments, source.onTimePayments),
      latePayments: Math.max(existing.latePayments, source.latePayments),
      loansCompleted: Math.max(existing.loansCompleted, source.loansCompleted),
      rolePreference: source.rolePreference || existing.rolePreference,
    };
    return {
      partyId: existing.id,
      store: {
        ...store,
        parties: store.parties.map((p) => (p.id === existing.id ? updated : p)),
      },
    };
  }

  const partyId = preferId && preferId !== store.currentUserId ? preferId : uid("party");
  const party: FireLendingParty = {
    ...source,
    id: partyId,
    fireNepalId: fireId || source.fireNepalId,
  };
  return {
    partyId,
    store: { ...store, parties: [...store.parties, party] },
  };
}

function ensureSelfParty(store: FireLendingStore, hint?: FireLendingParty): FireLendingStore {
  const meId = store.currentUserId;
  const existing = store.parties.find((p) => p.id === meId);
  if (existing) {
    if (!hint) return store;
    return {
      ...store,
      parties: store.parties.map((p) =>
        p.id === meId
          ? {
              ...p,
              name: hint.name && !/^you$/i.test(hint.name) ? hint.name : p.name,
              fireNepalId: normalizeFireId(hint.fireNepalId) || p.fireNepalId,
              photoUrl: hint.photoUrl ?? p.photoUrl,
              verified: hint.verified || p.verified,
              identityVerified: hint.identityVerified || p.identityVerified,
            }
          : p,
      ),
    };
  }

  const synthesized: FireLendingParty = {
    id: meId,
    fireNepalId: normalizeFireId(hint?.fireNepalId) || "FN-LOCAL-USER",
    name: hint?.name && !/^you$/i.test(hint.name) ? hint.name : "You",
    mobile: hint?.mobile ?? "",
    photoUrl: hint?.photoUrl,
    trustScore: hint?.trustScore ?? 0,
    verified: hint?.verified ?? false,
    rolePreference: hint?.rolePreference ?? "both",
    onTimePayments: hint?.onTimePayments ?? 0,
    latePayments: hint?.latePayments ?? 0,
    loansCompleted: hint?.loansCompleted ?? 0,
    identityVerified: hint?.identityVerified ?? false,
  };
  return { ...store, parties: [...store.parties, synthesized] };
}

/** Viewer role on the recipient copy: opposite of the sender's role on the loan. */
export function recipientRoleOnDeliveredLoan(senderRole: LoanRole): LoanRole {
  return senderRole === "lender" ? "borrower" : "lender";
}

export type DeliverLoanRequestInput = {
  senderStore: FireLendingStore;
  recipientStore: FireLendingStore;
  request: FireLendingRequest;
};

export type DeliverLoanRequestResult =
  | {
      ok: true;
      store: FireLendingStore;
      request: FireLendingRequest;
      /** True when the request was already present (idempotent). */
      alreadyPresent: boolean;
    }
  | { ok: false; error: string };

/**
 * Mirror a pending loan request (and linked loan artifacts) into the recipient's
 * private store so their Requests UI / badge can resolve:
 *   request.toPartyId === recipientStore.currentUserId
 *   request.fromPartyId === local requester party id
 */
export function deliverLoanRequestToRecipientStore(
  input: DeliverLoanRequestInput,
): DeliverLoanRequestResult {
  const { senderStore, request } = input;
  let recipientStore = input.recipientStore;

  if (!request?.id) {
    return { ok: false, error: "Loan request is missing an id." };
  }
  if (request.status !== "pending") {
    return { ok: false, error: `Cannot deliver a request with status ${request.status}.` };
  }

  const existing = recipientStore.requests.find((r) => r.id === request.id);
  if (existing) {
    const alreadyOk =
      existing.toPartyId === recipientStore.currentUserId &&
      existing.fromPartyId !== existing.toPartyId &&
      existing.fromPartyId !== recipientStore.currentUserId;
    if (alreadyOk) {
      return { ok: true, store: recipientStore, request: existing, alreadyPresent: true };
    }
    // Fall through and repair mis-delivered / self-request rows.
  }

  let senderRequester = senderStore.parties.find((p) => p.id === request.fromPartyId);
  const senderRecipient = senderStore.parties.find((p) => p.id === request.toPartyId);
  // Auth stores often omit a self party until first profile sync — synthesize so delivery
  // still remaps away from shared party_me ids.
  if (!senderRequester) {
    senderRequester = {
      id: request.fromPartyId,
      fireNepalId: "",
      name: "FIRE Nepal member",
      mobile: "",
      trustScore: 0,
      verified: false,
      rolePreference: "both",
      onTimePayments: 0,
      latePayments: 0,
      loansCompleted: 0,
      identityVerified: false,
    };
  }
  if (!senderRecipient) {
    return { ok: false, error: "Recipient party not found in sender store." };
  }

  recipientStore = ensureSelfParty(recipientStore, senderRecipient);

  const requesterUpsert = upsertPartyByFireId(recipientStore, {
    ...senderRequester,
    // Never keep sender's "You" label in the recipient inbox.
    name:
      senderRequester.name && !/^you$/i.test(senderRequester.name.trim())
        ? senderRequester.name
        : "FIRE Nepal member",
  });
  recipientStore = requesterUpsert.store;
  const fromPartyId = requesterUpsert.partyId;
  const toPartyId = recipientStore.currentUserId;

  if (fromPartyId === toPartyId) {
    return { ok: false, error: "Requester and recipient must be different members." };
  }

  const deliveredRequest: FireLendingRequest = {
    ...request,
    fromPartyId,
    toPartyId,
  };

  const linkedLoan = request.loanId
    ? senderStore.loans.find((l) => l.id === request.loanId)
    : undefined;

  let loans = recipientStore.loans;
  let agreements = recipientStore.agreements;
  let installments = recipientStore.installments;
  let documents = recipientStore.documents;

  if (linkedLoan) {
    const recipientRole = recipientRoleOnDeliveredLoan(linkedLoan.role);
    const deliveredLoan: FireLendingLoan = {
      ...linkedLoan,
      role: recipientRole,
      counterpartyId: fromPartyId,
      // Remap durable ids into the recipient namespace.
      lenderId: recipientRole === "lender" ? toPartyId : fromPartyId,
      borrowerId: recipientRole === "borrower" ? toPartyId : fromPartyId,
    };
    loans = recipientStore.loans.some((l) => l.id === deliveredLoan.id)
      ? recipientStore.loans.map((l) => (l.id === deliveredLoan.id ? deliveredLoan : l))
      : [deliveredLoan, ...recipientStore.loans];

    const senderAgreements = senderStore.agreements.filter((a) => a.loanId === linkedLoan.id);
    const mergedAgreements: FireLendingAgreement[] = [...recipientStore.agreements];
    for (const agr of senderAgreements) {
      const idx = mergedAgreements.findIndex((a) => a.id === agr.id);
      if (idx >= 0) mergedAgreements[idx] = agr;
      else mergedAgreements.unshift(agr);
    }
    agreements = mergedAgreements;

    const senderInstallments = senderStore.installments.filter((i) => i.loanId === linkedLoan.id);
    const otherInstallments = recipientStore.installments.filter((i) => i.loanId !== linkedLoan.id);
    installments = [...senderInstallments, ...otherInstallments];

    const senderDocs = senderStore.documents.filter((d) => d.loanId === linkedLoan.id);
    const mergedDocs: FireLendingDocument[] = [
      ...senderDocs,
      ...recipientStore.documents.filter(
        (d) => d.loanId !== linkedLoan.id || !senderDocs.some((s) => s.id === d.id),
      ),
    ];
    documents = mergedDocs;
  }

  const senderNotification = senderStore.notifications.find(
    (n) =>
      n.kind === "loan_request" &&
      (n.relatedRequestId === request.id ||
        (request.loanId != null && n.relatedLoanId === request.loanId && n.forPartyId === request.toPartyId)),
  );

  const deliveredNotification: FireLendingNotification | null = senderNotification
    ? {
        ...senderNotification,
        id: senderNotification.id || uid("ntf"),
        forPartyId: toPartyId,
        relatedRequestId: deliveredRequest.id,
        relatedLoanId: deliveredRequest.loanId,
        read: false,
      }
    : {
        id: uid("ntf"),
        kind: "loan_request",
        title: "New Loan Request",
        body: `${
          senderRequester.name && !/^you$/i.test(senderRequester.name.trim())
            ? senderRequester.name
            : "A FIRE Nepal member"
        } has sent you a loan request. Please review the loan details and respond.`,
        createdAt: deliveredRequest.createdAt,
        read: false,
        href: deliveredRequest.loanId
          ? `/fire-lending/loans/${deliveredRequest.loanId}`
          : "/fire-lending/requests",
        forPartyId: toPartyId,
        relatedRequestId: deliveredRequest.id,
        relatedLoanId: deliveredRequest.loanId,
      };

  const notifications = recipientStore.notifications.some(
    (n) =>
      n.kind === "loan_request" &&
      (n.relatedRequestId === deliveredRequest.id ||
        (deliveredRequest.loanId != null &&
          n.relatedLoanId === deliveredRequest.loanId &&
          n.forPartyId === toPartyId)),
  )
    ? recipientStore.notifications.map((n) =>
        n.kind === "loan_request" &&
        (n.relatedRequestId === deliveredRequest.id ||
          (deliveredRequest.loanId != null && n.relatedLoanId === deliveredRequest.loanId))
          ? { ...deliveredNotification!, id: n.id }
          : n,
      )
    : [deliveredNotification, ...recipientStore.notifications];

  const requests = existing
    ? recipientStore.requests.map((r) => (r.id === deliveredRequest.id ? deliveredRequest : r))
    : [deliveredRequest, ...recipientStore.requests];

  const nextStore: FireLendingStore = {
    ...recipientStore,
    parties: recipientStore.parties,
    loans,
    agreements,
    installments,
    documents,
    requests,
    notifications,
  };

  return { ok: true, store: nextStore, request: deliveredRequest, alreadyPresent: Boolean(existing) };
}
