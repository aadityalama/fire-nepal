import { buildInstallmentSchedule } from "@/lib/fire-lending/emi";
import { formatCompactDate, formatLendingMoney, todayIso, uid } from "@/lib/fire-lending/format";
import type {
  EmiInstallment,
  FireLendingAgreement,
  FireLendingLoan,
  FireLendingParty,
} from "@/lib/fire-lending/types";

export type AgreementPdfInput = {
  loan: FireLendingLoan;
  agreement: FireLendingAgreement;
  lender: FireLendingParty;
  borrower: FireLendingParty;
  installments: EmiInstallment[];
};

export function agreementPdfFilename(loanIdOrAgreementNumber: string): string {
  const safe = String(loanIdOrAgreementNumber || "loan")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `FIRE-Nepal-Loan-Agreement-${safe || "loan"}.pdf`;
}

/** Build a downloadable agreement snapshot from loan data when none is stored. */
export function synthesizeAgreementForLoan(loan: FireLendingLoan): FireLendingAgreement {
  return {
    id: uid("agr"),
    loanId: loan.id,
    agreementNumber: loan.agreementNumber || `FN-LN-${loan.id}`,
    status:
      loan.lenderSigned && loan.borrowerSigned
        ? "active"
        : loan.lenderSigned || loan.borrowerSigned
          ? "awaiting_signatures"
          : "draft",
    generatedAt: loan.createdAt || todayIso(),
    borrowerSignedAt: loan.borrowerSigned ? loan.startDate || loan.createdAt : undefined,
    lenderSignedAt: loan.lenderSigned ? loan.startDate || loan.createdAt : undefined,
    terms:
      "FIRE Nepal Peer Lending Terms — digital agreement generated from the loan record. Both parties must sign to activate. Late fees accrue after the grace period.",
    qrPayload: `fire-nepal://verify/agreement/${loan.agreementNumber || loan.id}`,
  };
}

export function resolveInstallmentsForAgreement(
  loan: FireLendingLoan,
  installments: EmiInstallment[],
): EmiInstallment[] {
  const sorted = [...installments]
    .filter((row) => row.loanId === loan.id)
    .sort((a, b) => a.sequence - b.sequence);
  if (sorted.length > 0) return sorted;
  return buildInstallmentSchedule({
    loanId: loan.id,
    principal: loan.amount,
    annualRatePct: loan.interestRate,
    months: Math.max(1, loan.installmentCount || loan.durationMonths || 1),
    startDate: loan.startDate || loan.createdAt,
  });
}

function partyLine(party: FireLendingParty): string {
  const parts = [
    party.name?.trim() || "Unknown member",
    party.fireNepalId?.trim() ? `FIRE Nepal ID ${party.fireNepalId.trim()}` : null,
    party.verified || party.identityVerified ? "Verified" : "Unverified",
    `Trust Score ${party.trustScore}/100`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function partyContactLine(party: FireLendingParty): string | null {
  const mobile = party.mobile?.trim();
  if (!mobile) return null;
  return `Contact on file: ${mobile}`;
}

function loanDueDate(loan: FireLendingLoan, installments: EmiInstallment[]): string {
  if (loan.endDate) return loan.endDate;
  if (installments.length > 0) return installments[installments.length - 1]!.dueDate;
  return "—";
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("Agreement download is only available in the browser.");
  }
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Revoke after the browser has a chance to start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

/** Build the PDF bytes from the loan snapshot (no browser download side-effects). */
export async function buildAgreementPdfBlob(input: AgreementPdfInput): Promise<{ blob: Blob; filename: string }> {
  if (!input.loan?.id) throw new Error("Loan data is missing.");
  if (!input.lender?.fireNepalId && !input.lender?.name) {
    throw new Error("Lender details are missing for this agreement.");
  }
  if (!input.borrower?.fireNepalId && !input.borrower?.name) {
    throw new Error("Borrower details are missing for this agreement.");
  }

  const installments = resolveInstallmentsForAgreement(input.loan, input.installments);
  const agreement = input.agreement ?? synthesizeAgreementForLoan(input.loan);
  // Prefer the public agreement/loan number (e.g. FN-LN-2026-681232) for the download name.
  const filename = agreementPdfFilename(agreement.agreementNumber || input.loan.agreementNumber || input.loan.id);

  let jsPDF: typeof import("jspdf").jsPDF;
  try {
    ({ jsPDF } = await import("jspdf"));
  } catch {
    throw new Error("PDF engine failed to load. Please try again.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  const ensureSpace = (need = 8) => {
    if (y + need > 285) {
      doc.addPage();
      y = margin;
    }
  };

  const line = (text: string, gap = 5, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const ln of lines) {
      ensureSpace(gap + 2);
      doc.text(String(ln), margin, y);
      y += gap;
    }
  };

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("FIRE Nepal", margin, 12);
  doc.setFontSize(11);
  doc.text("Peer Loan Digital Agreement", margin, 20);
  doc.setFontSize(9);
  doc.text(`Agreement ${agreement.agreementNumber}`, margin, 26);
  doc.setTextColor(30, 30, 30);
  y = 40;

  try {
    const QRCode = await import("qrcode");
    const qrDataUrl = await QRCode.toDataURL(agreement.qrPayload || `fire-nepal://loan/${input.loan.id}`, {
      margin: 1,
      width: 120,
    });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 28, 6, 24, 24);
  } catch {
    /* QR is optional — agreement content still downloads */
  }

  line("This document was generated from the live FIRE Nepal lending record for the selected loan.", 5, 9);
  y += 1;
  line(`Loan ID: ${input.loan.id}`, 5, 10);
  line(`Agreement / Loan number: ${agreement.agreementNumber}`, 5, 10);
  line(`Generated: ${formatCompactDate(agreement.generatedAt || todayIso())}`, 5, 10);
  line(`Agreement status: ${String(agreement.status || "draft").replace(/_/g, " ").toUpperCase()}`, 5, 10);
  line(`Loan status: ${String(input.loan.status).replace(/_/g, " ").toUpperCase()}`, 5, 10);
  y += 3;

  line("Lender", 6, 12);
  line(partyLine(input.lender), 5);
  {
    const contact = partyContactLine(input.lender);
    if (contact) line(contact, 5, 9);
  }
  y += 2;

  line("Borrower", 6, 12);
  line(partyLine(input.borrower), 5);
  {
    const contact = partyContactLine(input.borrower);
    if (contact) line(contact, 5, 9);
  }
  y += 3;

  line("Loan Details", 6, 12);
  line(`Principal amount: ${formatLendingMoney(input.loan.amount, input.loan.currency)}`, 5);
  line(`Outstanding amount: ${formatLendingMoney(input.loan.outstanding, input.loan.currency)}`, 5);
  line(`Total paid: ${formatLendingMoney(input.loan.totalPaid, input.loan.currency)}`, 5);
  line(`Interest rate: ${input.loan.interestRate}% p.a. · Loan type: ${input.loan.loanType}`, 5);
  line(
    `Repayment terms: ${input.loan.durationMonths} months · ${input.loan.installmentCount} installments · Grace ${input.loan.gracePeriodDays} days · Late fee ${input.loan.lateFeePercent}%`,
    5,
  );
  line(`Loan start date: ${input.loan.startDate ? formatCompactDate(input.loan.startDate) : formatCompactDate(input.loan.createdAt)}`, 5);
  line(`Final due date: ${formatCompactDate(loanDueDate(input.loan, installments))}`, 5);
  line(`Created: ${formatCompactDate(input.loan.createdAt)}`, 5);
  line(`Purpose: ${input.loan.purpose || "—"}`, 5);
  if (input.loan.guarantor) line(`Guarantor: ${input.loan.guarantor}`, 5);
  if (input.loan.collateral) line(`Collateral: ${input.loan.collateral}`, 5);
  if (input.loan.notes) line(`Notes: ${input.loan.notes}`, 5);
  y += 3;

  line("Repayment / EMI Schedule", 6, 12);
  if (installments.length === 0) {
    line("No installment schedule available for this loan.", 5, 9);
  } else {
    for (const row of installments) {
      line(
        `#${row.sequence}  Due ${formatCompactDate(row.dueDate)}  ${formatLendingMoney(row.amount, input.loan.currency)}  · Principal ${formatLendingMoney(row.principal, input.loan.currency)} · Interest ${formatLendingMoney(row.interest, input.loan.currency)}  (${row.status})`,
        4.5,
        9,
      );
    }
  }
  y += 4;

  line("Terms & Conditions", 6, 12);
  line(agreement.terms || "Standard FIRE Nepal Peer Lending Terms apply.", 5, 9);
  line(
    "FIRE Nepal facilitates digital peer-lending documentation only and is not a licensed bank. Both parties remain responsible for repayment, verification, and compliance with applicable law.",
    5,
    9,
  );
  y += 6;

  line("Digital Signatures / Status", 6, 12);
  line(
    `Lender: ${input.loan.lenderSigned ? `Signed${agreement.lenderSignedAt ? ` on ${formatCompactDate(agreement.lenderSignedAt)}` : ""}` : "Pending signature"}`,
    5,
  );
  line(
    `Borrower: ${input.loan.borrowerSigned ? `Signed${agreement.borrowerSignedAt ? ` on ${formatCompactDate(agreement.borrowerSignedAt)}` : ""}` : "Pending signature"}`,
    5,
  );
  y += 8;
  ensureSpace(16);
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageW / 2, y, pageW / 2 + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("Lender signature", margin, y);
  doc.text("Borrower signature", pageW / 2, y);

  let blob: Blob;
  try {
    blob = doc.output("blob");
  } catch {
    throw new Error("Could not generate the agreement PDF file.");
  }
  if (!blob || blob.size < 32) {
    throw new Error("Generated agreement PDF was empty.");
  }

  return { blob, filename };
}

/**
 * Generate a PDF loan agreement from the provided loan snapshot and trigger a browser download.
 * Uses real loan/party fields only — no hardcoded borrower or principal values.
 */
export async function downloadAgreementPdf(input: AgreementPdfInput): Promise<{ filename: string }> {
  const { blob, filename } = await buildAgreementPdfBlob(input);
  triggerBlobDownload(blob, filename);
  return { filename };
}
