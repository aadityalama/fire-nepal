import type { PensionDashboardState } from "@/lib/pension-types";
import { averageGrossFromSlips, estimateSeveranceBallpark, monthsBetweenUtc, totalNationalPensionFromSlip } from "@/lib/pension-severance-math";

function ymMinusMonths(ym: string, deltaMonths: number): string {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return ym;
  const d = new Date(y, mo - 1 - deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function downloadPensionReportPdf(
  state: PensionDashboardState,
  opts: { krwPerNpr: number; insights: string[] },
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  const line = (text: string, gap = 5) => {
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

  doc.setFontSize(16);
  line("FIRE Nepal — Korea Pension + Severance Report", 7);
  doc.setFontSize(10);
  line(`Generated: ${new Date().toISOString().slice(0, 10)}`, 5);
  line(`Join date: ${state.profile.joinDate}`, 5);
  line(`NPR per calculation rate: 1 NPR = ${opts.krwPerNpr.toFixed(4)} KRW (illustrative)`, 6);

  line("--- AI summary (English) ---", 6);
  for (const s of opts.insights) {
    line(`• ${s}`, 5);
  }

  line("--- Saved slips (numbers in KRW) ---", 6);
  const sorted = [...state.slips].sort((a, b) => a.periodYm.localeCompare(b.periodYm));
  for (const s of sorted) {
    const np = totalNationalPensionFromSlip(s.fields);
    line(
      `${s.periodYm}: gross ${s.fields.grossSalary ?? "-"}, NP emp ${s.fields.nationalPensionEmployee ?? "-"}, NP co ${s.fields.nationalPensionEmployer ?? "-"}, total NP ${np.total}`,
      5,
    );
  }

  const avg = averageGrossFromSlips(sorted, 3);
  const lastYm = sorted[sorted.length - 1]?.periodYm ?? state.profile.joinDate.slice(0, 7);
  const tenure = monthsBetweenUtc(state.profile.joinDate, `${lastYm}-28`);
  const sev = estimateSeveranceBallpark(avg, tenure);
  line(`--- Model severance (ballpark) ---`, 6);
  line(`Average gross (last slips): ${avg}`, 5);
  line(`Tenure months (to last slip month): ${tenure}`, 5);
  line(`Estimated severance: ${sev} KRW (~ ${(sev / opts.krwPerNpr).toFixed(0)} NPR)`, 5);

  doc.save(`fire-nepal-pension-report-${Date.now()}.pdf`);
}

export function estimateSeveranceYoYDelta(
  slips: PensionDashboardState["slips"],
  joinDateIso: string,
): number {
  const sorted = [...slips].sort((a, b) => a.periodYm.localeCompare(b.periodYm));
  if (sorted.length < 2) return 0;
  const last = sorted[sorted.length - 1]!;
  const refYm = ymMinusMonths(last.periodYm, 12);
  const ref = sorted.filter((s) => s.periodYm <= refYm).pop();
  if (!ref) return 0;
  const avgLast = averageGrossFromSlips(sorted.filter((s) => s.periodYm <= last.periodYm), 3);
  const avgRef = averageGrossFromSlips(sorted.filter((s) => s.periodYm <= ref.periodYm), 3);
  const tLast = monthsBetweenUtc(joinDateIso, `${last.periodYm}-28`);
  const tRef = monthsBetweenUtc(joinDateIso, `${ref.periodYm}-28`);
  return estimateSeveranceBallpark(avgLast, tLast) - estimateSeveranceBallpark(avgRef, tRef);
}
