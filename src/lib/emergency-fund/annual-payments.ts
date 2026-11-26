/**
 * Annual payment timing intelligence — liquidity awareness separate from EF target.
 * Uses insurance premium due dates when available; does not invent missing dates.
 * Does not auto-deduct from emergency reserves.
 */

import { finiteNonNeg } from "@/lib/emergency-fund/math";
import type {
  AnnualPaymentStatus,
  UpcomingAnnualPayment,
} from "@/lib/emergency-fund/types";

export type AnnualPaymentSource = {
  id: string;
  name: string;
  dueDate: string | null | undefined;
  amountNpr: number;
  /** Amount already reserved / paid toward this installment when tracked. */
  reservedNpr?: number;
  /** Explicit paid flag from source records when available. */
  isPaid?: boolean | null;
  /** Explicit partially-paid flag when available. */
  isPartiallyPaid?: boolean | null;
};

/** Calendar-day difference using local date parts (avoids UTC off-by-one). */
export function calendarDaysUntilDue(dueIso: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueIso)) return null;
  const [y, m, d] = dueIso.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = due.getTime() - today.getTime();
  return Math.round(ms / 86_400_000);
}

export function resolveAnnualPaymentStatus(input: {
  daysUntil: number | null;
  amountNpr: number;
  reservedNpr: number;
  isPaid?: boolean | null;
  isPartiallyPaid?: boolean | null;
}): { status: AnnualPaymentStatus; statusLabel: string } {
  const amount = finiteNonNeg(input.amountNpr);
  const reserved = finiteNonNeg(input.reservedNpr);

  if (input.isPaid === true || (amount > 0 && reserved >= amount - 1e-9)) {
    return { status: "paid", statusLabel: "Paid" };
  }
  if (input.isPartiallyPaid === true || (reserved > 0 && reserved < amount)) {
    return { status: "partially_paid", statusLabel: "Partially Paid" };
  }
  if (input.daysUntil == null) {
    return { status: "unknown", statusLabel: "Payment Status Unknown" };
  }
  if (input.daysUntil < 0) {
    const overdueDays = Math.abs(input.daysUntil);
    return {
      status: "overdue",
      statusLabel: `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
    };
  }
  if (input.daysUntil === 0) {
    return { status: "due_today", statusLabel: "Due Today" };
  }
  return {
    status: "upcoming",
    statusLabel: `Upcoming in ${input.daysUntil} ${input.daysUntil === 1 ? "day" : "days"}`,
  };
}

function windowForPayment(
  daysUntil: number | null,
  status: AnnualPaymentStatus,
): UpcomingAnnualPayment["window"] {
  if (status === "overdue") return "overdue";
  if (daysUntil == null) return "later";
  if (daysUntil <= 30) return "30";
  if (daysUntil <= 90) return "90";
  if (daysUntil <= 180) return "180";
  return "later";
}

/**
 * Build annual payment rows from sources that already carry reliable due dates.
 * Deduplicates by id. Entries without a valid YYYY-MM-DD due date are skipped
 * unless an explicit paid/partial status exists with a due date.
 */
export function buildUpcomingAnnualPayments(
  sources: readonly AnnualPaymentSource[],
  now = new Date(),
): UpcomingAnnualPayment[] {
  const seen = new Set<string>();
  const out: UpcomingAnnualPayment[] = [];

  for (const source of sources) {
    const id = source.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const due = typeof source.dueDate === "string" ? source.dueDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) continue;

    const amount = finiteNonNeg(source.amountNpr);
    if (amount <= 0) continue;

    const daysUntil = calendarDaysUntilDue(due, now);
    // Keep overdue items within 365 days for liquidity awareness; drop older noise.
    if (daysUntil != null && daysUntil < -365) continue;

    const reservedNpr = finiteNonNeg(source.reservedNpr);
    const { status, statusLabel } = resolveAnnualPaymentStatus({
      daysUntil,
      amountNpr: amount,
      reservedNpr,
      isPaid: source.isPaid,
      isPartiallyPaid: source.isPartiallyPaid,
    });

    // Paid installments are not liquidity warnings.
    if (status === "paid") continue;

    out.push({
      id,
      name: source.name.trim() || "Annual payment",
      dueDate: due,
      amountNpr: amount,
      reservedNpr,
      remainingObligationNpr: Math.max(0, amount - reservedNpr),
      daysUntil: daysUntil ?? 0,
      status,
      statusLabel,
      window: windowForPayment(daysUntil, status),
    });
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil || a.dueDate.localeCompare(b.dueDate));
}
