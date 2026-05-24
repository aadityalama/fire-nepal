import type { PayslipHistoryEntry, PayslipTrendAnalytics } from "@/components/payslip-import/types";

function finitePos(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Salary / overtime / deduction intelligence from stored payslip history (KRW-native).
 */
export function computePayslipTrendAnalytics(entries: readonly PayslipHistoryEntry[]): PayslipTrendAnalytics {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  );

  if (sorted.length === 0) {
    return {
      entryCount: 0,
      grossSalaryMoM_pct: null,
      overtimeShareOfGross_avg: null,
      deductionsShareOfGross_avg: null,
      netToGross_avg: null,
      savingsPotentialNote: "Import a payslip to build salary intelligence.",
    };
  }

  let grossMoM: number | null = null;
  if (sorted.length >= 2) {
    const a = finitePos(sorted[0]!.parsed.grossSalaryKrw);
    const b = finitePos(sorted[1]!.parsed.grossSalaryKrw);
    if (a != null && b != null && b > 0) {
      grossMoM = ((a - b) / b) * 100;
    }
  }

  let otSum = 0;
  let otN = 0;
  let dedSum = 0;
  let dedN = 0;
  let netRatioSum = 0;
  let netRatioN = 0;

  for (const e of sorted) {
    const g = finitePos(e.parsed.grossSalaryKrw);
    const ot = finitePos(e.parsed.overtimePayKrw) ?? 0;
    if (g != null && ot > 0) {
      otSum += ot / g;
      otN += 1;
    }
    if (g != null) {
      const pen = finitePos(e.parsed.nationalPensionKrw) ?? 0;
      const hi = finitePos(e.parsed.healthInsuranceKrw) ?? 0;
      const tax = finitePos(e.parsed.taxKrw) ?? 0;
      const oth = finitePos(e.parsed.deductionsOtherKrw) ?? 0;
      const d = pen + hi + tax + oth;
      if (d > 0) {
        dedSum += d / g;
        dedN += 1;
      }
      const net = finitePos(e.parsed.netSalaryKrw);
      if (net != null) {
        netRatioSum += net / g;
        netRatioN += 1;
      }
    }
  }

  const overtimeShareOfGross_avg = otN > 0 ? otSum / otN : null;
  const deductionsShareOfGross_avg = dedN > 0 ? dedSum / dedN : null;
  const netToGross_avg = netRatioN > 0 ? netRatioSum / netRatioN : null;

  let savingsPotentialNote = "Track imports over time to see overtime and deduction pressure.";
  if (deductionsShareOfGross_avg != null && deductionsShareOfGross_avg > 0.18) {
    savingsPotentialNote =
      "Deductions are elevated vs gross — review tax withholding and insurance bands when rules change.";
  } else if (overtimeShareOfGross_avg != null && overtimeShareOfGross_avg > 0.08) {
    savingsPotentialNote = "Overtime is a meaningful share of gross — model income volatility in FIRE scenarios.";
  } else if (netToGross_avg != null && netToGross_avg > 0.82) {
    savingsPotentialNote = "Strong net-to-gross retention — surplus may support higher automated savings.";
  }

  return {
    entryCount: sorted.length,
    grossSalaryMoM_pct: grossMoM,
    overtimeShareOfGross_avg,
    deductionsShareOfGross_avg,
    netToGross_avg,
    savingsPotentialNote,
  };
}
