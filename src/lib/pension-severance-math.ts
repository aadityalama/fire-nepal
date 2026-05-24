import type { PensionSlipFields, SalarySlipRecord } from "@/lib/pension-types";

const MS_PER_DAY = 86_400_000;

export function monthsBetweenUtc(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / (MS_PER_DAY * 30.437));
}

/**
 * Ballpark severance (퇴직금) illustration used by many HR summaries:
 * ≈ one average monthly gross per year of continuous service.
 * Not legal advice — Korea LSA uses detailed average wage / service days.
 */
export function estimateSeveranceBallpark(averageMonthlyGross: number, tenureMonths: number): number {
  if (averageMonthlyGross <= 0 || tenureMonths <= 0) return 0;
  const years = tenureMonths / 12;
  return Math.round(averageMonthlyGross * years);
}

export function averageGrossFromSlips(slips: SalarySlipRecord[], maxLast = 3): number {
  const sorted = [...slips].sort((x, y) => x.periodYm.localeCompare(y.periodYm));
  const last = sorted.slice(-maxLast);
  const vals = last.map((s) => s.fields.grossSalary).filter((n): n is number => typeof n === "number" && n > 0);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function totalNationalPensionFromSlip(f: PensionSlipFields): {
  employee: number;
  employer: number;
  total: number;
} {
  const employee = f.nationalPensionEmployee ?? 0;
  let employer = f.nationalPensionEmployer ?? 0;
  if (employee > 0 && employer === 0) {
    /** When slip shows only employee line, assume symmetric 4.5% + 4.5% style split for display only */
    employer = employee;
  }
  return { employee, employer, total: employee + employer };
}

export function totalDeductionsEstimate(f: PensionSlipFields): number {
  return (
    (f.healthInsurance ?? 0) +
    (f.employmentInsurance ?? 0) +
    (f.incomeTax ?? 0) +
    (f.localIncomeTax ?? 0) +
    (f.nationalPensionEmployee ?? 0) +
    (f.longTermCareInsurance ?? 0) +
    (f.otherDeductions ?? 0)
  );
}
