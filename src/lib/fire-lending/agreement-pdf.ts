import { formatLendingMoney, formatCompactDate } from "@/lib/fire-lending/format";
import type { EmiInstallment, FireLendingAgreement, FireLendingLoan, FireLendingParty } from "@/lib/fire-lending/types";

export type AgreementPdfInput = {
  loan: FireLendingLoan;
  agreement: FireLendingAgreement;
  lender: FireLendingParty;
  borrower: FireLendingParty;
  installments: EmiInstallment[];
};

export async function downloadAgreementPdf(input: AgreementPdfInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  const line = (text: string, gap = 5, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    for (const ln of lines) {
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
  line(`Generated: ${formatCompactDate(input.agreement.generatedAt)}`, 5, 10);
  line(`Status: ${input.agreement.status.toUpperCase()}`, 5, 10);
  y += 3;

  line("Lender", 6, 12);
  line(`${input.lender.name} · FIRE ID ${input.lender.fireNepalId}`, 5);
  line(`Mobile: ${input.lender.mobile} · Trust Score: ${input.lender.trustScore}`, 5);
  y += 2;

  line("Borrower", 6, 12);
  line(`${input.borrower.name} · FIRE ID ${input.borrower.fireNepalId}`, 5);
  line(`Mobile: ${input.borrower.mobile} · Trust Score: ${input.borrower.trustScore}`, 5);
  y += 3;

  line("Loan Details", 6, 12);
  line(`Amount: ${formatLendingMoney(input.loan.amount, input.loan.currency)}`, 5);
  line(`Interest: ${input.loan.interestRate}% p.a. · Type: ${input.loan.loanType}`, 5);
  line(`Duration: ${input.loan.durationMonths} months · Installments: ${input.loan.installmentCount}`, 5);
  line(`Grace: ${input.loan.gracePeriodDays} days · Late fee: ${input.loan.lateFeePercent}%`, 5);
  line(`Purpose: ${input.loan.purpose}`, 5);
  if (input.loan.guarantor) line(`Guarantor: ${input.loan.guarantor}`, 5);
  if (input.loan.collateral) line(`Collateral: ${input.loan.collateral}`, 5);
  y += 3;

  line("EMI Schedule", 6, 12);
  for (const row of input.installments.slice(0, 24)) {
    line(
      `#${row.sequence}  ${row.dueDate}  ${formatLendingMoney(row.amount, input.loan.currency)}  (${row.status})`,
      4.5,
      9,
    );
  }
  y += 4;

  line("Terms & Conditions", 6, 12);
  line(input.agreement.terms, 5, 9);
  line(
    "Both parties agree that FIRE Nepal facilitates digital documentation only and is not a licensed bank. Escrow, insurance, and marketplace features may apply in future Elite releases.",
    5,
    9,
  );
  y += 6;

  line("Digital Signatures", 6, 12);
  line(
    `Lender: ${input.loan.lenderSigned ? `Signed ${input.agreement.lenderSignedAt ?? ""}` : "Pending"}`,
    5,
  );
  line(
    `Borrower: ${input.loan.borrowerSigned ? `Signed ${input.agreement.borrowerSignedAt ?? ""}` : "Pending"}`,
    5,
  );
  y += 8;
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageW / 2, y, pageW / 2 + 60, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("Lender signature", margin, y);
  doc.text("Borrower signature", pageW / 2, y);

  doc.save(`${input.agreement.agreementNumber}.pdf`);
}
