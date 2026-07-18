import type { EmergencyFundResult, EmergencyFundSafetyAnalysis } from "@/lib/emergency-fund";

const COLORS = {
  emerald: [4, 120, 87] as [number, number, number],
  emeraldDeep: [6, 78, 59] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [236, 253, 245] as [number, number, number],
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

function money(n: number): string {
  return `NPR ${Math.round(n).toLocaleString("en-IN")}`;
}

export async function downloadEmergencyFundSafetyReportPdf(
  analysis: EmergencyFundSafetyAnalysis,
  result: EmergencyFundResult,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

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
  doc.text("Emergency Fund Safety Report", margin, 23);
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedLabel()}`, margin, 29);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AI Safety Analysis", pageW - margin, 15, { align: "right" });
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

  section("Your Emergency Fund");
  line("Current fund", money(result.currentFund));
  line("Monthly expenses", money(result.monthlyExpense));
  line("Months covered", `${result.runwayMonths.toFixed(1)} mo`);
  line("Target fund", money(result.recommendedFund));
  line("Recommended months", `${result.recommendedMonths} mo`);
  line("Gap", money(result.gap));

  section("Emergency Safety Score");
  line("Score", `${analysis.score.value}/100 · ${analysis.score.labelEn}`);
  line("Readiness", `${Math.round(result.readiness)}%`);

  section("Coverage & Stress");
  line("Baseline runway", `${result.runwayMonths.toFixed(1)} mo`);
  line("Stress runway (+25% spend)", `${result.stressRunway.toFixed(1)} mo`);
  line("Months to target", result.monthsToTarget > 0 ? `${result.monthsToTarget}` : "On track");

  section("Shock Simulations");
  for (const s of analysis.shocks) {
    line(s.labelEn, `${s.monthsLasting.toFixed(1)} mo`);
  }

  section("AI Verdict");
  line("Verdict", analysis.verdict.labelEn.replace(/[^\x20-\x7E]/g, "").trim() || analysis.score.labelEn);
  line("Safety probability", `${analysis.verdict.probabilityPct}%`);

  section("English Recommendations");
  const recEn = [
    "Increase emergency savings until you hit your target months.",
    "Keep emergency money in liquid accounts only.",
    "Do not invest the emergency fund in volatile assets.",
    "Review the fund at least once a year for inflation.",
    "Use a separate emergency account from daily spending.",
  ];
  for (const r of recEn) {
    ensureSpace(6);
    setColor(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`• ${r}`, margin, y);
    y += 5.5;
  }

  ensureSpace(16);
  setColor(COLORS.muted);
  doc.setFontSize(8);
  doc.text("Not financial advice. Assumptions are illustrative. Review annually.", margin, pageH - 10);

  doc.save("fire-nepal-emergency-fund-safety-report.pdf");
}
