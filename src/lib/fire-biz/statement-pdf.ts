import { formatBizNpr } from "@/lib/fire-biz/i18n";
import type { CustomerStatement } from "@/lib/fire-biz/customer-statement";
import type { BusinessProfileRow } from "@/lib/fire-biz/types";

export async function downloadCustomerStatementPdf(
  statement: CustomerStatement,
  profile: BusinessProfileRow | null,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  const line = (text: string, gap = 5, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    for (const ln of lines) {
      if (y > 285) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, margin, y);
      y += gap;
    }
  };

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("FIRE Nepal — Customer Statement", margin, 12);
  doc.setFontSize(9);
  doc.text(profile?.business_name ?? "Business", margin, 19);
  doc.setTextColor(30, 30, 30);
  y = 32;

  line(`Customer: ${statement.customer.name}`, 5, 12);
  if (statement.customer.phone) line(`Phone: ${statement.customer.phone}`, 5);
  line(`Generated: ${new Date().toISOString().slice(0, 10)}`, 5);
  y += 4;

  line("Date        Type        Reference              Debit      Credit     Balance", 5, 8);
  y += 2;

  for (const entry of statement.entries) {
    line(
      `${entry.date}  ${entry.type.padEnd(10)}  ${entry.reference.slice(0, 22).padEnd(22)}  ${formatBizNpr(entry.debit).padStart(8)}  ${formatBizNpr(entry.credit).padStart(8)}  ${formatBizNpr(entry.balance).padStart(8)}`,
      4,
      8,
    );
  }

  y += 6;
  line(`Total Debit: ${formatBizNpr(statement.totalDebit)}`, 5);
  line(`Total Credit: ${formatBizNpr(statement.totalCredit)}`, 5);
  line(`Outstanding: ${formatBizNpr(statement.outstanding)}`, 6, 12);

  doc.save(`fire-biz-statement-${statement.customer.name.replace(/\s+/g, "-").slice(0, 20)}.pdf`);
}
