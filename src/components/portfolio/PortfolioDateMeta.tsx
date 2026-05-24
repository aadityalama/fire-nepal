"use client";

import {
  annualizedCagrFraction,
  calendarDaysInvested,
  formatCagrPct,
  formatHoldingDurationApprox,
  parsePurchaseIso,
} from "@/components/portfolio/holding-stats";

type Props = {
  dateIso?: string;
  /** NPR basis (e.g. cost) — when set with `markNpr`, may show CAGR after `minDaysForCagr`. */
  basisNpr?: number;
  /** NPR mark (e.g. live / estimated value). */
  markNpr?: number;
  minDaysForCagr?: number;
  /** Prefix before duration (e.g. "Holding", "Owned", "Loan age"). */
  leadText: string;
};

/**
 * Read-only duration + optional annualized return hint (informational; not used in core totals).
 */
export function PortfolioDateMeta({
  dateIso,
  basisNpr,
  markNpr,
  minDaysForCagr = 30,
  leadText,
}: Props) {
  const purchaseDt = parsePurchaseIso(dateIso);
  const days = purchaseDt != null ? calendarDaysInvested(purchaseDt) : null;
  if (purchaseDt == null || days == null) return null;

  const holdingLabel = `${formatHoldingDurationApprox(days)} · ${days} calendar day${days === 1 ? "" : "s"}`;
  const canCagr =
    basisNpr != null &&
    markNpr != null &&
    basisNpr > 0 &&
    markNpr > 0 &&
    Number.isFinite(basisNpr) &&
    Number.isFinite(markNpr);
  const cagrFrac =
    canCagr && days >= minDaysForCagr ? annualizedCagrFraction(basisNpr!, markNpr!, days) : null;

  return (
    <div className="min-w-0 space-y-1 text-[11px] font-bold leading-snug text-emerald-100/90 sm:flex-1 sm:text-xs">
      <p>
        <span className="font-extrabold text-emerald-200/55">{leadText} · </span>
        {holdingLabel}
      </p>
      {canCagr && days >= minDaysForCagr ? (
        <p className="tabular-nums text-amber-200/95">
          <span className="font-extrabold text-emerald-200/55">CAGR · </span>
          {formatCagrPct(cagrFrac)}
        </p>
      ) : canCagr && days > 0 && days < minDaysForCagr ? (
        <p className="text-[10px] font-bold text-emerald-200/45">
          CAGR shown after {minDaysForCagr}+ days (informational).
        </p>
      ) : null}
    </div>
  );
}
