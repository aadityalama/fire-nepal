import { krwToNpr } from "@/components/payslip-import/krw-normalize";
import type { PayslipParsed } from "@/components/payslip-import/types";
import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";

export type ApplyPayslipResult = {
  ok: boolean;
  salaryNpr: number;
  overtimeNpr: number;
  message: string;
};

function inferSalaryNpr(parsed: PayslipParsed, krwPerNpr: number): ApplyPayslipResult | { salaryNpr: number; overtimeNpr: number } {
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

  return {
    salaryNpr: Math.round(krwToNpr(baseSalaryKrw, krwPerNpr)),
    overtimeNpr: otK > 0 ? Math.round(krwToNpr(otK, krwPerNpr)) : 0,
  };
}

/**
 * Writes monthly salary + overtime (NPR) into cashflow from parsed KRW payslip.
 * Authenticated: Supabase PUT. Guest: localStorage.
 */
export function applyPayslipToCashflowStorage(
  parsed: PayslipParsed,
  krwPerNpr: number,
  userId?: string | null,
): ApplyPayslipResult {
  if (typeof window === "undefined") {
    return { ok: false, salaryNpr: 0, overtimeNpr: 0, message: "Client only." };
  }

  const inferred = inferSalaryNpr(parsed, krwPerNpr);
  if ("ok" in inferred) return inferred;
  const { salaryNpr, overtimeNpr } = inferred;
  const otK = Math.max(0, parsed.overtimePayKrw ?? 0);

  // Fire-and-forget async cloud path; return optimistic success for UX.
  void patchCashflowState(userId, (cur) => {
    const nextIncome = { ...cur.income, salary: salaryNpr };
    if (otK > 0) nextIncome.overtime = overtimeNpr;
    return { ...cur, income: nextIncome };
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[payslip] cashflow apply failed", error);
    }
  });

  return {
    ok: true,
    salaryNpr,
    overtimeNpr,
    message: `Cashflow updated: salary ${salaryNpr.toLocaleString()} NPR/mo · overtime ${overtimeNpr.toLocaleString()} NPR/mo (mock OCR — verify).`,
  };
}

/** Read current salary hint (NPR) for FIRE simulation UX — optional. Prefer cloud cache after hydrate. */
export function readCashflowSalaryNprHint(userId?: string | null): number {
  if (typeof window === "undefined") return 0;
  try {
    const s = loadCashflowState(userId);
    return Math.max(0, Math.round(s.income.salary ?? 0));
  } catch {
    return 0;
  }
}
