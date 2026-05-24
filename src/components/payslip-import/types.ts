/** Korean payslip OCR + parsing (STEP 5A — mock pipeline first). */

export const PAYSLIP_HISTORY_VERSION = 1 as const;

/** Raw OCR keys as returned by a future vision API / on-device OCR. */
export type PayslipOCRFieldKey =
  | "employeeName"
  | "companyName"
  | "payDate"
  | "grossSalary"
  | "netSalary"
  | "overtimePay"
  | "nationalPension"
  | "healthInsurance"
  | "tax"
  | "deductionsOther"
  | "bonus";

export type PayslipOCRRaw = {
  /** Original upload metadata */
  sourceFileName: string;
  sourceMime: string;
  extractedAt: string;
  /** Noisy line-level strings (simulates OCR). */
  fields: Partial<Record<PayslipOCRFieldKey, string>>;
};

export type PayslipParsed = {
  employeeName: string | null;
  companyName: string | null;
  /** ISO date yyyy-mm-dd when parseable */
  payDate: string | null;
  grossSalaryKrw: number | null;
  netSalaryKrw: number | null;
  overtimePayKrw: number | null;
  nationalPensionKrw: number | null;
  healthInsuranceKrw: number | null;
  taxKrw: number | null;
  deductionsOtherKrw: number | null;
  bonusKrw: number | null;
  /** Heuristic 0–1 confidence per logical field */
  confidence: Partial<Record<Exclude<keyof PayslipParsed, "confidence">, number>>;
};

export type PayslipHistoryEntry = {
  id: string;
  importedAt: string;
  ocr: PayslipOCRRaw;
  parsed: PayslipParsed;
  /** NPR amounts written to cashflow when user applied (salary + overtime). */
  appliedSalaryNpr: number | null;
  appliedOvertimeNpr: number | null;
  krwPerNprUsed: number | null;
  applied: boolean;
};

export type PayslipHistoryState = {
  version: typeof PAYSLIP_HISTORY_VERSION;
  entries: PayslipHistoryEntry[];
};

export type PayslipTrendAnalytics = {
  entryCount: number;
  /** Latest vs previous gross (KRW), null if not enough data */
  grossSalaryMoM_pct: number | null;
  /** Average overtime / gross on entries that have both */
  overtimeShareOfGross_avg: number | null;
  /** Average (pension + health + tax + other) / gross */
  deductionsShareOfGross_avg: number | null;
  /** Net / gross average */
  netToGross_avg: number | null;
  /** Heuristic: avg(net - overtime) as “base take-home” trend proxy */
  savingsPotentialNote: string;
};
