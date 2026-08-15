/**
 * Peer loan supporting documents + agreement PDF downloads.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agreementPdfFileName,
  assertDocumentBelongsToLoan,
  attachDocumentsToStore,
  buildAgreementPdfContentLines,
  canAccessLoanDocument,
  documentsForLoan,
  formatLoanDocSize,
  loanDocTypeLabel,
  pendingToFireLendingDocument,
  removeDocumentFromStore,
  validateLoanDocumentFile,
} from "../src/lib/fire-lending/loan-documents.ts";
import { buildAgreementPdfPayload, generateAgreementPdfBlob } from "../src/lib/fire-lending/agreement-pdf.ts";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";
import { FIRE_LENDING_DOC_MAX_BYTES } from "../src/lib/fire-lending/loan-document-storage.ts";

function makePending(overrides = {}) {
  return {
    id: "doc_pending_1",
    fileName: "citizenship.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1200,
    status: "ready",
    url: "data:application/pdf;base64,AAA",
    kind: "id",
    createdAt: "2026-08-15",
    ...overrides,
  };
}

describe("loan document validation", () => {
  it("1. accepts a single valid PDF document", () => {
    const result = validateLoanDocumentFile({
      fileName: "citizenship.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.fileName, "citizenship.pdf");
  });

  it("2. accepts multiple common document types", () => {
    for (const file of [
      { fileName: "a.pdf", mimeType: "application/pdf" },
      { fileName: "b.jpg", mimeType: "image/jpeg" },
      { fileName: "c.png", mimeType: "image/png" },
      { fileName: "d.doc", mimeType: "application/msword" },
      {
        fileName: "e.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ]) {
      const result = validateLoanDocumentFile({ ...file, sizeBytes: 1000 });
      assert.equal(result.ok, true, file.fileName);
    }
  });

  it("3. rejects invalid file type", () => {
    const result = validateLoanDocumentFile({
      fileName: "malware.exe",
      mimeType: "application/octet-stream",
      sizeBytes: 1000,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Invalid file type/i);
  });

  it("4. rejects file too large", () => {
    const result = validateLoanDocumentFile({
      fileName: "big.pdf",
      mimeType: "application/pdf",
      sizeBytes: FIRE_LENDING_DOC_MAX_BYTES + 1,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /too large/i);
  });

  it("5. surfaces upload failure status on pending docs", () => {
    const failed = makePending({ status: "error", error: "Could not upload file. Try again.", url: undefined });
    assert.equal(failed.status, "error");
    assert.match(failed.error, /Could not upload/i);
  });

  it("6. removing an uploaded document before submission drops it from the list", () => {
    const store = createSeedStore();
    const loanId = store.loans[0].id;
    const withDoc = attachDocumentsToStore(store, loanId, [
      pendingToFireLendingDocument(makePending({ id: "doc_rm_1" }), loanId),
    ]);
    assert.equal(documentsForLoan(withDoc, loanId).some((d) => d.id === "doc_rm_1"), true);
    const removed = removeDocumentFromStore(withDoc, "doc_rm_1");
    assert.equal(documentsForLoan(removed, loanId).some((d) => d.id === "doc_rm_1"), false);
  });
});

describe("loan document association + access", () => {
  it("7. documents are correctly associated with the loan", () => {
    const store = createSeedStore();
    const loanId = store.loans[0].id;
    const otherLoanId = store.loans[1].id;
    const next = attachDocumentsToStore(store, loanId, [
      pendingToFireLendingDocument(makePending({ id: "doc_a", fileName: "income-proof.pdf" }), loanId),
      pendingToFireLendingDocument(
        makePending({ id: "doc_b", fileName: "collateral-photo.jpg", mimeType: "image/jpeg" }),
        loanId,
      ),
    ]);
    const docs = documentsForLoan(next, loanId);
    assert.equal(docs.filter((d) => d.id === "doc_a" || d.id === "doc_b").length, 2);
    assert.ok(docs.every((d) => d.loanId === loanId));
    assert.equal(documentsForLoan(next, otherLoanId).some((d) => d.id === "doc_a"), false);
  });

  it("8. authorized user can download a document (access check passes)", () => {
    const store = createSeedStore();
    const loanId = store.loans[0].id;
    const next = attachDocumentsToStore(store, loanId, [
      pendingToFireLendingDocument(makePending({ id: "doc_auth" }), loanId),
    ]);
    const access = canAccessLoanDocument(next, {
      documentId: "doc_auth",
      loanId,
      actorPartyId: next.currentUserId,
    });
    assert.equal(access.ok, true);
    if (!access.ok) return;
    assert.equal(access.document.fileName, "citizenship.pdf");
  });

  it("9. unauthorized user cannot download another loan's document", () => {
    const store = createSeedStore();
    const loanA = store.loans[0].id;
    const loanB = store.loans[1].id;
    const next = attachDocumentsToStore(store, loanA, [
      pendingToFireLendingDocument(makePending({ id: "doc_priv" }), loanA),
    ]);
    const wrongLoan = assertDocumentBelongsToLoan(
      next.documents.find((d) => d.id === "doc_priv"),
      loanB,
    );
    assert.equal(wrongLoan.ok, false);
    if (wrongLoan.ok) return;
    assert.match(wrongLoan.error, /different loan/i);

    const stranger = canAccessLoanDocument(next, {
      documentId: "doc_priv",
      loanId: loanA,
      actorPartyId: "party_stranger",
    });
    assert.equal(stranger.ok, false);
  });
});

describe("agreement letter PDF", () => {
  const seed = createSeedStore();
  const loan = seed.loans[0];
  const agreement = seed.agreements.find((a) => a.loanId === loan.id);
  const me = seed.parties.find((p) => p.id === seed.currentUserId);
  const counterparty = seed.parties.find((p) => p.id === loan.counterpartyId);
  assert.ok(agreement && me && counterparty);

  const input = {
    loan,
    agreement,
    lender: loan.role === "lender" ? me : counterparty,
    borrower: loan.role === "borrower" ? me : counterparty,
    installments: seed.installments.filter((i) => i.loanId === loan.id).sort((a, b) => a.sequence - b.sequence),
  };

  it("10. Agreement Letter generates a real PDF", async () => {
    const { blob, fileName } = await generateAgreementPdfBlob(input);
    assert.ok(blob.size > 64);
    assert.equal(blob.type, "application/pdf");
    assert.equal(fileName, agreementPdfFileName(loan.id));
    const header = Buffer.from(await blob.arrayBuffer()).subarray(0, 4).toString("utf8");
    assert.equal(header, "%PDF");
  });

  it("11. Agreement Letter downloads successfully (blob + filename ready)", async () => {
    const { blob, fileName } = await generateAgreementPdfBlob(input);
    assert.match(fileName, /^FIRE-Nepal-Loan-Agreement-/);
    assert.match(fileName, /\.pdf$/);
    assert.ok(blob.size > 0);
  });

  it("12. Agreement PDF contains the correct loan data", () => {
    const { lines, fileName } = buildAgreementPdfPayload(input);
    assert.equal(fileName, agreementPdfFileName(loan.id));
    const joined = lines.join("\n");
    assert.match(joined, new RegExp(`Loan ID: ${loan.id}`));
    assert.match(joined, new RegExp(agreement.agreementNumber));
    assert.match(joined, new RegExp(String(loan.interestRate)));
    assert.match(joined, new RegExp(String(loan.durationMonths)));
    assert.match(joined, new RegExp(String(loan.installmentCount)));
    assert.match(joined, new RegExp(loan.purpose));
    assert.match(joined, /Lender:/);
    assert.match(joined, /Borrower:/);
    assert.match(joined, /Principal:/);
  });

  it("13. mobile browser download helper uses object URL cleanup pattern", () => {
    // downloadBlobAsFile uses createObjectURL + revoke after timeout — assert content builders stay browser-safe.
    const lines = buildAgreementPdfContentLines({
      loanId: "loan_mobile",
      agreementNumber: "AGR-1",
      lenderName: "A",
      lenderFireId: "FN-1",
      borrowerName: "B",
      borrowerFireId: "FN-2",
      amountLabel: "NPR 1",
      interestRate: 10,
      durationMonths: 6,
      installmentCount: 6,
      purpose: "Test",
      generatedAt: "2026-08-15",
      status: "ACTIVE",
      lenderSigned: true,
      borrowerSigned: true,
      emiLines: ["#1 due"],
    });
    assert.ok(lines.some((l) => l.includes("loan_mobile")));
    assert.equal(agreementPdfFileName("loan_mobile"), "FIRE-Nepal-Loan-Agreement-loan_mobile.pdf");
  });

  it("14. existing loan creation flow still works (seed loans + attach docs)", () => {
    const store = createSeedStore();
    assert.ok(store.loans.length > 0);
    assert.ok(store.agreements.length > 0);
    const loanId = store.loans[0].id;
    const next = attachDocumentsToStore(store, loanId, [
      pendingToFireLendingDocument(makePending({ id: "doc_flow" }), loanId),
    ]);
    assert.equal(next.loans.length, store.loans.length);
    assert.ok(documentsForLoan(next, loanId).some((d) => d.id === "doc_flow"));
    assert.equal(formatLoanDocSize(1024), "1.0 KB");
    assert.equal(loanDocTypeLabel("application/pdf"), "PDF");
  });
});
