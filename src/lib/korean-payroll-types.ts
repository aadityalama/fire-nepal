/** Structured fields from a Korean factory / company payroll slip (OCR + edits). */
export type KoreanPayrollExtract = {
  employeeName?: string;
  employeeNo?: string;
  hireDateRaw?: string;
  department?: string;
  basePay?: number;
  overtimePay?: number;
  holidayPay?: number;
  nightPay?: number;
  bonusPay?: number;
  paymentTotal?: number;
  nationalPension?: number;
  nationalPensionEmployer?: number;
  healthInsurance?: number;
  longTermCareInsurance?: number;
  employmentInsurance?: number;
  incomeTax?: number;
  localIncomeTax?: number;
  deductionTotal?: number;
  netAfterDeductions?: number;
  netPaid?: number;
};

/** Per-field OCR confidence (0–100), when available. */
export type PayrollFieldConfidences = Partial<Record<keyof KoreanPayrollExtract, number>>;
