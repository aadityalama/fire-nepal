import type { KoreanPayrollExtract } from "@/lib/korean-payroll-types";
import type { PensionSlipFields } from "@/lib/pension-types";

/** Map structured payroll rows into legacy `PensionSlipFields` used by charts. */
export function payrollToLegacyFields(p: KoreanPayrollExtract): PensionSlipFields {
  const ot = (p.overtimePay ?? 0) + (p.holidayPay ?? 0) + (p.nightPay ?? 0);
  let gross = p.paymentTotal;
  if ((gross === undefined || gross <= 0) && p.netPaid && p.deductionTotal) {
    gross = Math.round(p.netPaid + p.deductionTotal);
  }
  if ((gross === undefined || gross <= 0) && p.netAfterDeductions && p.deductionTotal) {
    gross = Math.round(p.netAfterDeductions + p.deductionTotal);
  }

  return {
    grossSalary: gross && gross > 0 ? gross : undefined,
    baseSalary: p.basePay,
    overtime: ot > 0 ? Math.round(ot) : undefined,
    bonus: p.bonusPay,
    nationalPensionEmployee: p.nationalPension,
    nationalPensionEmployer: p.nationalPensionEmployer,
    healthInsurance: p.healthInsurance,
    employmentInsurance: p.employmentInsurance,
    incomeTax: p.incomeTax,
    localIncomeTax: p.localIncomeTax,
    longTermCareInsurance: p.longTermCareInsurance,
  };
}

export function hasPayrollContent(p: KoreanPayrollExtract): boolean {
  return Object.values(p).some((v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Number.isFinite(v) && v > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return false;
  });
}
