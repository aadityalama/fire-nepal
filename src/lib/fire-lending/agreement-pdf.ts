import { formatLendingMoney, formatCompactDate } from "@/lib/fire-lending/format";
import {
  agreementPdfFileName,
  buildAgreementPdfContentLines,
  downloadBlobAsFile,
} from "@/lib/fire-lending/loan-documents";
import type { EmiInstallment, FireLendingAgreement, FireLendingLoan, FireLendingParty } from "@/lib/fire-lending/types";

export type AgreementPdfInput = {
  loan: FireLendingLoan;
  agreement: FireLendingAgreement;
  lender: FireLendingParty;
  borrower: FireLendingParty;
  installments: EmiInstallment[];
};

/** Build the textual payload that must appear in the agreement PDF (for tests + generation). */
export function buildAgreementPdfPayload(input: AgreementPdfInput) {
  const emiLines = input.installments.slice(0, 24).map(
    (row) =>
      `#${row.sequence} ${row.dueDate} ${formatLendingMoney(row.amount, input.loan.currency)} (${row.status})`,
  );
  const lines = buildAgreementPdfContentLines({
    loanId: input.loan.id,
    agreementNumber: input.agreement.agreementNumber,
    lenderName: input.lender.name,
    lenderFireId: input.lender.fireNepalId,
    borrowerName: input.borrower.name,
    borrowerFireId: input.borrower.fireNepalId,
    amountLabel: formatLendingMoney(input.loan.amount, input.loan.currency),
    interestRate: input.loan.interestRate,
    durationMonths: input.loan.durationMonths,
    installmentCount: input.loan.installmentCount,
    purpose: input.loan.purpose,
    generatedAt: formatCompactDate(input.agreement.generatedAt),
    status: input.agreement.status.toUpperCase(),
    lenderSigned: input.loan.lenderSigned,
    borrowerSigned: input.loan.borrowerSigned,
    lenderSignedAt: input.agreement.lenderSignedAt
      ? formatCompactDate(input.agreement.lenderSignedAt)
      : undefined,
    borrowerSignedAt: input.agreement.borrowerSignedAt
      ? formatCompactDate(input.agreement.borrowerSignedAt)
      : undefined,
    emiLines,
  });
  return { lines, fileName: agreementPdfFileName(input.loan.id) };
}

/** Generate a real PDF blob from loan data (non-empty, includes agreement fields). */
export async function generateAgreementPdfBlob(input: AgreementPdfInput): Promise<{ blob: Blob; fileName: string }> {
  const { jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  const { lines, fileName } = buildAgreementPdfPayload(input);

  const line = (text: string, gap = 5, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(text, maxW);
    for (const ln of wrapped) {
      if (y > 275) {
        doc.addPage();
        y = margin;
      }
      doc.text(String(ln), margin, y);
      y += gap;
    }
  };

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("FIRE Nepal", margin, 12);
  doc.setFontSize(11);
  doc.text("Peer Loan Digital Agreement", margin, 20);
  doc.setFontSize(9);
  doc.text(`Agreement ${input.agreement.agreementNumber}`, margin, 26);
  doc.setTextColor(30, 30, 30);
  y = 40;

  try {
    const qrDataUrl = await QRCode.toDataURL(input.agreement.qrPayload, { margin: 1, width: 120 });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 28, 6, 24, 24);
  } catch {
    /* QR optional */
  }

  line("Verification QR encodes this agreement for authenticity checks.", 5, 9);
  y += 2;

  for (const contentLine of lines) {
    const isHeading =
      contentLine.startsWith("Lender:") ||
      contentLine.startsWith("Borrower:") ||
      contentLine.startsWith("Principal:") ||
      contentLine.startsWith("EMI:") ||
      contentLine.startsWith("Lender signature:") ||
      contentLine.startsWith("Borrower signature:");
    line(contentLine, isHeading ? 5 : 5, contentLine.startsWith("FIRE Nepal") ? 12 : 10);
  }

  y += 3;
  line("Terms & Conditions", 6, 12);
  line(input.agreement.terms, 5, 9);
  line(
    "Both parties agree that FIRE Nepal facilitates digital documentation only and is not a licensed bank. Escrow, insurance, and marketplace features may apply in future Elite releases.",
    5,
    9,
  );
  y += 6;
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageW / 2, y, pageW / 2 + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("Lender signature", margin, y);
  doc.text("Borrower signature", pageW / 2, y);

  if (input.loan.guarantor) line(`Guarantor: ${input.loan.guarantor}`, 5);
  if (input.loan.collateral) line(`Collateral: ${input.loan.collateral}`, 5);

  const arrayBuffer = doc.output("arraybuffer");
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  if (blob.size < 64) {
    throw new Error("Agreement PDF generation produced an empty file.");
  }
  return { blob, fileName };
}

export async function downloadAgreementPdf(input: AgreementPdfInput): Promise<void> {
  const { blob, fileName } = await generateAgreementPdfBlob(input);
  downloadBlobAsFile(blob, fileName);
}
