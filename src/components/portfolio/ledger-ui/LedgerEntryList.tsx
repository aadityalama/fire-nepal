"use client";

import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { bucketLabel, txToneClass } from "@/components/portfolio/ledger-ui/ledger-shared";

export function LedgerEntryList({
  entries,
  listClassName,
}: {
  entries: readonly PortfolioLedgerEntry[];
  /** When set, overrides default scroll area (used by global master ledger). */
  listClassName?: string;
}) {
  return (
    <ul
      className={
        listClassName ?? "max-h-[min(55vh,420px)] space-y-2 overflow-y-auto pr-0.5"
      }
    >
      {entries.map((e) => (
        <li
          key={e.id}
          className={`wealth-row-card rounded-xl border-l-2 p-2.5 sm:p-3 ${txToneClass(e.txType)}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-emerald-50 sm:text-base">{e.assetLabel}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200/55 sm:text-xs">
                {bucketLabel(e)} · {e.tradeDate}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-100/90">
              {e.ledgerAction ?? e.txType}
            </span>
          </div>
          <div className="mt-2 grid gap-1.5 text-xs font-bold tabular-nums text-emerald-100/90 sm:grid-cols-2 sm:text-sm">
            <div>
              <span className="text-emerald-200/50">
                {e.txType === "cash_dividend"
                  ? "Gross · currency"
                  : e.unitPrice === 1 &&
                      (e.bucket === "liquid_cash" ||
                        e.bucket === "real_estate" ||
                        e.bucket === "vehicle" ||
                        e.bucket === "liability" ||
                        e.bucket === "retirement")
                    ? "Amount"
                    : "Qty · price"}
              </span>
              <p className="font-black">
                {e.txType === "cash_dividend" ? (
                  <>
                    {Number(
                      typeof e.meta?.dividendGrossInCcy === "number" ? e.meta.dividendGrossInCcy : e.quantity,
                    ).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                    {e.currency}
                  </>
                ) : e.unitPrice === 1 &&
                  (e.bucket === "liquid_cash" ||
                    e.bucket === "real_estate" ||
                    e.bucket === "vehicle" ||
                    e.bucket === "liability" ||
                    e.bucket === "retirement") ? (
                  `${e.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${e.currency}`
                ) : (
                  `${e.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${e.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${e.currency}`
                )}
              </p>
            </div>
            {e.txType === "cash_dividend" && typeof e.meta?.dividendNetNpr === "number" ? (
              <div>
                <span className="text-emerald-200/50">Net to cashflow (NPR)</span>
                <p className="font-black text-cyan-200">{formatMoney(e.meta.dividendNetNpr as number, "NPR")}</p>
              </div>
            ) : null}
            {e.fees != null && e.fees > 0 && (
              <div>
                <span className="text-emerald-200/50">Fees</span>
                <p className="font-black">
                  {e.fees.toLocaleString()} {e.currency}
                </p>
              </div>
            )}
            {e.txType === "sell" && typeof e.realizedGainNpr === "number" && (
              <div className="sm:col-span-2">
                <span className="text-emerald-200/50">Realized P/L (NPR)</span>
                <p className={`font-black ${e.realizedGainNpr >= 0 ? "text-lime-300" : "text-rose-300"}`}>
                  {formatMoney(e.realizedGainNpr, "NPR")}
                </p>
              </div>
            )}
            {e.txType === "sell" && e.realizedGainNpr == null && (
              <div className="sm:col-span-2 text-[10px] font-semibold text-amber-200/80">
                Realized P/L unavailable (e.g. metal without cost basis).
              </div>
            )}
          </div>
          {e.notes ? (
            <p className="mt-2 border-t border-white/5 pt-2 text-[11px] font-semibold leading-snug text-emerald-200/70 sm:text-xs">
              {e.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
