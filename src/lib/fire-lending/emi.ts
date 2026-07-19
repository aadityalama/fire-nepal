import { addMonthsIso, todayIso, uid } from "@/lib/fire-lending/format";
import type { EmiInstallment } from "@/lib/fire-lending/types";

/** Reducing-balance EMI schedule for Nepal-style personal loans. */
export function computeEmi(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return principal;
  if (annualRatePct <= 0) return principal / months;
  const r = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function buildInstallmentSchedule(input: {
  loanId: string;
  principal: number;
  annualRatePct: number;
  months: number;
  startDate?: string;
}): EmiInstallment[] {
  const { loanId, principal, annualRatePct, months } = input;
  const start = input.startDate ?? todayIso();
  const emi = computeEmi(principal, annualRatePct, months);
  const r = annualRatePct / 100 / 12;
  let balance = principal;
  const rows: EmiInstallment[] = [];

  for (let i = 1; i <= months; i += 1) {
    const interest = annualRatePct <= 0 ? 0 : balance * r;
    const principalPart = Math.min(balance, emi - interest);
    const amount = i === months ? balance + interest : emi;
    balance = Math.max(0, balance - principalPart);
    const dueDate = addMonthsIso(start, i);

    rows.push({
      id: uid("emi"),
      loanId,
      sequence: i,
      dueDate,
      principal: Math.round(principalPart),
      interest: Math.round(interest),
      amount: Math.round(amount),
      paidAmount: 0,
      status: "upcoming",
    });
  }

  return rows;
}

export function refreshInstallmentStatuses(rows: EmiInstallment[], today = todayIso()): EmiInstallment[] {
  return rows.map((row) => {
    if (row.paidAmount >= row.amount) return { ...row, status: "paid" as const };
    if (row.paidAmount > 0 && row.paidAmount < row.amount) {
      return { ...row, status: row.dueDate < today ? ("overdue" as const) : ("partial" as const) };
    }
    if (row.dueDate < today) return { ...row, status: "overdue" as const };
    if (row.dueDate === today) return { ...row, status: "due" as const };
    return { ...row, status: "upcoming" as const };
  });
}
