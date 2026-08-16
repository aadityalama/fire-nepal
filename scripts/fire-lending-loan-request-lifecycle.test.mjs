/**
 * End-to-end peer-loan request lifecycle: Raj Kumar (borrower) → Tejesh (lender).
 *
 * Trace: sendLoanRequest → deliverLoanRequestToRecipientStore → Incoming Requests
 * visibility / notification / email payload / Cancel·Accept·Reject·Signature actions.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actorRoleOnLoan,
  bothPartiesSigned,
  signLoanAgreement,
} from "../src/lib/fire-lending/agreement-signatures.ts";
import {
  buildLenderBorrowerIds,
  partyDisplayName,
  resolveLoanPartyIds,
} from "../src/lib/fire-lending/loan-party-identity.ts";
import {
  borrowerNotificationBody,
  canRespondToLoanRequest,
  isSelfLoanRequest,
  LOAN_REQUEST_UI,
  requestActionsForParty,
  respondToLoanRequest,
  sendLoanRequest,
} from "../src/lib/fire-lending/loan-request-approval.ts";
import {
  deliverLoanRequestToRecipientStore,
  incomingPendingRequestsForUser,
  requestsVisibleToUser,
} from "../src/lib/fire-lending/loan-request-delivery.ts";
import { buildLoanRequestEmail } from "../src/lib/fire-lending/loan-request-email.ts";
import { createEmptyLendingStore } from "../src/lib/fire-lending/storage.ts";

const RAJ = "party_raj_kumar";
const TEJESH = "party_tejesh";
const OTHER = "party_other_user";

function party(id, fireNepalId, name) {
  return {
    id,
    fireNepalId,
    name,
    mobile: "",
    trustScore: 72,
    verified: true,
    rolePreference: "both",
    onTimePayments: 3,
    latePayments: 0,
    loansCompleted: 1,
    identityVerified: true,
  };
}

/** Raj's store: he is borrowing; Tejesh is a local counterparty party id. */
function rajStore() {
  const tejeshLocalId = "party_local_tejesh_in_raj";
  const ids = buildLenderBorrowerIds({
    creatorPartyId: RAJ,
    counterpartyId: tejeshLocalId,
    creatorRole: "borrower",
  });
  assert.equal(ids.ok, true);
  if (!ids.ok) throw new Error(ids.error);

  const loan = {
    id: "loan_raj_tejesh_1",
    agreementNumber: "FL-RT-001",
    role: "borrower",
    counterpartyId: tejeshLocalId,
    lenderId: ids.lenderId,
    borrowerId: ids.borrowerId,
    amount: 75000,
    currency: "NPR",
    interestRate: 11,
    loanType: "peer",
    durationMonths: 8,
    installmentCount: 8,
    gracePeriodDays: 3,
    lateFeePercent: 1,
    purpose: "Peer loan request",
    status: "pending_approval",
    createdAt: "2026-08-16",
    outstanding: 75000,
    totalPaid: 0,
    interestEarned: 0,
    connectionMethod: "fire_id",
    borrowerSigned: false,
    lenderSigned: false,
    riskScore: 28,
  };

  return {
    ...createEmptyLendingStore(),
    currentUserId: RAJ,
    parties: [
      party(RAJ, "FN-RAJ-001", "Raj Kumar"),
      party(tejeshLocalId, "FN-TEJESH-001", "Tejesh"),
    ],
    loans: [loan],
    agreements: [
      {
        id: "agr_rt_1",
        loanId: loan.id,
        agreementNumber: loan.agreementNumber,
        status: "awaiting_signatures",
        generatedAt: loan.createdAt,
        terms: "Test terms",
        qrPayload: `fire-nepal://verify/agreement/${loan.agreementNumber}`,
      },
    ],
  };
}

function tejeshEmptyStore() {
  return {
    ...createEmptyLendingStore(),
    // Shared party_me collision case: both accounts often use party_me.
    currentUserId: "party_me",
    parties: [party("party_me", "FN-TEJESH-001", "Tejesh")],
  };
}

function otherEmptyStore() {
  return {
    ...createEmptyLendingStore(),
    currentUserId: OTHER,
    parties: [party(OTHER, "FN-OTHER-001", "Other User")],
  };
}

describe("Raj Kumar → Tejesh peer-loan request lifecycle", () => {
  it("A→B: request appears in Tejesh Incoming with Raj borrower / Tejesh lender, not self-request", () => {
    const storeA = rajStore();
    const loan = storeA.loans[0];
    assert.equal(loan.borrowerId, RAJ);
    assert.equal(loan.lenderId, "party_local_tejesh_in_raj");
    assert.notEqual(loan.lenderId, loan.borrowerId);

    const sent = sendLoanRequest(storeA, { loanId: loan.id, actorPartyId: RAJ });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    assert.equal(sent.request.status, "pending");
    assert.equal(sent.request.fromPartyId, RAJ);
    assert.equal(sent.request.toPartyId, loan.counterpartyId);
    assert.equal(isSelfLoanRequest(sent.request), false);

    // Notification payload names Raj Kumar — never "You".
    const ntf = sent.store.notifications[0];
    assert.equal(ntf.kind, "loan_request");
    assert.equal(ntf.forPartyId, loan.counterpartyId);
    assert.match(ntf.body, /Raj Kumar has sent you a loan request/);
    assert.doesNotMatch(ntf.body, /You has sent you/i);
    assert.equal(
      borrowerNotificationBody(partyDisplayName(storeA.parties[0])),
      "Raj Kumar has sent you a loan request. Please review the loan details and respond.",
    );

    // Email payload: Borrower = Raj, Lender = Tejesh.
    const email = buildLoanRequestEmail({
      recipientName: "Tejesh",
      requesterName: partyDisplayName(storeA.parties[0]),
      requesterRoleLabel: "Borrower",
      counterpartyRoleLabel: "Lender",
      loanReference: loan.agreementNumber,
      amountLabel: "Rs 75,000",
      interestRate: loan.interestRate,
      durationMonths: loan.durationMonths,
      requestDateIso: "2026-08-16T10:00:00.000Z",
      reviewUrl: "https://firenepal.com/fire-lending/loans/loan_raj_tejesh_1",
      logoUrl: "https://firenepal.com/logo.png",
    });
    assert.match(email.text, /Borrower: Raj Kumar/);
    assert.match(email.text, /Lender: Tejesh/);
    assert.doesNotMatch(email.text, /You has sent you/i);

    // Deliver into Tejesh's private snapshot (party_me session id).
    const storeB0 = tejeshEmptyStore();
    const delivered = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: storeB0,
      request: sent.request,
    });
    assert.equal(delivered.ok, true);
    if (!delivered.ok) return;

    assert.equal(delivered.request.status, "pending");
    assert.equal(delivered.request.toPartyId, storeB0.currentUserId);
    assert.notEqual(delivered.request.fromPartyId, delivered.request.toPartyId);
    assert.equal(isSelfLoanRequest(delivered.request), false);

    const incoming = incomingPendingRequestsForUser(delivered.store, storeB0.currentUserId);
    assert.equal(incoming.length, 1);
    assert.equal(incoming[0].id, sent.request.id);

    const loanOnB = delivered.store.loans.find((l) => l.id === loan.id);
    assert.ok(loanOnB);
    assert.equal(loanOnB.role, "lender");
    const idsB = resolveLoanPartyIds(loanOnB, storeB0.currentUserId);
    assert.equal(idsB.lenderId, storeB0.currentUserId);
    assert.equal(idsB.borrowerId, delivered.request.fromPartyId);
    assert.notEqual(idsB.lenderId, idsB.borrowerId);

    const rajOnB = delivered.store.parties.find((p) => p.id === delivered.request.fromPartyId);
    const tejeshOnB = delivered.store.parties.find((p) => p.id === storeB0.currentUserId);
    assert.equal(partyDisplayName(rajOnB), "Raj Kumar");
    assert.equal(partyDisplayName(tejeshOnB), "Tejesh");

    // Must not appear for Other user.
    const storeC = otherEmptyStore();
    assert.equal(incomingPendingRequestsForUser(storeC, OTHER).length, 0);
    assert.equal(requestsVisibleToUser(storeC, OTHER).length, 0);
  });

  it("A→B actions: Raj signs as borrower only; Tejesh Accept/Reject/Cancel after both signs", () => {
    const storeA = rajStore();
    const sent = sendLoanRequest(storeA, {
      loanId: "loan_raj_tejesh_1",
      actorPartyId: RAJ,
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const delivered = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: tejeshEmptyStore(),
      request: sent.request,
    });
    assert.equal(delivered.ok, true);
    if (!delivered.ok) return;

    const tejeshId = delivered.store.currentUserId;
    const rajLocalOnB = delivered.request.fromPartyId;

    // Before signatures: Tejesh cannot Accept; dialog Cancel is only for approval UI.
    let actionsB = requestActionsForParty(
      delivered.request,
      tejeshId,
      delivered.store.loans[0],
      tejeshId,
    );
    assert.equal(actionsB.isRecipient, true);
    assert.equal(actionsB.isRequester, false);
    assert.equal(actionsB.isSelfRequest, false);
    assert.equal(actionsB.canAccept, false);
    assert.equal(actionsB.canReject, false);
    assert.equal(actionsB.canSignAsLender, true);
    assert.equal(actionsB.canSignAsBorrower, false);

    const actionsA = requestActionsForParty(
      sent.request,
      RAJ,
      sent.store.loans.find((l) => l.id === "loan_raj_tejesh_1"),
      RAJ,
    );
    assert.equal(actionsA.isRequester, true);
    assert.equal(actionsA.canAccept, false);
    assert.equal(actionsA.canReject, false);
    assert.equal(actionsA.canSignAsBorrower, true);
    assert.equal(actionsA.canSignAsLender, false);
    assert.equal(LOAN_REQUEST_UI.confirmCancel, "Cancel");

    // Raj signs as borrower on his store.
    const s1 = signLoanAgreement(sent.store, {
      loanId: "loan_raj_tejesh_1",
      actorPartyId: RAJ,
      as: "borrower",
    });
    assert.equal(s1.ok, true);
    if (!s1.ok) return;
    assert.equal(actorRoleOnLoan(s1.loan, RAJ, RAJ), "borrower");

    // Mirror signature flags onto Tejesh store and Tejesh signs as lender.
    let storeB = {
      ...delivered.store,
      loans: delivered.store.loans.map((l) =>
        l.id === "loan_raj_tejesh_1"
          ? { ...l, borrowerSigned: true, lenderSigned: false }
          : l,
      ),
    };
    const s2 = signLoanAgreement(storeB, {
      loanId: "loan_raj_tejesh_1",
      actorPartyId: tejeshId,
      as: "lender",
    });
    assert.equal(s2.ok, true);
    if (!s2.ok) return;
    assert.equal(bothPartiesSigned(s2.loan), true);
    storeB = s2.store;

    actionsB = requestActionsForParty(
      delivered.request,
      tejeshId,
      storeB.loans.find((l) => l.id === "loan_raj_tejesh_1"),
      tejeshId,
    );
    assert.equal(actionsB.canAccept, true);
    assert.equal(actionsB.canReject, true);
    assert.equal(actionsB.canDismissApprovalDialog, true);

    // Raj still cannot Accept his own request.
    const denied = canRespondToLoanRequest(sent.request, RAJ, s1.loan, RAJ);
    assert.equal(denied.ok, false);

    const accepted = respondToLoanRequest(storeB, {
      requestId: delivered.request.id,
      actorPartyId: tejeshId,
      action: "accepted",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.request.status, "accepted");
    void rajLocalOnB;
  });

  it("wizard copy targets the lender; Cancel is dialog dismiss only", () => {
    assert.equal(LOAN_REQUEST_UI.prompt, "Do you want to send this loan request to the lender?");
    assert.equal(LOAN_REQUEST_UI.confirmSend, "Send Request");
    assert.equal(LOAN_REQUEST_UI.confirmCancel, "Cancel");
    assert.equal(LOAN_REQUEST_UI.confirmAccept, "Accept");
    assert.equal(LOAN_REQUEST_UI.confirmReject, "Reject");
    assert.match(LOAN_REQUEST_UI.successMessage, /Waiting for the lender/);
    assert.notEqual(LOAN_REQUEST_UI.requestButton, "Accept");
  });

  it("shared party_me ids never produce a Tejesh self-request after delivery", () => {
    // Raj also uses party_me (common empty-store default).
    const tejeshLocalId = "party_local_tejesh";
    const storeA = {
      ...createEmptyLendingStore(),
      currentUserId: "party_me",
      parties: [
        party("party_me", "FN-RAJ-001", "Raj Kumar"),
        party(tejeshLocalId, "FN-TEJESH-001", "Tejesh"),
      ],
      loans: [
        {
          id: "loan_party_me_collision",
          agreementNumber: "FL-ME-001",
          role: "borrower",
          counterpartyId: tejeshLocalId,
          lenderId: tejeshLocalId,
          borrowerId: "party_me",
          amount: 10000,
          currency: "NPR",
          interestRate: 10,
          loanType: "peer",
          durationMonths: 3,
          installmentCount: 3,
          gracePeriodDays: 0,
          lateFeePercent: 0,
          purpose: "Collision test",
          status: "pending_approval",
          createdAt: "2026-08-16",
          outstanding: 10000,
          totalPaid: 0,
          interestEarned: 0,
          connectionMethod: "fire_id",
          borrowerSigned: false,
          lenderSigned: false,
          riskScore: 20,
        },
      ],
    };

    const sent = sendLoanRequest(storeA, {
      loanId: "loan_party_me_collision",
      actorPartyId: "party_me",
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const storeB = {
      ...createEmptyLendingStore(),
      currentUserId: "party_me",
      parties: [party("party_me", "FN-TEJESH-001", "Tejesh")],
    };

    const delivered = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: storeB,
      request: sent.request,
    });
    assert.equal(delivered.ok, true);
    if (!delivered.ok) return;

    assert.equal(delivered.request.toPartyId, "party_me");
    assert.notEqual(delivered.request.fromPartyId, "party_me");
    assert.equal(isSelfLoanRequest(delivered.request), false);
    assert.equal(incomingPendingRequestsForUser(delivered.store, "party_me").length, 1);
    const actions = requestActionsForParty(
      delivered.request,
      "party_me",
      delivered.store.loans[0],
      "party_me",
    );
    assert.equal(actions.isSelfRequest, false);
    assert.equal(actions.isRecipient, true);
    assert.equal(actions.isRequester, false);
  });
});
