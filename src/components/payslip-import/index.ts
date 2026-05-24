/** Korean payslip import (STEP 5A) — public surface for wiring pages. */
export type {
  PayslipHistoryEntry,
  PayslipHistoryState,
  PayslipOCRFieldKey,
  PayslipOCRRaw,
  PayslipParsed,
  PayslipTrendAnalytics,
} from "@/components/payslip-import/types";
export { KoreanPayslipImportPanel } from "@/components/payslip-import/KoreanPayslipImportPanel";
export { parsePayslipFromOcr } from "@/components/payslip-import/payslip-from-ocr";
export { mockOcrFromFileName } from "@/components/payslip-import/mock-ocr-responses";
export { applyPayslipToCashflowStorage, readCashflowSalaryNprHint } from "@/components/payslip-import/apply-payslip-to-cashflow";
export { computePayslipTrendAnalytics } from "@/components/payslip-import/payslip-analytics";
export { parseKrwFromOcrText, krwToNpr } from "@/components/payslip-import/krw-normalize";
