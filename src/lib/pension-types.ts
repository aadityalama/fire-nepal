/** Parsed numeric fields from a Korean salary slip (OCR + user edits). */
export type PensionSlipFields = {
  grossSalary?: number;
  baseSalary?: number;
  overtime?: number;
  bonus?: number;
  nationalPensionEmployee?: number;
  nationalPensionEmployer?: number;
  healthInsurance?: number;
  /** 장기요양보험 (when itemized) */
  longTermCareInsurance?: number;
  employmentInsurance?: number;
  incomeTax?: number;
  localIncomeTax?: number;
  severanceReserve?: number;
  otherDeductions?: number;
};

export type SalarySlipRecord = {
  id: string;
  uploadedAt: string;
  /** Salary month YYYY-MM */
  periodYm: string;
  rawOcrText?: string;
  fields: PensionSlipFields;
  /** User note or OCR confidence hint */
  note?: string;
};

export type PensionLocale = "en" | "ko" | "ne";

export type PensionDashboardState = {
  version: 1;
  profile: {
    /** ISO date — used for severance tenure */
    joinDate: string;
    /** Optional employer name */
    employerName?: string;
  };
  slips: SalarySlipRecord[];
};

export const PENSION_STORAGE_KEY = "fire-nepal-pension-severance-v1";
