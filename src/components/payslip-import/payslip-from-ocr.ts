import { parseKrwFromOcrText } from "@/components/payslip-import/krw-normalize";
import type { PayslipOCRFieldKey, PayslipOCRRaw, PayslipParsed } from "@/components/payslip-import/types";

function pickStr(raw: PayslipOCRRaw, key: PayslipOCRFieldKey): string | undefined {
  const v = raw.fields[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function conf(n: number | null): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, 0.55 + Math.log10(1 + n) * 0.08);
}

/** Normalize Korean-ish date fragments to yyyy-mm-dd when possible. */
function parsePayDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const compact = raw.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const ymd = raw.match(/(20\d{2})\s*[\.\-\/년월\s]*(\d{1,2})\s*[\.\-\/월\s]*(\d{1,2})/);
  if (ymd) {
    const y = ymd[1]!;
    const mo = ymd[2]!.padStart(2, "0");
    const d = ymd[3]!.padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  const ym = raw.match(/(20\d{2})\s*[\-\.]\s*(\d{1,2})/);
  if (ym) return `${ym[1]}-${ym[2]!.padStart(2, "0")}-01`;
  return null;
}

function cleanName(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").replace(/[()]/g, "").trim();
  return t.length ? t.slice(0, 80) : null;
}

/**
 * Smart parsing layer: map noisy OCR fields → structured KRW + metadata.
 * Designed for Korean payslip layouts & E9-style rows; safe with partial OCR.
 */
export function parsePayslipFromOcr(raw: PayslipOCRRaw): PayslipParsed {
  const grossSalaryKrw = parseKrwFromOcrText(pickStr(raw, "grossSalary"));
  const netSalaryKrw = parseKrwFromOcrText(pickStr(raw, "netSalary"));
  const overtimePayKrw = parseKrwFromOcrText(pickStr(raw, "overtimePay"));
  const nationalPensionKrw = parseKrwFromOcrText(pickStr(raw, "nationalPension"));
  const healthInsuranceKrw = parseKrwFromOcrText(pickStr(raw, "healthInsurance"));
  const taxKrw = parseKrwFromOcrText(pickStr(raw, "tax"));
  const deductionsOtherKrw = parseKrwFromOcrText(pickStr(raw, "deductionsOther"));
  const bonusKrw = parseKrwFromOcrText(pickStr(raw, "bonus"));

  const payDate = parsePayDate(pickStr(raw, "payDate"));

  const parsed: PayslipParsed = {
    employeeName: cleanName(pickStr(raw, "employeeName")),
    companyName: cleanName(pickStr(raw, "companyName")),
    payDate,
    grossSalaryKrw,
    netSalaryKrw,
    overtimePayKrw: overtimePayKrw && overtimePayKrw > 0 ? overtimePayKrw : null,
    nationalPensionKrw,
    healthInsuranceKrw,
    taxKrw,
    deductionsOtherKrw,
    bonusKrw: bonusKrw && bonusKrw > 0 ? bonusKrw : null,
    confidence: {
      employeeName: pickStr(raw, "employeeName") ? 0.72 : 0,
      companyName: pickStr(raw, "companyName") ? 0.7 : 0,
      payDate: payDate ? 0.68 : 0.35,
      grossSalaryKrw: conf(grossSalaryKrw),
      netSalaryKrw: conf(netSalaryKrw),
      overtimePayKrw: conf(overtimePayKrw),
      nationalPensionKrw: conf(nationalPensionKrw),
      healthInsuranceKrw: conf(healthInsuranceKrw),
      taxKrw: conf(taxKrw),
      deductionsOtherKrw: conf(deductionsOtherKrw),
      bonusKrw: conf(bonusKrw),
    },
  };

  return parsed;
}
