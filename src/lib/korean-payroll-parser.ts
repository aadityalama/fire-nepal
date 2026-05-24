import type { Page } from "tesseract.js";
import { parsePensionSlipFromOcrText, slipParseStats } from "@/lib/pension-slip-parser";
import { payrollToLegacyFields } from "@/lib/payroll-to-legacy";
import type { KoreanPayrollExtract, PayrollFieldConfidences } from "@/lib/korean-payroll-types";
import type { PensionSlipFields } from "@/lib/pension-types";

export type KoreanPayrollParseResult = {
  payroll: KoreanPayrollExtract;
  confidences: PayrollFieldConfidences;
  legacyFields: PensionSlipFields;
  numericFilled: number;
  numericTotal: number;
};

/**
 * Parse Korean payroll OCR text into structured fields + legacy chart fields.
 * Structured extraction can be extended here; legacy parser fills slips today.
 */
export function parseKoreanPayrollFromOcr(raw: string, _page?: Page | null): KoreanPayrollParseResult {
  const payroll: KoreanPayrollExtract = {};
  const confidences: PayrollFieldConfidences = {};
  const fromLegacy = parsePensionSlipFromOcrText(raw);
  const fromPayroll = payrollToLegacyFields(payroll);
  const legacyFields: PensionSlipFields = { ...fromLegacy };
  for (const key of Object.keys(fromPayroll) as (keyof PensionSlipFields)[]) {
    const v = fromPayroll[key];
    if (v !== undefined) legacyFields[key] = v;
  }
  const st = slipParseStats(legacyFields);
  return {
    payroll,
    confidences,
    legacyFields,
    numericFilled: st.filledCount,
    numericTotal: st.totalKeys,
  };
}
