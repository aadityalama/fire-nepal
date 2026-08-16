/**
 * Regression: peer-loan request delivery across separate user stores.
 *
 * User A creates a request for User B → B's Requests (toPartyId === B.session)
 * must include it; User C must not see it.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendLoanRequest } from "../src/lib/fire-lending/loan-request-approval.ts";
import {
  deliverLoanRequestToRecipientStore,
  incomingPendingRequestsForUser,
  isRequestVisibleToUser,
  recipientRoleOnDeliveredLoan,
  requestsVisibleToUser,
} from "../src/lib/fire-lending/loan-request-delivery.ts";
import { createEmptyLendingStore } from "../src/lib/fire-lending/storage.ts";

const USER_A = "party_user_a";
const USER_B = "party_user_b";
const USER_C = "party_user_c";

function party(id, fireNepalId, name) {
  return {
    id,
    fireNepalId,
    name,
    mobile: "",
    trustScore: 70,
    verified: true,
    rolePreference: "both",
    onTimePayments: 2,
    latePayments: 0,
    loansCompleted: 1,
    identityVerified: true,
  };
}

/** Sender (User A) store: A is current user; B is a local counterparty party id. */
function storeForUserA() {
  const counterpartyLocalId = "party_local_b_in_a";
  const loan = {
    id: "loan_ab_1",
    agreementNumber: "FL-AB-001",
    role: "borrower",
    counterpartyId: counterpartyLocalId,
    amount: 50000,
    currency: "NPR",
    interestRate: 10,
    loanType: "peer",
    durationMonths: 6,
    installmentCount: 6,
    gracePeriodDays: 3,
    lateFeePercent: 1,
    purpose: "Peer loan A→B",
    status: "pending_approval",
    createdAt: "2026-08-16",
    outstanding: 50000,
    totalPaid: 0,
    interestEarned: 0,
    connectionMethod: "fire_id",
    borrowerSigned: false,
    lenderSigned: false,
    riskScore: 30,
  };

  return {
    ...createEmptyLendingStore(),
    currentUserId: USER_A,
    parties: [
      party(USER_A, "FN-USER-A", "Alice Sender"),
      party(counterpartyLocalId, "FN-USER-B", "Bob Recipient"),
    ],
    loans: [loan],
    agreements: [
      {
        id: "agr_ab_1",
        loanId: loan.id,
        agreementNumber: loan.agreementNumber,
        status: "awaiting_signatures",
        generatedAt: loan.createdAt,
        terms: "Test",
        qrPayload: `fire-nepal://verify/agreement/${loan.agreementNumber}`,
      },
    ],
  };
}

function emptyStoreForUser(userId, fireNepalId, name) {
  return {
    ...createEmptyLendingStore(),
    currentUserId: userId,
    parties: [party(userId, fireNepalId, name)],
  };
}

describe("peer-loan request delivery — User A → User B", () => {
  it("request created by User A for User B appears in User B Requests and not for User C", () => {
    const storeA = storeForUserA();
    const sent = sendLoanRequest(storeA, {
      loanId: "loan_ab_1",
      actorPartyId: USER_A,
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    // Sender-side identity checks (borrower = A, recipient/lender = B local party).
    assert.equal(sent.request.fromPartyId, USER_A);
    assert.equal(sent.request.toPartyId, "party_local_b_in_a");
    assert.equal(sent.request.status, "pending");
    assert.equal(isRequestVisibleToUser(sent.request, USER_A), true);
    assert.equal(isRequestVisibleToUser(sent.request, USER_B), false); // B's session id differs until delivery remap

    const storeB = emptyStoreForUser(USER_B, "FN-USER-B", "Bob Recipient");
    const storeC = emptyStoreForUser(USER_C, "FN-USER-C", "Carol Other");

    const deliveredB = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: storeB,
      request: sent.request,
    });
    assert.equal(deliveredB.ok, true);
    if (!deliveredB.ok) return;

    // Recipient lookup conditions used by Requests UI / badge.
    assert.equal(deliveredB.request.toPartyId, USER_B);
    assert.equal(deliveredB.request.toPartyId, storeB.currentUserId);
    assert.equal(deliveredB.request.status, "pending");
    assert.notEqual(deliveredB.request.fromPartyId, USER_B);
    assert.equal(deliveredB.request.fromPartyId, deliveredB.store.currentUserId ? deliveredB.request.fromPartyId : null);

    const bVisible = requestsVisibleToUser(deliveredB.store, USER_B);
    assert.equal(bVisible.length, 1);
    assert.equal(bVisible[0].id, sent.request.id);
    assert.equal(bVisible[0].toPartyId, USER_B);
    assert.equal(bVisible[0].fromPartyId !== USER_B, true);

    const bIncoming = incomingPendingRequestsForUser(deliveredB.store, USER_B);
    assert.equal(bIncoming.length, 1);
    assert.equal(bIncoming[0].id, sent.request.id);

    // Linked loan remapped for B's viewer role (A was borrower → B is lender).
    const loanOnB = deliveredB.store.loans.find((l) => l.id === "loan_ab_1");
    assert.ok(loanOnB);
    assert.equal(loanOnB.role, recipientRoleOnDeliveredLoan("borrower"));
    assert.equal(loanOnB.role, "lender");
    assert.equal(loanOnB.counterpartyId, deliveredB.request.fromPartyId);

    // Notification targeted at B's session user id.
    const ntf = deliveredB.store.notifications.find(
      (n) => n.kind === "loan_request" && n.relatedRequestId === sent.request.id,
    );
    assert.ok(ntf);
    assert.equal(ntf.forPartyId, USER_B);

    // User C must not see the request (no delivery into C's store).
    assert.equal(requestsVisibleToUser(storeC, USER_C).length, 0);
    assert.equal(incomingPendingRequestsForUser(storeC, USER_C).length, 0);

    // Even if someone incorrectly copied the raw sender request into C without remap,
    // visibility vs C's session id must fail.
    assert.equal(isRequestVisibleToUser(sent.request, USER_C), false);
    assert.equal(isRequestVisibleToUser(deliveredB.request, USER_C), false);
  });

  it("delivery is idempotent and never marks User C as recipient", () => {
    const storeA = storeForUserA();
    const sent = sendLoanRequest(storeA, {
      loanId: "loan_ab_1",
      actorPartyId: USER_A,
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    let storeB = emptyStoreForUser(USER_B, "FN-USER-B", "Bob Recipient");
    const first = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: storeB,
      request: sent.request,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    storeB = first.store;

    const second = deliverLoanRequestToRecipientStore({
      senderStore: sent.store,
      recipientStore: storeB,
      request: sent.request,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.alreadyPresent, true);
    assert.equal(
      second.store.requests.filter((r) => r.id === sent.request.id).length,
      1,
    );
    assert.equal(incomingPendingRequestsForUser(second.store, USER_B).length, 1);
    assert.equal(incomingPendingRequestsForUser(second.store, USER_C).length, 0);
  });

  it("sender Requests still show the outgoing request for User A only", () => {
    const storeA = storeForUserA();
    const sent = sendLoanRequest(storeA, {
      loanId: "loan_ab_1",
      actorPartyId: USER_A,
    });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;

    const outgoing = requestsVisibleToUser(sent.store, USER_A);
    assert.ok(outgoing.some((r) => r.id === sent.request.id && r.fromPartyId === USER_A));
    assert.equal(incomingPendingRequestsForUser(sent.store, USER_A).length, 0);
    assert.equal(incomingPendingRequestsForUser(sent.store, USER_B).length, 0);
  });
});
