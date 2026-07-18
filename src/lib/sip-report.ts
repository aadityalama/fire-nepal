import type { SipProjectionResult, SipWealthProjectionAnalysis } from "@/lib/sip-calculator";

const COLORS = {
  emerald: [4, 120, 87] as [number, number, number],
  emeraldDeep: [6, 78, 59] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [236, 253, 245] as [number, number, number],
  border: [209, 250, 229] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function generatedLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export async function downloadSipWealthReportPdf(
  analysis: SipWealthProjectionAnalysis,
  result: SipProjectionResult,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const money = (n: number) => {
    const code = analysis.currency === "NPR" ? "NPR" : analysis.currency;
    return `${code} ${Math.round(n).toLocaleString("en-IN")}`;
  };

  let y = 0;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = margin;
    }
  };
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  setFill(COLORS.emerald);
  doc.rect(0, 0, pageW, 34, "F");
  setFill(COLORS.emeraldDeep);
  doc.rect(0, 32, pageW, 2, "F");
  setColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FIRE Nepal", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("SIP Wealth Projection Report", margin, 23);
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedLabel()}`, margin, 29);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AI Wealth Projection", pageW - margin, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("www.firenepal.com", pageW - margin, 21, { align: "right" });
  y = 44;

  const section = (title: string) => {
    ensureSpace(14);
    setFill(COLORS.lightBg);
    doc.roundedRect(margin, y - 5, pageW - margin * 2, 9, 2, 2, "F");
    setColor(COLORS.emeraldDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 3, y + 1);
    y += 10;
  };

  const line = (label: string, value: string) => {
    ensureSpace(7);
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, margin, y);
    setColor(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 6;
  };

  const para = (text: string) => {
    ensureSpace(16);
    setColor(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.2 + 3;
  };

  section("Your SIP Plan");
  line("Monthly investment", money(analysis.plan.monthlyInvestment));
  line("Investment period", `${analysis.plan.years} years`);
  line("Expected annual return", `${analysis.plan.annualReturnPct}%`);
  line("Inflation", `${analysis.plan.inflationPct}%`);
  line("Total invested", money(analysis.plan.totalInvested));
  line("Future value", money(analysis.plan.futureValue));

  section("Wealth Projection Score");
  line("Score", `${analysis.score.value}/100 · ${analysis.score.labelEn}`);
  para(analysis.score.whyNe.replace(/[\u0900-\u097F]+/g, "").trim() || analysis.score.labelEn);
  para(`Strengths: ${analysis.score.strengthsNe.length}. Weaknesses: ${analysis.score.weaknessesNe.length}.`);

  section("Future Wealth Snapshot");
  line("Future value", money(result.futureValue));
  line("Total invested", money(result.totalInvested));
  line("Estimated profit", money(result.totalProfit));
  line("Growth multiple", `${result.growthMultiple.toFixed(2)}x`);
  line("Simple CAGR-like rate", `${result.cagrPct.toFixed(1)}%`);
  line("Inflation-adjusted value", money(result.inflationAdjustedValue));

  section("Goal Achievement");
  line("Status", `${analysis.goal.emoji} ${analysis.goal.labelEn}`);
  line("Probability", `${analysis.goal.probabilityPct}%`);
  line("FIRE completion", `${result.fireCompletion.toFixed(1)}%`);

  section("AI Verdict");
  line("Verdict", analysis.verdict.labelEn.replace(/[^\x20-\x7E]/g, "").trim() || analysis.goal.labelEn);
  line("Long-term wealth probability", `${analysis.verdict.probabilityPct}%`);

  section("English Recommendations");
  const recEn = [
    "Increase SIP when income rises.",
    "Stay invested through market cycles.",
    "Extend the horizon if possible.",
    "Diversify across asset classes.",
    "Avoid panic selling in downturns.",
  ];
  for (const r of recEn) {
    ensureSpace(6);
    setColor(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`• ${r}`, margin, y);
    y += 5.5;
  }

  section("Wealth Journey");
  for (const node of analysis.journey) {
    line(`Age ${node.age} · ${node.labelEn}`, money(node.value));
  }

  ensureSpace(16);
  setColor(COLORS.muted);
  doc.setFontSize(8);
  doc.text("Not financial advice. Assumptions are illustrative. Review annually.", margin, pageH - 10);

  doc.save("fire-nepal-sip-wealth-report.pdf");
}
