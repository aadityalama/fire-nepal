/**
 * Gold & Silver portfolio PDF generation (jsPDF — searchable text, A4 portrait).
 * Client-side only; no permanent storage; no external PDF services.
 */

import {
  formatReportNpr,
  formatReportPct,
  metalsReportFilename,
  type MetalsReportSnapshot,
  type MetalsReportTxnLine,
} from "@/lib/metals-portfolio-report";

const COLORS = {
  emerald: [4, 120, 87] as [number, number, number],
  emeraldDeep: [6, 78, 59] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightBg: [236, 253, 245] as [number, number, number],
  border: [209, 250, 229] as [number, number, number],
  gold: [180, 134, 25] as [number, number, number],
  goldSoft: [254, 243, 199] as [number, number, number],
  silver: [100, 116, 139] as [number, number, number],
  silverSoft: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  danger: [185, 28, 28] as [number, number, number],
};

const DISCLAIMER =
  "This report is generated from user-provided investment records and available market prices. Market valuations may fluctuate. Historical and annualized returns do not guarantee future performance. This report is for personal financial planning and informational purposes.";

const LOGO_SRC = "/logo.png";

type JsPdfDoc = import("jspdf").jsPDF;

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_SRC);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function plColor(n: number | null): [number, number, number] {
  if (n == null || !Number.isFinite(n)) return COLORS.muted;
  if (n > 0) return COLORS.emerald;
  if (n < 0) return COLORS.danger;
  return COLORS.ink;
}

async function buildMetalsReportDoc(snapshot: MetalsReportSnapshot): Promise<JsPdfDoc> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const footerReserve = 22;
  const logoDataUrl = await loadLogoDataUrl();

  let y = 0;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - footerReserve) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string, accent: [number, number, number] = COLORS.emeraldDeep) => {
    ensureSpace(14);
    setFill(COLORS.lightBg);
    doc.roundedRect(margin, y - 4, contentW, 9, 1.5, 1.5, "F");
    setFill(accent);
    doc.rect(margin, y - 4, 1.6, 9, "F");
    setColor(accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 5, y + 2);
    y += 10;
  };

  const kv = (label: string, value: string, valueColor: [number, number, number] = COLORS.ink) => {
    ensureSpace(7);
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, margin, y);
    setColor(valueColor);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 5.8;
  };

  const para = (text: string, size = 8.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    setColor(COLORS.ink);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.2;
    }
  };

  // ---- Cover header ----
  setFill(COLORS.emerald);
  doc.rect(0, 0, pageW, 42, "F");
  setFill(COLORS.emeraldDeep);
  doc.rect(0, 40, pageW, 2.5, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, 7, 14, 14);
    } catch {
      // Logo optional — text brand remains.
    }
  }

  const brandX = logoDataUrl ? margin + 18 : margin;
  setColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FIRE Nepal", brandX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Financial Independence Retire Early", brandX, 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Gold & Silver Investment Report", brandX, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Personal Wealth Statement", brandX, 33);
  doc.setFontSize(8);
  doc.text("www.firenepal.com", pageW - margin, 13, { align: "right" });
  doc.text(snapshot.reportTypeLabel, pageW - margin, 19, { align: "right" });
  doc.text(`Ref ${snapshot.referenceNumber}`, pageW - margin, 25, { align: "right" });
  y = 50;

  // Member / meta
  setFill(COLORS.lightBg);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "F");
  y += 6;
  kv("Member name", snapshot.memberFullName);
  if (snapshot.memberId) kv("FIRE Nepal Member ID", snapshot.memberId);
  kv("Report generated", `${snapshot.generatedDateLabel} · ${snapshot.generatedTimeLabel}`);
  kv("Currency", snapshot.currency);
  kv("Portfolio valuation", snapshot.valuationDateLabel);
  kv("Report period", snapshot.reportPeriodLabel);
  y += 4;

  const { summary, market, allocation, sections } = snapshot;

  if (sections.summary) {
    sectionTitle("Executive Portfolio Summary");
    kv("Total investment / cost basis", formatReportNpr(summary.totalInvestmentNpr));
    kv("Current portfolio value", formatReportNpr(summary.currentValueNpr), COLORS.gold);
    kv("Total profit / loss", formatReportNpr(summary.profitLossNpr, true), plColor(summary.profitLossNpr));
    kv("Total ROI", formatReportPct(summary.roiPct), plColor(summary.roiPct));
    kv("Overall CAGR", summary.cagrLabel, COLORS.gold);
    if (summary.cagrIsAnnualizedShortPeriod && summary.cagrFraction != null) {
      para(
        "Note: Holding period is under one year. CAGR shown is an annualized rate, not accumulated actual return or a future forecast.",
        8,
      );
      y += 1;
    }
    kv("Gold holdings", `${summary.goldGrams.toFixed(2)} g · ${summary.goldTola.toFixed(4)} tola`);
    kv("Silver holdings", `${summary.silverGrams.toFixed(2)} g · ${summary.silverTola.toFixed(4)} tola`);
    kv("Number of holdings", String(summary.holdingsCount));
    kv(
      "Net worth share",
      summary.netWorthSharePct != null ? formatReportPct(summary.netWorthSharePct, 2, false) : "—",
    );
    kv("Unrealized profit", formatReportNpr(summary.unrealizedProfitNpr, true), plColor(summary.unrealizedProfitNpr));
    kv("Realized profit", formatReportNpr(summary.realizedProfitNpr, true), plColor(summary.realizedProfitNpr));
    kv("Total fees / making charges", formatReportNpr(summary.totalFeesNpr));
    kv("Held for", `${summary.holdingDurationLabel}${summary.holdingDays != null ? ` (${summary.holdingDays} days)` : ""}`);
    y += 3;

    sectionTitle("Nepal Market Price (Hamro Patro)");
    if (market.priceUnavailable) {
      para("Price Unavailable — verified Nepal domestic market prices are not available for this snapshot.");
      y += 1;
    }
    if (market.staleDisclosed) {
      para("Disclosure: Market prices in this report are stale (last successful synchronization). Do not treat as a live quote.");
      y += 1;
    }
    kv("Status", market.statusLabel);
    kv(
      "Gold Hallmark / g",
      market.goldPerGramNpr != null ? formatReportNpr(market.goldPerGramNpr) : "Price Unavailable",
      COLORS.gold,
    );
    kv(
      "Gold Hallmark / tola",
      market.goldPerTolaNpr != null ? formatReportNpr(market.goldPerTolaNpr) : "Price Unavailable",
      COLORS.gold,
    );
    kv(
      "Silver / g",
      market.silverPerGramNpr != null ? formatReportNpr(market.silverPerGramNpr) : "Price Unavailable",
      COLORS.silver,
    );
    kv(
      "Silver / tola",
      market.silverPerTolaNpr != null ? formatReportNpr(market.silverPerTolaNpr) : "Price Unavailable",
      COLORS.silver,
    );
    kv(
      "Gold daily change",
      market.goldDailyChangeNpr == null && market.goldDailyChangePct == null
        ? "—"
        : `${formatReportNpr(market.goldDailyChangeNpr, true)} · ${formatReportPct(market.goldDailyChangePct)}`,
    );
    kv(
      "Silver daily change",
      market.silverDailyChangeNpr == null && market.silverDailyChangePct == null
        ? "—"
        : `${formatReportNpr(market.silverDailyChangeNpr, true)} · ${formatReportPct(market.silverDailyChangePct)}`,
    );
    kv(
      "Publication",
      market.publishedDate
        ? `${market.publishedDate}${market.publishedTimeLocal ? ` ${market.publishedTimeLocal}` : ""}${
            market.publishedBsLabel ? ` (${market.publishedBsLabel})` : ""
          } Nepal Time`
        : "—",
    );
    kv(
      "Last successful sync",
      market.syncedAtIso
        ? new Date(market.syncedAtIso).toLocaleString("en-GB", {
            timeZone: "Asia/Kathmandu",
            dateStyle: "medium",
            timeStyle: "short",
          }) + " Nepal Time"
        : "—",
    );
    kv("Source", `${market.sourceLabel} — ${market.sourceUrl}`);
    y += 2;

    // Allocation donut
    sectionTitle("Portfolio Allocation Analysis");
    ensureSpace(42);
    const cx = margin + 22;
    const cy = y + 18;
    const r = 14;
    const total = allocation.totalValueNpr;
    if (total > 0) {
      const goldFrac = allocation.goldValueNpr / total;
      drawDonutSlice(doc, cx, cy, r, 0, goldFrac, COLORS.gold);
      drawDonutSlice(doc, cx, cy, r, goldFrac, 1, COLORS.silver);
      setFill(COLORS.white);
      doc.circle(cx, cy, 7, "F");
      setColor(COLORS.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Metals", cx, cy + 1, { align: "center" });
    } else {
      setDraw(COLORS.border);
      doc.circle(cx, cy, r, "S");
      setColor(COLORS.muted);
      doc.setFontSize(8);
      doc.text("No allocation", cx, cy + 1, { align: "center" });
    }

    const legendX = margin + 48;
    let ly = y + 6;
    setFill(COLORS.goldSoft);
    doc.roundedRect(legendX, ly - 4, contentW - 48, 12, 1.5, 1.5, "F");
    setFill(COLORS.gold);
    doc.circle(legendX + 4, ly + 1.5, 2, "F");
    setColor(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `Gold  ${formatReportPct(allocation.goldPct, 1, false)}  ·  ${formatReportNpr(allocation.goldValueNpr)}`,
      legendX + 9,
      ly + 2.5,
    );
    ly += 14;
    setFill(COLORS.silverSoft);
    doc.roundedRect(legendX, ly - 4, contentW - 48, 12, 1.5, 1.5, "F");
    setFill(COLORS.silver);
    doc.circle(legendX + 4, ly + 1.5, 2, "F");
    setColor(COLORS.ink);
    doc.text(
      `Silver  ${formatReportPct(allocation.silverPct, 1, false)}  ·  ${formatReportNpr(allocation.silverValueNpr)}`,
      legendX + 9,
      ly + 2.5,
    );
    ly += 12;
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Total portfolio value: ${formatReportNpr(allocation.totalValueNpr)}`, legendX, ly);
    y += 40;
  }

  const writeMetalDetail = (title: string, accent: [number, number, number], soft: [number, number, number]) => {
    const block = title.startsWith("Gold") ? snapshot.gold : snapshot.silver;
    if (snapshot.reportType === "gold" && block.metal === "silver") return;
    if (snapshot.reportType === "silver" && block.metal === "gold") return;

    sectionTitle(title, accent);
    setFill(soft);
    ensureSpace(28);
    doc.roundedRect(margin, y - 3, contentW, 26, 2, 2, "F");
    y += 3;
    kv("Quantity", `${block.grams.toFixed(2)} g · ${block.tola.toFixed(4)} tola`);
    kv("Purchase cost", formatReportNpr(block.purchaseCostNpr));
    kv("Current market value", formatReportNpr(block.currentValueNpr), accent);
    kv("Profit / loss", formatReportNpr(block.profitLossNpr, true), plColor(block.profitLossNpr));
    kv("ROI", formatReportPct(block.roiPct), plColor(block.roiPct));
    kv("CAGR", block.cagrLabel, accent);
    kv("Holding duration", `${block.holdingDurationLabel}${block.holdingDays != null ? ` (${block.holdingDays} days)` : ""}`);
    if (block.cagrIsAnnualizedShortPeriod && block.cagrFraction != null) {
      para("Annualized return (holding under 1 year) — not accumulated actual return or a forecast.", 8);
    }
    y += 2;

    if (sections.holdings) {
      if (block.holdings.length === 0) {
        para("No individual holdings in this category.");
      } else {
        for (const h of block.holdings) {
          ensureSpace(34);
          setDraw(COLORS.border);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin, y - 3, contentW, 30, 1.5, 1.5, "S");
          setColor(accent);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(h.name, margin + 3, y + 2);
          setColor(COLORS.muted);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(h.purchaseDate ? `Purchased ${h.purchaseDate}` : "Purchase date —", margin + 3, y + 7);
          doc.text(`${h.grams.toFixed(2)} g · ${h.tola.toFixed(4)} tola`, margin + 3, y + 12);
          doc.text(
            `Basis ${formatReportNpr(h.costBasisNpr)} · Mark ${formatReportNpr(h.currentValueNpr)} · P/L ${formatReportNpr(h.profitLossNpr, true)}`,
            margin + 3,
            y + 17,
          );
          doc.text(
            `ROI ${formatReportPct(h.roiPct)} · CAGR ${h.cagrLabel} · Held ${h.holdingDurationLabel}`,
            margin + 3,
            y + 22,
          );
          if (h.feesNpr != null) {
            doc.text(`Fees / making charges ${formatReportNpr(h.feesNpr)}`, pageW - margin - 3, y + 7, {
              align: "right",
            });
          }
          y += 34;
        }
      }
    }
  };

  if (sections.performance || sections.holdings || sections.summary) {
    if (snapshot.reportType !== "silver") {
      writeMetalDetail("Detailed Gold Investment Summary", COLORS.gold, COLORS.goldSoft);
    }
    if (snapshot.reportType !== "gold") {
      writeMetalDetail("Detailed Silver Investment Summary", COLORS.silver, COLORS.silverSoft);
    }
  }

  const writeTxnTable = (title: string, rows: MetalsReportTxnLine[], includeRealized: boolean) => {
    sectionTitle(title);
    if (rows.length === 0) {
      para("No transactions in this category.");
      y += 2;
      return;
    }

    const drawHeader = () => {
      ensureSpace(10);
      setFill(COLORS.emeraldDeep);
      doc.rect(margin, y - 3.5, contentW, 7, "F");
      setColor(COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Date", margin + 1.5, y);
      doc.text("Item", margin + 22, y);
      doc.text("Type", margin + 70, y);
      doc.text("Qty g", margin + 88, y);
      doc.text("Total", margin + 108, y);
      if (includeRealized) doc.text("Realized", margin + 140, y);
      y += 6;
    };

    drawHeader();
    rows.forEach((row, idx) => {
      if (y + 8 > pageH - footerReserve) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      if (idx % 2 === 0) {
        setFill([248, 250, 252]);
        doc.rect(margin, y - 3.5, contentW, 7, "F");
      }
      setColor(COLORS.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(row.tradeDate, margin + 1.5, y);
      const item = doc.splitTextToSize(row.itemName, 44) as string[];
      doc.text(item[0] ?? "", margin + 22, y);
      setColor(row.metal === "gold" ? COLORS.gold : COLORS.silver);
      doc.setFont("helvetica", "bold");
      doc.text(`${row.metal === "gold" ? "Au" : "Ag"} ${row.txType}`, margin + 70, y);
      setColor(COLORS.ink);
      doc.setFont("helvetica", "normal");
      doc.text(row.quantityGrams.toFixed(2), margin + 88, y);
      doc.text(formatReportNpr(row.totalAmountNpr), margin + 108, y);
      if (includeRealized) {
        setColor(plColor(row.realizedProfitNpr));
        doc.text(formatReportNpr(row.realizedProfitNpr, true), margin + 140, y);
      }
      y += 7;
    });
    y += 3;
  };

  if (sections.purchases) writeTxnTable("Purchase History", snapshot.purchases, false);
  if (sections.sales) writeTxnTable("Sales & Transaction History", snapshot.sales, true);

  if (sections.performance) {
    sectionTitle("Investment Performance");
    kv("Overall ROI", formatReportPct(summary.roiPct), plColor(summary.roiPct));
    kv("Overall CAGR", summary.cagrLabel, COLORS.gold);
    kv("Gold CAGR", snapshot.gold.cagrLabel, COLORS.gold);
    kv("Silver CAGR", snapshot.silver.cagrLabel, COLORS.silver);
    if (
      summary.cagrIsAnnualizedShortPeriod ||
      snapshot.gold.cagrIsAnnualizedShortPeriod ||
      snapshot.silver.cagrIsAnnualizedShortPeriod
    ) {
      y += 1;
      para(
        "Where holding periods are shorter than one year, CAGR figures are annualized rates derived from the existing FIRE Nepal calculation engine. They are not actual accumulated returns and are not forecasts of future performance.",
        8,
      );
    }
    y += 2;
  }

  sectionTitle("Disclaimer");
  para(DISCLAIMER, 8);
  y += 2;
  para("Generated by FIRE Nepal · www.firenepal.com · Confidential — Personal Financial Statement", 8);

  // Footers
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setDraw(COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
    setColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Generated by FIRE Nepal · www.firenepal.com · Confidential — Personal Financial Statement", margin, pageH - 11);
    doc.text(`Page ${p} / ${pageCount}`, pageW - margin, pageH - 11, { align: "right" });
    doc.setFontSize(6.5);
    doc.text(`Ref ${snapshot.referenceNumber}`, margin, pageH - 7);
  }

  return doc;
}

/** Approximate pie wedge using a triangle fan (jsPDF has no arc-fill API). */
function drawDonutSlice(
  doc: JsPdfDoc,
  cx: number,
  cy: number,
  r: number,
  startFrac: number,
  endFrac: number,
  color: [number, number, number],
) {
  if (endFrac <= startFrac) return;
  const steps = Math.max(8, Math.ceil((endFrac - startFrac) * 48));
  const points: [number, number][] = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const t = startFrac + ((endFrac - startFrac) * i) / steps;
    const ang = -Math.PI / 2 + t * Math.PI * 2;
    points.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[0];
    const b = points[i];
    const c = points[i + 1];
    if (!a || !b || !c) continue;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.triangle(a[0], a[1], b[0], b[1], c[0], c[1], "F");
  }
}

export async function downloadMetalsPortfolioReportPdf(snapshot: MetalsReportSnapshot): Promise<string> {
  const doc = await buildMetalsReportDoc(snapshot);
  const filename = metalsReportFilename(snapshot.generatedAt);
  doc.save(filename);
  return filename;
}

export async function printMetalsPortfolioReportPdf(snapshot: MetalsReportSnapshot): Promise<void> {
  const doc = await buildMetalsReportDoc(snapshot);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl as unknown as string, "_blank");
  if (!win) {
    doc.save(metalsReportFilename(snapshot.generatedAt));
  }
}

export async function metalsPortfolioReportPdfBlob(snapshot: MetalsReportSnapshot): Promise<{ blob: Blob; filename: string }> {
  const doc = await buildMetalsReportDoc(snapshot);
  const filename = metalsReportFilename(snapshot.generatedAt);
  return { blob: doc.output("blob") as Blob, filename };
}
