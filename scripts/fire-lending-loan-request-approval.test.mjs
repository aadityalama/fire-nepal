/**
 * Loan request flow: User A (borrower) sends to User B (lender).
 * Only the lender may Accept/Reject, and only after both signatures.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bothPartiesSigned, signLoanAgreement } from "../src/lib/fire-lending/agreement-signatures.ts";
import {
  borrowerNotificationBody,
  borrowerNotificationTitle,
  canRespondToLoanRequest,
  findRequestForLoan,
  isLoanRequestRecipient,
  isLoanRequestRequester,
  LOAN_REQUEST_UI,
  respondToLoanRequest,
  sendLoanRequest,
} from "../src/lib/fire-lending/loan-request-approval.ts";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";

/** User A — borrower / requester */
const USER_A = "party_test_borrower_b";
/** User B — lender / recipient */
const USER_B = "party_test_lender_a";

function baseLoan(overrides = {}) {
  return {
    id: "loan_test_1",
    agreementNumber: "FL-TEST-001",
    role: "borrower",
    counterpartyId: USER_B,
    lenderId: USER_B,
    borrowerId: USER_A,
    amount: 100000,
    currency: "NPR",
    interestRate: 12,
    loanType: "peer",
    durationMonths: 12,
    installmentCount: 12,
    gracePeriodDays: 5,
    lateFeePercent: 2,
    purpose: "Peer lending",
    status: "pending_approval",
    createdAt: "2026-08-15",
    outstanding: 100000,
    totalPaid: 0,
    interestEarned: 0,
    connectionMethod: "fire_id",
    borrowerSigned: false,
    lenderSigned: false,
    riskScore: 40,
    ...overrides,
  };
}

function storeWithLoan(loan = baseLoan()) {
  const seed = createSeedStore();
  return {
    ...seed,
    currentUserId: USER_A,
    loans: [loan, ...seed.loans],
    agreements: [
      {
        id: "agr_test_1",
        loanId: loan.id,
        agreementNumber: loan.agreementNumber,
        status: "awaiting_signatures",
        generatedAt: loan.createdAt,
        terms: "Test terms",
        qrPayload: `fire-nepal://verify/agreement/${loan.agreementNumber}`,
      },
      ...seed.agreements,
    ],
  };
}

/** A sends request; both parties sign so B (lender) may Accept/Reject. */
function sendAndBothSign(store) {
  const sent = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
  assert.equal(sent.ok, true);
  if (!sent.ok) return sent;
  const s1 = signLoanAgreement(sent.store, {
    loanId: "loan_test_1",
    actorPartyId: USER_A,
    as: "borrower",
  });
  assert.equal(s1.ok, true);
  if (!s1.ok) return s1;
  const s2 = signLoanAgreement(s1.store, {
    loanId: "loan_test_1",
    actorPartyId: USER_B,
    as: "lender",
  });
  assert.equal(s2.ok, true);
  if (!s2.ok) return s2;
  assert.equal(bothPartiesSigned(s2.loan), true);
  return { ok: true, store: s2.store, request: sent.request };
}

describe("loan request approval — borrower (User A) side", () => {
  it("1. User A creates loan with User B as lender and can send a request", () => {
    const store = storeWithLoan();
    const loan = store.loans.find((l) => l.id === "loan_test_1");
    assert.equal(loan.borrowerId, USER_A);
    assert.equal(loan.lenderId, USER_B);
    assert.notEqual(loan.lenderId, loan.borrowerId);

    const result = sendLoanRequest(store, {
      loanId: "loan_test_1",
      actorPartyId: USER_A,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.request.fromPartyId, USER_A);
    assert.equal(result.request.toPartyId, USER_B);
    assert.equal(result.request.status, "pending");
    assert.equal(result.request.loanId, "loan_test_1");
  });

  it("2. requester UI uses Request (not Accept) copy for lender recipient", () => {
    assert.equal(LOAN_REQUEST_UI.requestButton, "Request");
    assert.equal(LOAN_REQUEST_UI.title, "Loan Request");
    assert.equal(LOAN_REQUEST_UI.prompt, "Do you want to send this loan request to the lender?");
    assert.equal(LOAN_REQUEST_UI.confirmSend, "Send Request");
    assert.equal(LOAN_REQUEST_UI.confirmCancel, "Cancel");
    assert.equal(LOAN_REQUEST_UI.waitingTitle, "Request Sent — Waiting for Lender");
    assert.match(LOAN_REQUEST_UI.successMessage, /Waiting for the lender/);
    assert.notEqual(LOAN_REQUEST_UI.requestButton, "Accept");
  });

  it("3. User A (borrower) cannot Accept their own request", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const denied = canRespondToLoanRequest(
      ready.request,
      USER_A,
      ready.store.loans.find((l) => l.id === "loan_test_1"),
    );
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.match(denied.error, /cannot accept or reject your own/i);

    const attempt = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_A,
      action: "accepted",
    });
    assert.equal(attempt.ok, false);
  });

  it("4. User A (borrower) cannot Reject their own request", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const attempt = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_A,
      action: "rejected",
    });
    assert.equal(attempt.ok, false);
    if (attempt.ok) return;
    assert.match(attempt.error, /cannot accept or reject your own/i);
  });

  it("5. User A cannot act as lender (forged role / wrong actor)", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    // Even after both signatures, borrower must not Accept.
    const attempt = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_A,
      action: "accepted",
    });
    assert.equal(attempt.ok, false);
  });

  it("5b. confirmation dialog copy targets the lender", () => {
    assert.equal(LOAN_REQUEST_UI.prompt, "Do you want to send this loan request to the lender?");
    assert.equal(LOAN_REQUEST_UI.confirmSend, "Send Request");
    assert.equal(LOAN_REQUEST_UI.confirmCancel, "Cancel");
  });
});

describe("loan request approval — lender (User B) side", () => {
  it("6. User B receives the request notification from User A", () => {
    const store = storeWithLoan();
    const borrower = store.parties.find((p) => p.id === USER_A);
    const result = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ntf = result.store.notifications[0];
    assert.equal(ntf.kind, "loan_request");
    assert.equal(ntf.title, borrowerNotificationTitle());
    assert.equal(ntf.forPartyId, USER_B);
    assert.match(ntf.body, new RegExp(borrowerNotificationBody(borrower?.name ?? "a FIRE Nepal member").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(ntf.body, /You has sent you/i);
  });

  it("7. lender can view the linked loan details via request.loanId", () => {
    const store = storeWithLoan(
      baseLoan({ notes: "Family peer loan", guarantor: "Uncle Ram", collateral: "Gold" }),
    );
    const result = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const linked = result.store.loans.find((l) => l.id === result.request.loanId);
    assert.ok(linked);
    assert.equal(linked.amount, 100000);
    assert.equal(linked.purpose, "Peer lending");
    assert.equal(linked.guarantor, "Uncle Ram");
    assert.equal(linked.collateral, "Gold");
    assert.equal(linked.notes, "Family peer loan");
    assert.equal(linked.agreementNumber, "FL-TEST-001");
    assert.equal(linked.lenderId, USER_B);
    assert.equal(linked.borrowerId, USER_A);
  });

  it("8. User B (lender) can Accept the request after both signatures", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    assert.equal(isLoanRequestRecipient(ready.request, USER_B), true);
    const accepted = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "accepted",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.request.status, "accepted");
  });

  it("9. User B (lender) can Reject the request after both signatures", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const rejected = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "rejected",
    });
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.request.status, "rejected");
  });

  it("10. request status becomes Accepted after lender accepts", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const accepted = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "accepted",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    const req = findRequestForLoan(accepted.store, "loan_test_1");
    assert.equal(req?.status, "accepted");
    assert.equal(accepted.store.loans.find((l) => l.id === "loan_test_1")?.status, "active");
  });

  it("11. request status becomes Rejected after lender rejects", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const rejected = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "rejected",
    });
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(findRequestForLoan(rejected.store, "loan_test_1")?.status, "rejected");
    assert.equal(rejected.store.loans.find((l) => l.id === "loan_test_1")?.status, "rejected");
    assert.equal(rejected.store.agreements.find((a) => a.loanId === "loan_test_1")?.status, "void");
  });

  it("12. borrower sees updated Accepted status and notification", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const accepted = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "accepted",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(isLoanRequestRequester(accepted.request, USER_A), true);
    assert.equal(accepted.request.status, "accepted");
    const requesterNtf = accepted.store.notifications.find(
      (n) => n.forPartyId === USER_A && n.kind === "loan_request",
    );
    assert.ok(requesterNtf);
    assert.match(requesterNtf.title, /accepted/i);
    assert.match(requesterNtf.body, /lender/i);
  });

  it("13. borrower sees updated Rejected status and notification", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const rejected = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: USER_B,
      action: "rejected",
    });
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.request.status, "rejected");
    const requesterNtf = rejected.store.notifications.find(
      (n) => n.forPartyId === USER_A && /rejected/i.test(n.title),
    );
    assert.ok(requesterNtf);
  });

  it("14. duplicate pending requests are prevented", () => {
    const store = storeWithLoan();
    const first = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const dup = sendLoanRequest(first.store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(dup.ok, false);
    if (dup.ok) return;
    assert.match(dup.error, /already pending/i);
    assert.equal(first.store.requests.filter((r) => r.loanId === "loan_test_1" && r.status === "pending").length, 1);
  });

  it("15. unauthorized users cannot approve or reject the request", () => {
    const store = storeWithLoan();
    const ready = sendAndBothSign(store);
    assert.equal(ready.ok, true);
    if (!ready.ok) return;
    const stranger = respondToLoanRequest(ready.store, {
      requestId: ready.request.id,
      actorPartyId: "party_binod",
      action: "accepted",
    });
    assert.equal(stranger.ok, false);
    if (stranger.ok) return;
    assert.match(stranger.error, /Only the lender/i);
  });

  it("15b. User B cannot act as borrower when signing", () => {
    const store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const forged = signLoanAgreement(sent.store, {
      loanId: "loan_test_1",
      actorPartyId: USER_B,
      as: "borrower",
    });
    assert.equal(forged.ok, false);
    if (!forged.ok) assert.match(forged.error, /only sign as the lender/i);
  });

  it("16. existing loan creation flow continues to work (seed + new pending_approval loan)", () => {
    const seed = createSeedStore();
    assert.ok(seed.loans.length > 0);
    assert.ok(seed.parties.some((p) => p.id === seed.currentUserId));
    assert.ok(seed.requests.some((r) => r.toPartyId === seed.currentUserId && r.status === "pending"));

    const store = storeWithLoan();
    const loan = store.loans.find((l) => l.id === "loan_test_1");
    assert.equal(loan?.status, "pending_approval");
    assert.equal(loan?.amount, 100000);
    assert.equal(loan?.counterpartyId, USER_B);
    assert.equal(loan?.lenderId, USER_B);
    assert.equal(loan?.borrowerId, USER_A);
    assert.ok(store.agreements.some((a) => a.loanId === "loan_test_1"));
  });

  it("17. accept is blocked until both signatures exist", () => {
    const store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_A });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const blocked = respondToLoanRequest(sent.store, {
      requestId: sent.request.id,
      actorPartyId: USER_B,
      action: "accepted",
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.error, /must sign/i);
  });

  it("18. only borrower can send; lender cannot send the request", () => {
    const store = storeWithLoan();
    const denied = sendLoanRequest(store, { loanId: "loan_test_1", actorPartyId: USER_B });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.match(denied.error, /Only the borrower/i);
  });
});
