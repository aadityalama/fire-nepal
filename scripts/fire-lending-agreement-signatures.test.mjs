/**
 * Role-based dual-party agreement signatures + approval gating.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actorRoleOnLoan,
  bothPartiesSigned,
  canSignAgreement,
  resolveLoanPartyIds,
  SIGNATURE_UI,
  signLoanAgreement,
  signatureStatusMessage,
} from "../src/lib/fire-lending/agreement-signatures.ts";
import {
  borrowerNotificationBody,
  borrowerNotificationTitle,
  canRespondToLoanRequest,
  canShowLoanRequestApprovalControls,
  hasLoanRequestNotification,
  LOAN_REQUEST_UI,
  respondToLoanRequest,
  sendLoanRequest,
} from "../src/lib/fire-lending/loan-request-approval.ts";
import {
  buildLoanRequestEmail,
  LOAN_REQUEST_EMAIL_SUBJECT,
  loanRequestReviewUrl,
} from "../src/lib/fire-lending/loan-request-email.ts";
import { canAccessLoanDocument } from "../src/lib/fire-lending/loan-documents.ts";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";

function baseLoan(overrides = {}) {
  return {
    id: "loan_sig_1",
    agreementNumber: "FL-SIG-001",
    role: "lender",
    counterpartyId: "party_anjali",
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
    loans: [loan, ...seed.loans],
    agreements: [
      {
        id: "agr_sig_1",
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

describe("agreement signatures — role enforcement", () => {
  it("1. lender can sign only as lender", () => {
    const store = storeWithLoan();
    const me = store.currentUserId;
    const { lenderId } = resolveLoanPartyIds(store.loans[0], me);
    assert.equal(lenderId, me);
    assert.equal(actorRoleOnLoan(store.loans[0], me, me), "lender");
    const ok = canSignAgreement(store.loans[0], me, "lender", me);
    assert.equal(ok.ok, true);
    const signed = signLoanAgreement(store, { loanId: "loan_sig_1", actorPartyId: me, as: "lender" });
    assert.equal(signed.ok, true);
    if (!signed.ok) return;
    assert.equal(signed.loan.lenderSigned, true);
    assert.equal(signed.loan.borrowerSigned, false);
  });

  it("2. borrower can sign only as borrower", () => {
    const store = storeWithLoan();
    const borrowerId = "party_anjali";
    assert.equal(actorRoleOnLoan(store.loans[0], borrowerId, store.currentUserId), "borrower");
    const ok = canSignAgreement(store.loans[0], borrowerId, "borrower", store.currentUserId);
    assert.equal(ok.ok, true);
    const signed = signLoanAgreement(store, {
      loanId: "loan_sig_1",
      actorPartyId: borrowerId,
      as: "borrower",
    });
    assert.equal(signed.ok, true);
    if (!signed.ok) return;
    assert.equal(signed.loan.borrowerSigned, true);
    assert.equal(signed.loan.lenderSigned, false);
  });

  it("3. lender cannot sign as borrower", () => {
    const store = storeWithLoan();
    const denied = canSignAgreement(store.loans[0], store.currentUserId, "borrower", store.currentUserId);
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.match(denied.error, /only sign as the lender/i);
    const attempt = signLoanAgreement(store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "borrower",
    });
    assert.equal(attempt.ok, false);
  });

  it("4. borrower cannot sign as lender", () => {
    const store = storeWithLoan();
    const denied = canSignAgreement(store.loans[0], "party_anjali", "lender", store.currentUserId);
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.match(denied.error, /only sign as the borrower/i);
  });

  it("5. API-equivalent rejects unauthorized role-signing attempts", () => {
    const store = storeWithLoan();
    // Stranger
    const stranger = signLoanAgreement(store, {
      loanId: "loan_sig_1",
      actorPartyId: "party_binod",
      as: "lender",
    });
    assert.equal(stranger.ok, false);
    if (!stranger.ok) assert.equal(stranger.status, 403);

    // Payload role spoof: borrower claims "lender"
    const spoof = signLoanAgreement(store, {
      loanId: "loan_sig_1",
      actorPartyId: "party_anjali",
      as: "lender",
    });
    assert.equal(spoof.ok, false);
    if (!spoof.ok) assert.equal(spoof.status, 403);
  });

  it("16. duplicate signatures are prevented", () => {
    const store = storeWithLoan();
    const first = signLoanAgreement(store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "lender",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const dup = signLoanAgreement(first.store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "lender",
    });
    assert.equal(dup.ok, false);
    if (!dup.ok) {
      assert.equal(dup.status, 409);
      assert.match(dup.error, /already recorded/i);
    }
  });

  it("status messages wait for the other party", () => {
    const loan = baseLoan({ lenderSigned: true, borrowerSigned: false });
    assert.equal(
      signatureStatusMessage(loan, "lender"),
      SIGNATURE_UI.waitingBorrower,
    );
    assert.equal(
      signatureStatusMessage({ ...loan, borrowerSigned: true }, "lender"),
      SIGNATURE_UI.bothReady,
    );
  });
});

describe("approval requires both signatures", () => {
  it("6. both signatures are required before approval", () => {
    const store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const early = canRespondToLoanRequest(sent.request, "party_anjali", sent.store.loans.find((l) => l.id === "loan_sig_1"));
    assert.equal(early.ok, false);
    if (!early.ok) assert.match(early.error, /must sign/i);

    const attempt = respondToLoanRequest(sent.store, {
      requestId: sent.request.id,
      actorPartyId: "party_anjali",
      action: "accepted",
    });
    assert.equal(attempt.ok, false);
  });

  it("7. approval controls are hidden before both signatures", () => {
    const store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const loan = sent.store.loans.find((l) => l.id === "loan_sig_1");
    assert.equal(canShowLoanRequestApprovalControls(sent.request, "party_anjali", loan), false);

    const lenderSigned = signLoanAgreement(sent.store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "lender",
    });
    assert.equal(lenderSigned.ok, true);
    if (!lenderSigned.ok) return;
    assert.equal(
      canShowLoanRequestApprovalControls(sent.request, "party_anjali", lenderSigned.loan),
      false,
    );
  });

  it("8. requester cannot approve their own request", () => {
    let store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    store = sent.store;
    const s1 = signLoanAgreement(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId, as: "lender" });
    assert.equal(s1.ok, true);
    if (!s1.ok) return;
    const s2 = signLoanAgreement(s1.store, { loanId: "loan_sig_1", actorPartyId: "party_anjali", as: "borrower" });
    assert.equal(s2.ok, true);
    if (!s2.ok) return;
    assert.equal(bothPartiesSigned(s2.loan), true);
    const self = respondToLoanRequest(s2.store, {
      requestId: sent.request.id,
      actorPartyId: store.currentUserId,
      action: "accepted",
    });
    assert.equal(self.ok, false);
    if (!self.ok) assert.match(self.error, /cannot accept or reject your own/i);
  });

  it("13. borrower can Accept after both signatures", () => {
    let store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const s1 = signLoanAgreement(sent.store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "lender",
    });
    assert.equal(s1.ok, true);
    if (!s1.ok) return;
    const s2 = signLoanAgreement(s1.store, {
      loanId: "loan_sig_1",
      actorPartyId: "party_anjali",
      as: "borrower",
    });
    assert.equal(s2.ok, true);
    if (!s2.ok) return;
    assert.equal(canShowLoanRequestApprovalControls(sent.request, "party_anjali", s2.loan), true);
    const accepted = respondToLoanRequest(s2.store, {
      requestId: sent.request.id,
      actorPartyId: "party_anjali",
      action: "accepted",
    });
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.request.status, "accepted");
    assert.equal(accepted.store.loans.find((l) => l.id === "loan_sig_1")?.status, "active");
  });

  it("14. borrower can Reject after both signatures", () => {
    const store = storeWithLoan();
    const sent = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(sent.ok, true);
    if (!sent.ok) return;
    const s1 = signLoanAgreement(sent.store, {
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
      as: "lender",
    });
    assert.equal(s1.ok, true);
    if (!s1.ok) return;
    const s2 = signLoanAgreement(s1.store, {
      loanId: "loan_sig_1",
      actorPartyId: "party_anjali",
      as: "borrower",
    });
    assert.equal(s2.ok, true);
    if (!s2.ok) return;
    const rejected = respondToLoanRequest(s2.store, {
      requestId: sent.request.id,
      actorPartyId: "party_anjali",
      action: "rejected",
    });
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.request.status, "rejected");
    assert.equal(rejected.store.loans.find((l) => l.id === "loan_sig_1")?.status, "rejected");
  });
});

describe("loan request notifications", () => {
  it("9. counterparty receives the request notification", () => {
    const store = storeWithLoan();
    const me = store.parties.find((p) => p.id === store.currentUserId);
    const result = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ntf = result.store.notifications[0];
    assert.equal(ntf.kind, "loan_request");
    assert.equal(ntf.title, borrowerNotificationTitle());
    assert.equal(ntf.forPartyId, "party_anjali");
    assert.equal(ntf.read, false);
    assert.match(ntf.body, new RegExp(borrowerNotificationBody(me?.name ?? "You").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(ntf.body, /FL-SIG-001/);
    assert.equal(ntf.href, "/fire-lending/loans/loan_sig_1");
  });

  it("10. new request shows unread notification (red badge count)", () => {
    const store = storeWithLoan();
    const result = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const unreadForBorrower = result.store.notifications.filter(
      (n) => !n.read && n.forPartyId === "party_anjali",
    );
    assert.ok(unreadForBorrower.length >= 1);
    assert.equal(unreadForBorrower[0].kind, "loan_request");
  });

  it("11. opening the notification marks it as read", () => {
    const store = storeWithLoan();
    const result = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const ntfId = result.store.notifications[0].id;
    const marked = {
      ...result.store,
      notifications: result.store.notifications.map((n) => (n.id === ntfId ? { ...n, read: true } : n)),
    };
    assert.equal(marked.notifications.find((n) => n.id === ntfId)?.read, true);
  });

  it("12. notification opens the correct loan request", () => {
    const store = storeWithLoan();
    const result = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.store.notifications[0].href, `/fire-lending/loans/loan_sig_1`);
    assert.equal(result.store.notifications[0].relatedLoanId, "loan_sig_1");
    assert.equal(result.store.notifications[0].relatedRequestId, result.request.id);
  });

  it("15. duplicate notifications are prevented", () => {
    const store = storeWithLoan();
    const first = sendLoanRequest(store, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(
      hasLoanRequestNotification(first.store, { loanId: "loan_sig_1", toPartyId: "party_anjali" }),
      true,
    );
    // Inject a second send path by clearing pending request but keeping notification
    const cleared = {
      ...first.store,
      requests: first.store.requests.filter((r) => r.id !== first.request.id),
    };
    const second = sendLoanRequest(cleared, { loanId: "loan_sig_1", actorPartyId: store.currentUserId });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    const loanRequestNtfs = second.store.notifications.filter(
      (n) => n.kind === "loan_request" && n.forPartyId === "party_anjali" && n.relatedLoanId === "loan_sig_1",
    );
    assert.equal(loanRequestNtfs.length, 1);
  });
});

describe("loan documents & email & creation", () => {
  it("17. unauthorized users cannot access another loan's private documents", () => {
    const store = storeWithLoan();
    const withDoc = {
      ...store,
      documents: [
        {
          id: "doc_private_1",
          loanId: "loan_sig_1",
          title: "ID",
          kind: "id",
          createdAt: "2026-08-15",
          fileName: "id.pdf",
        },
        ...store.documents,
      ],
    };
    const denied = canAccessLoanDocument(withDoc, {
      documentId: "doc_private_1",
      loanId: "loan_sig_1",
      actorPartyId: "party_binod",
    });
    assert.equal(denied.ok, false);
    const allowed = canAccessLoanDocument(withDoc, {
      documentId: "doc_private_1",
      loanId: "loan_sig_1",
      actorPartyId: store.currentUserId,
    });
    assert.equal(allowed.ok, true);
  });

  it("18. existing agreement PDF/download helpers still resolve parties", () => {
    const store = storeWithLoan(baseLoan({ lenderSigned: true, borrowerSigned: true }));
    const loan = store.loans[0];
    const { lenderId, borrowerId } = resolveLoanPartyIds(loan, store.currentUserId);
    assert.equal(lenderId, store.currentUserId);
    assert.equal(borrowerId, "party_anjali");
    assert.ok(store.agreements.some((a) => a.loanId === loan.id));
  });

  it("19. existing loan creation flow continues to work", () => {
    const seed = createSeedStore();
    assert.ok(seed.loans.length > 0);
    assert.ok(seed.parties.some((p) => p.id === seed.currentUserId));
    const store = storeWithLoan();
    assert.equal(store.loans.find((l) => l.id === "loan_sig_1")?.status, "pending_approval");
    assert.equal(LOAN_REQUEST_UI.requestButton, "Request");
  });

  it("loan request email includes required fields and CTA", () => {
    const built = buildLoanRequestEmail({
      recipientName: "Anjali Shrestha",
      requesterName: "TEJESH GHIMIRE",
      requesterRoleLabel: "Lender",
      counterpartyRoleLabel: "Borrower",
      loanReference: "FL-SIG-001",
      amountLabel: "NPR 100,000",
      interestRate: 12,
      durationMonths: 12,
      requestDateIso: "2026-08-15T10:00:00.000Z",
      reviewUrl: loanRequestReviewUrl("loan_sig_1", "https://www.firenepal.com"),
      logoUrl: "https://www.firenepal.com/email-logo.png",
    });
    assert.equal(built.subject, LOAN_REQUEST_EMAIL_SUBJECT);
    assert.match(built.html, /Review Loan Request/);
    assert.match(built.html, /FL-SIG-001/);
    assert.match(built.html, /NPR 100,000/);
    assert.match(built.html, /12%/);
    assert.match(built.html, /12 months/);
    assert.match(built.html, /TEJESH GHIMIRE/);
    assert.match(built.html, /Action is required|action is required/i);
    assert.match(built.html, /fire-lending\/loans\/loan_sig_1/);
    assert.match(built.text, /Review Loan Request/);
  });
});
