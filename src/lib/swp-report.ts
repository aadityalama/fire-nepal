import type { SwpDashboardModel } from "@/lib/swp-dashboard";

const COLORS = {
  emerald: [4, 120, 87] as [number, number, number],
  emeraldDeep: [6, 78, 59] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [236, 253, 245] as [number, number, number],
  border: [209, 250, 229] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/** PDF core fonts can't render the रु glyph, so the report uses the ASCII "NPR" code. */
export function formatReportMoney(value: number): string {
  const abs = Math.abs(Math.round(value));
  return `NPR ${abs.toLocaleString("en-IN")}`;
}

function riskLabel(level: SwpDashboardModel["analysis"]["risk"]["level"]): string {
  return level === "low" ? "Low Risk" : level === "medium" ? "Medium Risk" : "High Risk";
}

/** English recommendations derived from the model enums (PDF fonts can't render Nepali). */
export function buildReportRecommendations(model: SwpDashboardModel): string[] {
  const out: string[] = [];
  const { goal, analysis, inputs } = model;
  if (goal.status === "off-track" || analysis.withdrawal.safety === "risky") {
    out.push("Reduce your monthly withdrawal to extend how long the portfolio lasts.");
    out.push("Increase your initial investment or delay retirement to strengthen the plan.");
  } else if (analysis.withdrawal.safety === "moderate") {
    out.push("Stay flexible with spending during weak market years.");
  }
  if (goal.status === "on-track" && analysis.score.band === "excellent") {
    out.push("Your plan is very healthy — you have room to increase withdrawals or savings.");
  }
  if (inputs.annualReturnPct <= inputs.annualInflationPct) {
    out.push("Target investments returning above inflation to protect real wealth.");
  }
  out.push("Diversify across equities, bonds, gold and cash to reduce risk.");
  return out;
}

function generatedLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

type JsPdfDoc = import("jspdf").jsPDF;

async function buildDoc(model: SwpDashboardModel): Promise<JsPdfDoc> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const fmt = (n: number) => formatReportMoney(n);

  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = margin;
    }
  };

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  // ---- Header band ----
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
  doc.text("Retirement Analysis Report", margin, 23);
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedLabel()}`, margin, 29);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SWP Dashboard v2", pageW - margin, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("www.firenepal.com", pageW - margin, 21, { align: "right" });
  y = 44;

  const sectionTitle = (title: string) => {
    ensureSpace(14);
    setColor(COLORS.emeraldDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin, y);
    y += 2.5;
    setDraw(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
  };

  // ---- KPI cards ----
  const kpis: { label: string; value: string; accent: [number, number, number] }[] = [
    {
      label: "GOAL STATUS",
      value: model.goal.labelEn,
      accent:
        model.goal.status === "on-track"
          ? COLORS.emerald
          : model.goal.status === "attention"
            ? COLORS.amber
            : COLORS.red,
    },
    { label: "SUSTAINABILITY", value: `${model.analysis.score.value}/100`, accent: COLORS.emerald },
    {
      label: "WITHDRAWAL RATE",
      value: `${model.analysis.withdrawal.ratePct.toFixed(2)}%`,
      accent: COLORS.emeraldDeep,
    },
    { label: "REMAINING", value: fmt(model.legacy.value), accent: COLORS.emerald },
  ];
  const gap = 4;
  const kw = (contentW - gap * 3) / 4;
  const kh = 22;
  ensureSpace(kh + 4);
  kpis.forEach((k, i) => {
    const x = margin + i * (kw + gap);
    setFill(COLORS.lightBg);
    setDraw(COLORS.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, kw, kh, 2.5, 2.5, "FD");
    setColor(COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(k.label, x + 3, y + 6);
    setColor(k.accent);
    doc.setFontSize(k.value.length > 12 ? 9 : 12);
    doc.text(k.value, x + 3, y + 15);
  });
  y += kh + 10;

  // ---- Your Plan ----
  sectionTitle("Your Plan");
  const planRows: [string, string][] = [
    ["Initial Investment", fmt(model.inputs.initial)],
    ["Monthly Withdrawal", fmt(model.inputs.monthly)],
    ["Expected Annual Return", `${model.inputs.annualReturnPct}%`],
    ["Inflation", `${model.inputs.annualInflationPct}%`],
    ["Investment Horizon", `${model.inputs.horizonYears} years`],
  ];
  doc.setFontSize(10);
  planRows.forEach(([label, value], i) => {
    ensureSpace(8);
    if (i % 2 === 0) {
      setFill([248, 250, 249]);
      doc.rect(margin, y - 4.5, contentW, 7, "F");
    }
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + 2, y);
    setColor(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + contentW - 2, y, { align: "right" });
    y += 7;
  });
  y += 6;

  // ---- Retirement Goal Status ----
  sectionTitle("Retirement Goal Status");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(
    model.goal.status === "on-track"
      ? COLORS.emerald
      : model.goal.status === "attention"
        ? COLORS.amber
        : COLORS.red,
  );
  doc.text(`${model.goal.labelEn}  ·  ${model.goal.progressPct}% of horizon funded`, margin, y);
  y += 6;
  setColor(COLORS.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const survivalLine =
    model.result.depletionMonth === null
      ? `Your portfolio is projected to last the full ${model.inputs.horizonYears}-year horizon (Score ${model.analysis.score.value}/100, ${riskLabel(model.analysis.risk.level)}).`
      : `Your portfolio is projected to last about ${model.result.survivalYearsDisplay} (Score ${model.analysis.score.value}/100, ${riskLabel(model.analysis.risk.level)}).`;
  doc.splitTextToSize(survivalLine, contentW).forEach((ln: string) => {
    ensureSpace(6);
    doc.text(ln, margin, y);
    y += 5.5;
  });
  y += 6;

  // ---- Scenario Comparison ----
  sectionTitle("Scenario Comparison (Best / Expected / Worst)");
  const colLabel = 46;
  const scenCol = (contentW - colLabel) / 3;
  const headerY = y;
  setFill(COLORS.emerald);
  doc.rect(margin, headerY - 4.5, contentW, 7, "F");
  setColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Metric", margin + 2, headerY);
  model.scenarios.forEach((s, i) => {
    const x = margin + colLabel + i * scenCol + scenCol / 2;
    doc.text(s.labelEn, x, headerY, { align: "center" });
  });
  y += 7;
  const scenRows: [string, (s: SwpDashboardModel["scenarios"][number]) => string][] = [
    ["Annual Return", (s) => `${s.annualReturnPct}%`],
    ["Ending Balance", (s) => fmt(s.endingBalance)],
    ["Survival", (s) => (s.survivesFullHorizon ? `${model.inputs.horizonYears}y+` : s.survivalYearsDisplay)],
    ["Sustainability", (s) => `${s.sustainabilityScore}/100`],
  ];
  doc.setFontSize(9);
  scenRows.forEach(([label, render], ri) => {
    ensureSpace(7);
    if (ri % 2 === 0) {
      setFill([248, 250, 249]);
      doc.rect(margin, y - 4.5, contentW, 7, "F");
    }
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + 2, y);
    model.scenarios.forEach((s, i) => {
      const x = margin + colLabel + i * scenCol + scenCol / 2;
      setColor(i === 1 ? COLORS.emeraldDeep : COLORS.ink);
      doc.setFont("helvetica", i === 1 ? "bold" : "normal");
      doc.text(render(s), x, y, { align: "center" });
    });
    y += 7;
  });
  y += 6;

  // ---- Legacy Wealth ----
  sectionTitle("Legacy Wealth");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(COLORS.emerald);
  doc.text(fmt(model.legacy.value), margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(COLORS.ink);
  const legacyLine = model.legacy.hasLegacy
    ? `That is about ${model.legacy.multipleOfInitial.toFixed(1)}x your initial investment and could provide roughly ${fmt(model.legacy.annualLegacyIncome)} per year (4% rule) for your family or future generations.`
    : "Under the current plan no wealth remains at the end of the horizon. Reducing withdrawals or increasing investment can preserve a legacy.";
  doc.splitTextToSize(legacyLine, contentW).forEach((ln: string) => {
    ensureSpace(6);
    doc.text(ln, margin, y);
    y += 5.5;
  });
  y += 6;

  // ---- Recommendations ----
  sectionTitle("FIRE Nepal Recommendations");
  doc.setFontSize(10);
  buildReportRecommendations(model).forEach((rec) => {
    setColor(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.splitTextToSize(`•  ${rec}`, contentW - 2).forEach((ln: string, li: number) => {
      ensureSpace(6);
      doc.text(ln, margin + (li === 0 ? 0 : 4), y);
      y += 5.5;
    });
    y += 1;
  });

  // ---- Footer on every page ----
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setDraw(COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Educational model only — not financial, tax or investment advice. Powered by FIRE Nepal.",
      margin,
      pageH - 9,
    );
    doc.text(`Page ${p} / ${pageCount}`, pageW - margin, pageH - 9, { align: "right" });
  }

  return doc;
}

const REPORT_NAME = () => `fire-nepal-retirement-report-${new Date().toISOString().slice(0, 10)}.pdf`;

export async function downloadSwpReportPdf(model: SwpDashboardModel): Promise<void> {
  const doc = await buildDoc(model);
  doc.save(REPORT_NAME());
}

export async function printSwpReportPdf(model: SwpDashboardModel): Promise<void> {
  const doc = await buildDoc(model);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl as unknown as string, "_blank");
  if (!win) {
    // Popup blocked — fall back to a direct download so the user still gets the report.
    doc.save(REPORT_NAME());
  }
}

export type SwpShareResult = "shared" | "downloaded" | "unsupported";

export async function shareSwpReportPdf(model: SwpDashboardModel): Promise<SwpShareResult> {
  const doc = await buildDoc(model);
  const blob = doc.output("blob") as Blob;
  const fileName = REPORT_NAME();
  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  const shareText = `My FIRE Nepal retirement plan — Goal: ${model.goal.labelEn}, Sustainability ${model.analysis.score.value}/100, Remaining ${formatReportMoney(model.legacy.value)}.`;

  try {
    if (nav && typeof File !== "undefined") {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const canShareFiles =
        typeof nav.canShare === "function" && nav.canShare({ files: [file] });
      if (canShareFiles && typeof nav.share === "function") {
        await nav.share({ files: [file], title: "FIRE Nepal Retirement Report", text: shareText });
        return "shared";
      }
      if (typeof nav.share === "function") {
        await nav.share({ title: "FIRE Nepal Retirement Report", text: shareText, url: "https://www.firenepal.com/swp-calculator" });
        return "shared";
      }
    }
  } catch (err) {
    // User cancelled or share failed — fall back to download below.
    if (err instanceof DOMException && err.name === "AbortError") return "unsupported";
  }

  doc.save(fileName);
  return "downloaded";
}
