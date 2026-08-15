/**
 * FIRE Lending agreement PDF helpers — filename, synthesis, and PDF content.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agreementPdfFilename,
  buildAgreementPdfBlob,
  resolveInstallmentsForAgreement,
  synthesizeAgreementForLoan,
} from "../src/lib/fire-lending/agreement-pdf.ts";

const lender = {
  id: "party_me",
  fireNepalId: "FN-88421",
  name: "You",
  mobile: "9800000001",
  trustScore: 88,
  verified: true,
  rolePreference: "both",
  onTimePayments: 18,
  latePayments: 1,
  loansCompleted: 4,
  identityVerified: true,
};

const borrower = {
  id: "party_tejesh",
  fireNepalId: "FN-2026-000016",
  name: "TEJESH GHALAN",
  mobile: "",
  trustScore: 63,
  verified: true,
  rolePreference: "borrower",
  onTimePayments: 0,
  latePayments: 0,
  loansCompleted: 0,
  identityVerified: true,
};

const loan = {
  id: "loan_tejesh_demo",
  agreementNumber: "FN-LN-2026-123456",
  role: "lender",
  counterpartyId: borrower.id,
  amount: 150000,
  currency: "NPR",
  interestRate: 12,
  loanType: "peer",
  durationMonths: 12,
  installmentCount: 12,
  gracePeriodDays: 5,
  lateFeePercent: 2,
  purpose: "Peer lending",
  status: "active",
  createdAt: "2026-01-15",
  startDate: "2026-01-15",
  outstanding: 112500,
  totalPaid: 37500,
  interestEarned: 4500,
  connectionMethod: "fire_id",
  borrowerSigned: true,
  lenderSigned: true,
  riskScore: 25,
};

describe("agreement PDF helpers", () => {
  it("builds a meaningful filename from the loan id", () => {
    assert.equal(agreementPdfFilename("loan_tejesh_demo"), "FIRE-Nepal-Loan-Agreement-loan_tejesh_demo.pdf");
    assert.equal(agreementPdfFilename("loan/../x"), "FIRE-Nepal-Loan-Agreement-loan-x.pdf");
  });

  it("synthesizes agreement metadata from the loan record", () => {
    const agr = synthesizeAgreementForLoan(loan);
    assert.equal(agr.loanId, loan.id);
    assert.equal(agr.agreementNumber, loan.agreementNumber);
    assert.equal(agr.status, "active");
    assert.match(agr.qrPayload, /FN-LN-2026-123456/);
  });

  it("rebuilds EMI schedule when none is stored", () => {
    const rows = resolveInstallmentsForAgreement(loan, []);
    assert.equal(rows.length, 12);
    assert.equal(rows[0].loanId, loan.id);
    assert.ok(rows[0].amount > 0);
  });

  it("generates a non-empty PDF containing the selected loan's real fields", async () => {
    const agreement = synthesizeAgreementForLoan(loan);
    const { blob, filename } = await buildAgreementPdfBlob({
      loan,
      agreement,
      lender,
      borrower,
      installments: [],
    });
    assert.equal(filename, "FIRE-Nepal-Loan-Agreement-loan_tejesh_demo.pdf");
    assert.ok(blob.size > 500);

    const bytes = Buffer.from(await blob.arrayBuffer());
    // PDF header
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
    const text = bytes.toString("latin1");
    assert.match(text, /FN-2026-000016/);
    assert.match(text, /TEJESH GHALAN/);
    assert.match(text, /loan_tejesh_demo/);
    assert.match(text, /FN-LN-2026-123456/);
    assert.match(text, /150/); // principal formatting contains 150
  });
});
