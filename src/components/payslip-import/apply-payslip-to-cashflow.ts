import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import { loadCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";
import { krwToNpr } from "@/components/payslip-import/krw-normalize";
import type { PayslipParsed } from "@/components/payslip-import/types";

export type ApplyPayslipResult = {
  ok: boolean;
  salaryNpr: number;
  overtimeNpr: number;
  message: string;
};

/**
 * Writes monthly salary + overtime (NPR) into cashflow storage from parsed KRW payslip.
 * Uses gross − overtime as base salary when base monthly salary is ambiguous; falls back to net if needed.
 */
export function applyPayslipToCashflowStorage(parsed: PayslipParsed, krwPerNpr: number, userId?: string | null): ApplyPayslipResult {
  if (typeof window === "undefined") {
    return { ok: false, salaryNpr: 0, overtimeNpr: 0, message: "Client only." };
  }
  if (!Number.isFinite(krwPerNpr) || krwPerNpr <= 0) {
    return { ok: false, salaryNpr: 0, overtimeNpr: 0, message: "Invalid FX (KRW per NPR)." };
  }

  const otK = Math.max(0, parsed.overtimePayKrw ?? 0);
  const gross = parsed.grossSalaryKrw;
  const net = parsed.netSalaryKrw;

  let baseSalaryKrw: number | null = null;
  if (gross != null && gross > 0) {
    baseSalaryKrw = Math.max(0, gross - (otK > 0 ? otK : 0));
  } else if (net != null && net > 0) {
    baseSalaryKrw = Math.max(0, net - (otK > 0 ? otK : 0));
  }

  if (baseSalaryKrw == null || baseSalaryKrw <= 0) {
    return { ok: false, salaryNpr: 0, overtimeNpr: 0, message: "Could not infer monthly salary from OCR." };
  }

  const salaryNpr = Math.round(krwToNpr(baseSalaryKrw, krwPerNpr));
  const overtimeNpr = otK > 0 ? Math.round(krwToNpr(otK, krwPerNpr)) : 0;

  try {
    const cur = loadCashflowState(userId);
    const nextIncome = { ...cur.income, salary: salaryNpr };
    if (otK > 0) {
      nextIncome.overtime = overtimeNpr;
    }
    const next = { ...cur, income: nextIncome };
    saveCashflowState(next, userId);
    window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));
    return {
      ok: true,
      salaryNpr,
      overtimeNpr,
      message: `Cashflow updated: salary ${salaryNpr.toLocaleString()} NPR/mo · overtime ${overtimeNpr.toLocaleString()} NPR/mo (mock OCR — verify).`,
    };
  } catch {
    return { ok: false, salaryNpr: 0, overtimeNpr: 0, message: "Could not save cashflow state." };
  }
}

/** Read current salary hint (NPR) for FIRE simulation UX — optional. */
export function readCashflowSalaryNprHint(userId?: string | null): number {
  if (typeof window === "undefined") return 0;
  try {
    const s = loadCashflowState(userId);
    return Math.max(0, Math.round(s.income.salary ?? 0));
  } catch {
    return 0;
  }
}
