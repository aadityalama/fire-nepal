/**
 * Annual payment timing intelligence — liquidity awareness separate from EF target.
 * Uses insurance premium due dates when available; does not invent missing dates.
 */

import { finiteNonNeg } from "@/lib/emergency-fund/math";
import type { UpcomingAnnualPayment } from "@/lib/emergency-fund/types";

export type AnnualPaymentSource = {
  id: string;
  name: string;
  dueDate: string | null | undefined;
  amountNpr: number;
  /** Amount already reserved specifically for this payment, if tracked. */
  reservedNpr?: number;
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86_400_000);
}

function windowForDays(days: number): UpcomingAnnualPayment["window"] {
  if (days <= 30) return "30";
  if (days <= 90) return "90";
  if (days <= 180) return "180";
  return "later";
}

/**
 * Build upcoming annual payment rows from sources that already carry reliable due dates.
 * Entries without a valid YYYY-MM-DD due date are skipped (never invented).
 */
export function buildUpcomingAnnualPayments(
  sources: readonly AnnualPaymentSource[],
  now = new Date(),
): UpcomingAnnualPayment[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: UpcomingAnnualPayment[] = [];

  for (const source of sources) {
    const due = typeof source.dueDate === "string" ? source.dueDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) continue;
    const amount = finiteNonNeg(source.amountNpr);
    if (amount <= 0) continue;

    const dueDate = new Date(`${due}T00:00:00`);
    if (Number.isNaN(dueDate.getTime())) continue;

    const daysUntil = daysBetween(today, dueDate);
    // Keep historical overdue within 30 days for liquidity warnings; skip older.
    if (daysUntil < -30) continue;

    const reservedNpr = finiteNonNeg(source.reservedNpr);
    out.push({
      id: source.id,
      name: source.name.trim() || "Annual payment",
      dueDate: due,
      amountNpr: amount,
      reservedNpr,
      remainingObligationNpr: Math.max(0, amount - reservedNpr),
      daysUntil,
      window: windowForDays(Math.max(0, daysUntil)),
    });
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil || a.dueDate.localeCompare(b.dueDate));
}
