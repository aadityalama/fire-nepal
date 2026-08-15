/**
 * FIRE Lending agreement PDF helpers — filename, synthesis, party resolution, and PDF content.
 * Fixture mirrors the production loan shown in UI: FN-LN-2026-681232 / FN-2026-000016 TEJESH GHALAN.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findLoanInStore,
  mergePartiesIntoStore,
  resolveAgreementParties,
} from "../src/lib/fire-lending/agreement-parties.ts";
import {
  agreementPdfFilename,
  buildAgreementPdfBlob,
  resolveInstallmentsForAgreement,
  synthesizeAgreementForLoan,
} from "../src/lib/fire-lending/agreement-pdf.ts";

const AGREEMENT_NUMBER = "FN-LN-2026-681232";
const LOAN_ID = "loan_tejesh_fn_ln_681232";

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
  id: LOAN_ID,
  agreementNumber: AGREEMENT_NUMBER,
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
  endDate: "2027-01-15",
  outstanding: 112500,
  totalPaid: 37500,
  interestEarned: 4500,
  connectionMethod: "fire_id",
  borrowerSigned: true,
  lenderSigned: true,
  riskScore: 25,
};

describe("agreement PDF helpers", () => {
  it("builds a meaningful filename from the agreement / loan id", () => {
    assert.equal(
      agreementPdfFilename(AGREEMENT_NUMBER),
      "FIRE-Nepal-Loan-Agreement-FN-LN-2026-681232.pdf",
    );
    assert.equal(agreementPdfFilename("loan/../x"), "FIRE-Nepal-Loan-Agreement-loan-x.pdf");
  });

  it("finds the loan by agreement number FN-LN-2026-681232", () => {
    const store = {
      loans: [loan],
      agreements: [
        {
          id: "agr_1",
          loanId: LOAN_ID,
          agreementNumber: AGREEMENT_NUMBER,
          status: "active",
          generatedAt: "2026-01-15",
          terms: "terms",
          qrPayload: `fire-nepal://verify/agreement/${AGREEMENT_NUMBER}`,
        },
      ],
    };
    assert.equal(findLoanInStore(store, AGREEMENT_NUMBER)?.id, LOAN_ID);
    assert.equal(findLoanInStore(store, LOAN_ID)?.agreementNumber, AGREEMENT_NUMBER);
    assert.equal(findLoanInStore(store, "missing"), undefined);
  });

  it("resolves parties without a pre-seeded lending profile (no demo reset)", () => {
    // Authenticated empty-shell store: loan + counterparty exist, current user party missing.
    const store = {
      currentUserId: "party_me",
      parties: [borrower],
    };
    const resolved = resolveAgreementParties(store, loan);
    assert.equal(resolved.borrower.fireNepalId, "FN-2026-000016");
    assert.equal(resolved.borrower.name, "TEJESH GHALAN");
    assert.equal(resolved.lender.id, "party_me");
    assert.ok(resolved.partiesToPersist.some((p) => p.id === "party_me"));

    const merged = mergePartiesIntoStore(
      {
        currentUserId: "party_me",
        parties: [borrower],
        loans: [loan],
        payments: [],
        installments: [],
        requests: [],
        agreements: [],
        notifications: [],
        documents: [],
      },
      resolved.partiesToPersist,
    );
    // Existing member/loan data preserved — nothing deleted.
    assert.equal(merged.parties.find((p) => p.id === borrower.id)?.name, "TEJESH GHALAN");
    assert.equal(merged.loans[0].agreementNumber, AGREEMENT_NUMBER);
    assert.ok(merged.parties.find((p) => p.id === "party_me"));
  });

  it("synthesizes agreement metadata from the loan record", () => {
    const agr = synthesizeAgreementForLoan(loan);
    assert.equal(agr.loanId, loan.id);
    assert.equal(agr.agreementNumber, AGREEMENT_NUMBER);
    assert.equal(agr.status, "active");
    assert.match(agr.qrPayload, /FN-LN-2026-681232/);
  });

  it("rebuilds EMI schedule when none is stored", () => {
    const rows = resolveInstallmentsForAgreement(loan, []);
    assert.equal(rows.length, 12);
    assert.equal(rows[0].loanId, loan.id);
    assert.ok(rows[0].amount > 0);
  });

  it("generates a non-empty PDF for FN-LN-2026-681232 with real loan fields", async () => {
    const agreement = synthesizeAgreementForLoan(loan);
    const { blob, filename } = await buildAgreementPdfBlob({
      loan,
      agreement,
      lender,
      borrower,
      installments: [],
    });
    assert.equal(filename, "FIRE-Nepal-Loan-Agreement-FN-LN-2026-681232.pdf");
    assert.ok(blob.size > 500);
    assert.equal(blob.type, "application/pdf");

    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
    // PDF trailer / EOF markers — file should open on mobile and desktop readers.
    const text = bytes.toString("latin1");
    assert.match(text, /%%EOF/);
    assert.match(text, /FN-2026-000016/);
    assert.match(text, /TEJESH GHALAN/);
    assert.match(text, /FN-LN-2026-681232/);
    assert.match(text, /150/); // principal formatting contains 150
    assert.match(text, /Outstanding|outstanding|112/i);
  });

  it("still generates a PDF when only the counterparty party is present", async () => {
    const store = { currentUserId: "party_me", parties: [borrower] };
    const { lender: resolvedLender, borrower: resolvedBorrower } = resolveAgreementParties(store, loan);
    const { blob, filename } = await buildAgreementPdfBlob({
      loan,
      agreement: synthesizeAgreementForLoan(loan),
      lender: resolvedLender,
      borrower: resolvedBorrower,
      installments: [],
    });
    assert.equal(filename, "FIRE-Nepal-Loan-Agreement-FN-LN-2026-681232.pdf");
    assert.ok(blob.size > 500);
    const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    assert.match(text, /FN-2026-000016/);
    assert.match(text, /TEJESH GHALAN/);
    assert.match(text, /FN-LN-2026-681232/);
  });
});
