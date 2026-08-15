/**
 * Distinct lender/borrower identity — self-loan prevention and role resolution.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actorRoleOnLoan,
  canSignAgreement,
  signLoanAgreement,
} from "../src/lib/fire-lending/agreement-signatures.ts";
import { createLoanInStore } from "../src/lib/fire-lending/loan-creation.ts";
import {
  assertDistinctPartyIds,
  buildLenderBorrowerIds,
  findSelfLoanRecords,
  isSelfLoan,
  normalizeLoanPartyIdentity,
  partyDisplayName,
  resolveActorRoleOnLoan,
  resolveLoanPartyIds,
  SELF_LOAN_ERROR,
} from "../src/lib/fire-lending/loan-party-identity.ts";
import {
  borrowerNotificationBody,
  canRespondToLoanRequest,
  respondToLoanRequest,
  sendLoanRequest,
} from "../src/lib/fire-lending/loan-request-approval.ts";
import {
  buildLoanRequestEmail,
  LOAN_REQUEST_EMAIL_SUBJECT,
} from "../src/lib/fire-lending/loan-request-email.ts";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";

const LENDER_A = "party_test_lender_a";
const BORROWER_B = "party_test_borrower_b";

function baseLoan(overrides = {}) {
  return {
    id: "loan_id_1",
    agreementNumber: "FL-ID-001",
    role: "lender",
    counterpartyId: BORROWER_B,
    lenderId: LENDER_A,
    borrowerId: BORROWER_B,
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
    currentUserId: LENDER_A,
    loans: [loan, ...seed.loans.filter((l) => l.id !== loan.id)],
    agreements: [
      {
        id: "agr_id_1",
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

describe("distinct lender/borrower identity", () => {
  it("seed uses two distinct test users A (lender) and B (borrower)", () => {
    const seed = createSeedStore();
    assert.equal(seed.currentUserId, LENDER_A);
    assert.ok(seed.parties.some((p) => p.id === LENDER_A && p.name === "Test Lender A"));
    assert.ok(seed.parties.some((p) => p.id === BORROWER_B && p.name === "Test Borrower B"));
    assert.notEqual(LENDER_A, BORROWER_B);
    for (const loan of seed.loans) {
      assert.ok(loan.lenderId);
      assert.ok(loan.borrowerId);
      assert.notEqual(loan.lenderId, loan.borrowerId, `self-loan in seed: ${loan.id}`);
    }
    assert.equal(findSelfLoanRecords(seed).length, 0);
  });

  it("distinct lender/borrower IDs are required", () => {
    const ok = assertDistinctPartyIds(LENDER_A, BORROWER_B);
    assert.equal(ok.ok, true);
    const bad = assertDistinctPartyIds(LENDER_A, LENDER_A);
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.error, /different members/i);
  });

  it("self-loan rejected at creation", () => {
    const store = createSeedStore();
    const result = createLoanInStore(store, {
      connectionMethod: "fire_id",
      counterpartyQuery: "",
      counterpartyId: LENDER_A,
      amount: "50000",
      currency: "NPR",
      interestRate: "10",
      loanType: "peer",
      durationMonths: "6",
      installmentCount: "6",
      gracePeriodDays: "0",
      lateFeePercent: "1",
      purpose: "Self loan attempt",
      notes: "",
      guarantor: "",
      collateral: "",
      role: "lender",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.match(result.error, /different members/i);
    }
  });

  it("create loan stores durable lenderId and borrowerId", () => {
    const store = createSeedStore();
    const result = createLoanInStore(store, {
      connectionMethod: "fire_id",
      counterpartyQuery: "FN-TEST-BORROWER-B",
      counterpartyId: BORROWER_B,
      amount: "75000",
      currency: "NPR",
      interestRate: "11",
      loanType: "peer",
      durationMonths: "8",
      installmentCount: "8",
      gracePeriodDays: "2",
      lateFeePercent: "1",
      purpose: "Inventory",
      notes: "",
      guarantor: "",
      collateral: "",
      role: "lender",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.loan.lenderId, LENDER_A);
    assert.equal(result.loan.borrowerId, BORROWER_B);
    assert.notEqual(result.loan.lenderId, result.loan.borrowerId);
  });

  it("lender role correctly resolved", () => {
    const loan = baseLoan();
    assert.equal(resolveActorRoleOnLoan(loan, LENDER_A), "lender");
    assert.equal(actorRoleOnLoan(loan, LENDER_A), "lender");
  });

  it("borrower role correctly resolved", () => {
    const loan = baseLoan();
    assert.equal(resolveActorRoleOnLoan(loan, BORROWER_B), "borrower");
    assert.equal(actorRoleOnLoan(loan, BORROWER_B), "borrower");
  });

  it("third party unauthorized", () => {
    const loan = baseLoan();
    assert.equal(resolveActorRoleOnLoan(loan, "party_binod"), "unauthorized");
    assert.equal(actorRoleOnLoan(loan, "party_binod"), null);
    const denied = canSignAgreement(loan, "party_binod", "lender", LENDER_A);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
  });

  it("lender cannot sign borrower role", () => {
    const store = storeWithLoan();
    const denied = signLoanAgreement(store, {
      loanId: "loan_id_1",
      actorPartyId: LENDER_A,
      as: "borrower",
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.match(denied.error, /only sign as the lender/i);
  });

  it("borrower cannot sign lender role", () => {
    const store = storeWithLoan();
    const denied = signLoanAgreement(store, {
      loanId: "loan_id_1",
      actorPartyId: BORROWER_B,
      as: "lender",
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.match(denied.error, /only sign as the borrower/i);
  });

  it("self-loan signatures are rejected entirely", () => {
    const loan = baseLoan({ lenderId: LENDER_A, borrowerId: LENDER_A, identityInvalid: true });
    assert.equal(isSelfLoan(loan), true);
    assert.equal(resolveActorRoleOnLoan(loan, LENDER_A), "unauthorized");
    const denied = canSignAgreement(loan, LENDER_A, "lender", LENDER_A);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.error, SELF_LOAN_ERROR);
  });

  it("lender receives notification addressed with borrower name", () => {
    const store = storeWithLoan(
      baseLoan({
        role: "borrower",
        counterpartyId: LENDER_A,
        lenderId: LENDER_A,
        borrowerId: BORROWER_B,
      }),
    );
    const result = sendLoanRequest(
      { ...store, currentUserId: BORROWER_B },
      { loanId: "loan_id_1", actorPartyId: BORROWER_B },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.request.fromPartyId, BORROWER_B);
    assert.equal(result.request.toPartyId, LENDER_A);
    const ntf = result.store.notifications[0];
    assert.equal(ntf.forPartyId, LENDER_A);
    assert.match(ntf.body, /Test Borrower B has sent you a loan request/);
    assert.doesNotMatch(ntf.body, /^You has sent you/i);
    assert.equal(
      borrowerNotificationBody("Test Borrower B"),
      "Test Borrower B has sent you a loan request. Please review the loan details and respond.",
    );
  });

  it("lender receives correct personalized email copy from borrower", () => {
    const built = buildLoanRequestEmail({
      recipientName: "Test Lender A",
      requesterName: "Test Borrower B",
      requesterRoleLabel: "Borrower",
      counterpartyRoleLabel: "Lender",
      loanReference: "FL-ID-001",
      amountLabel: "NPR 100,000",
      interestRate: 12,
      durationMonths: 12,
      requestDateIso: "2026-08-15T10:00:00.000Z",
      reviewUrl: "https://www.firenepal.com/fire-lending/loans/loan_id_1",
      logoUrl: "https://www.firenepal.com/email-logo.png",
    });
    assert.equal(built.subject, LOAN_REQUEST_EMAIL_SUBJECT);
    assert.match(built.html, /Hello <strong[^>]*>Test Lender A<\/strong>/);
    assert.match(built.html, /Test Borrower B<\/strong> has sent you a loan request/);
    assert.doesNotMatch(built.html, /You has sent you/);
    assert.doesNotMatch(built.text, /^You has sent you/im);
  });

  it("borrower requester cannot approve own request; lender can after both signatures", () => {
    const store = storeWithLoan(
      baseLoan({
        role: "borrower",
        counterpartyId: LENDER_A,
        lenderId: LENDER_A,
        borrowerId: BORROWER_B,
      }),
    );
    const sent = sendLoanRequest(
      { ...store, currentUserId: BORROWER_B },
      { loanId: "loan_id_1", actorPartyId: BORROWER_B },
    );
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const s1 = signLoanAgreement(sent.store, { loanId: "loan_id_1", actorPartyId: BORROWER_B, as: "borrower" });
    assert.equal(s1.ok, true);
    if (!s1.ok) return;
    const s2 = signLoanAgreement(s1.store, { loanId: "loan_id_1", actorPartyId: LENDER_A, as: "lender" });
    assert.equal(s2.ok, true);
    if (!s2.ok) return;
    const self = respondToLoanRequest(s2.store, {
      requestId: sent.request.id,
      actorPartyId: BORROWER_B,
      action: "accepted",
    });
    assert.equal(self.ok, false);
    if (!self.ok) assert.match(self.error, /cannot accept or reject your own/i);

    const lenderAccept = respondToLoanRequest(s2.store, {
      requestId: sent.request.id,
      actorPartyId: LENDER_A,
      action: "accepted",
    });
    assert.equal(lenderAccept.ok, true);
  });

  it("accept/reject rejected when lenderId === borrowerId", () => {
    const loan = baseLoan({ lenderId: LENDER_A, borrowerId: LENDER_A, identityInvalid: true });
    const store = storeWithLoan(loan);
    const fakeRequest = {
      id: "req_self",
      loanId: loan.id,
      fromPartyId: BORROWER_B,
      toPartyId: LENDER_A,
      amount: 1,
      currency: "NPR",
      interestRate: 1,
      durationMonths: 1,
      purpose: "x",
      status: "pending",
      createdAt: "2026-08-15",
    };
    const denied = canRespondToLoanRequest(fakeRequest, LENDER_A, loan, LENDER_A);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.error, SELF_LOAN_ERROR);
  });

  it("forged client role is rejected — actor identity wins", () => {
    const store = storeWithLoan();
    // Lender cannot sign as borrower even if client sends as: borrower
    const forged = signLoanAgreement(store, {
      loanId: "loan_id_1",
      actorPartyId: LENDER_A,
      as: "borrower",
    });
    assert.equal(forged.ok, false);
    if (!forged.ok) {
      assert.equal(forged.status, 403);
      assert.match(forged.error, /only sign as the lender/i);
    }
    assert.equal(resolveActorRoleOnLoan(baseLoan(), LENDER_A), "lender");
    assert.notEqual(resolveActorRoleOnLoan(baseLoan(), LENDER_A), "borrower");
  });

  it("User A borrower creates loan with User B lender — durable ids enforced", () => {
    const store = createSeedStore();
    const result = createLoanInStore(
      { ...store, currentUserId: BORROWER_B },
      {
        connectionMethod: "fire_id",
        counterpartyQuery: "FN-TEST-LENDER-A",
        counterpartyId: LENDER_A,
        amount: "50000",
        currency: "NPR",
        interestRate: "10",
        loanType: "peer",
        durationMonths: "6",
        installmentCount: "6",
        gracePeriodDays: "0",
        lateFeePercent: "1",
        purpose: "Request from lender",
        notes: "",
        guarantor: "",
        collateral: "",
        role: "borrower",
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.loan.borrowerId, BORROWER_B);
    assert.equal(result.loan.lenderId, LENDER_A);
    assert.notEqual(result.loan.lenderId, result.loan.borrowerId);
  });

  it("partyDisplayName never uses You as third-person requester", () => {
    assert.equal(partyDisplayName({ name: "You" }, "a FIRE Nepal member"), "a FIRE Nepal member");
    assert.equal(partyDisplayName({ name: "Test Lender A" }, "a FIRE Nepal member"), "Test Lender A");
  });

  it("legacy loans without lenderId/borrowerId are backfilled and flagged if collapsed", () => {
    // Collapsed counterparty === current user must NOT invent a dual-party loan.
    const legacy = baseLoan({ lenderId: "", borrowerId: "", counterpartyId: LENDER_A, role: "lender" });
    const normalized = normalizeLoanPartyIdentity(legacy, LENDER_A);
    assert.equal(normalized.identityInvalid, true);
    assert.equal(resolveActorRoleOnLoan(normalized, LENDER_A), "unauthorized");
    // Safe distinct backfill still works when counterparty differs.
    const recoverable = baseLoan({
      lenderId: "",
      borrowerId: "",
      counterpartyId: BORROWER_B,
      role: "lender",
    });
    const recovered = normalizeLoanPartyIdentity(recoverable, LENDER_A);
    assert.equal(recovered.lenderId, LENDER_A);
    assert.equal(recovered.borrowerId, BORROWER_B);
    assert.equal(recovered.identityInvalid, undefined);
  });

  it("buildLenderBorrowerIds rejects equal creator and counterparty", () => {
    const bad = buildLenderBorrowerIds({
      creatorPartyId: LENDER_A,
      counterpartyId: LENDER_A,
      creatorRole: "lender",
    });
    assert.equal(bad.ok, false);
    const good = buildLenderBorrowerIds({
      creatorPartyId: LENDER_A,
      counterpartyId: BORROWER_B,
      creatorRole: "lender",
    });
    assert.equal(good.ok, true);
    if (good.ok) {
      assert.equal(good.lenderId, LENDER_A);
      assert.equal(good.borrowerId, BORROWER_B);
    }
  });

  it("resolveLoanPartyIds prefers stored durable ids over role/currentUser", () => {
    const loan = baseLoan({ role: "borrower" }); // role flipped but durable ids win
    const ids = resolveLoanPartyIds(loan, LENDER_A);
    assert.equal(ids.lenderId, LENDER_A);
    assert.equal(ids.borrowerId, BORROWER_B);
  });
});
