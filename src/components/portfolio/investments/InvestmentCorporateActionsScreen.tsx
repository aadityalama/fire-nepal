"use client";

import { useMemo } from "react";
import {
  classifyLedgerBucket,
  sortByTradeDateDesc,
} from "@/components/portfolio/investments/investment-card-model";
import { EmptyState, InvGlass, InvSectionTitle } from "@/components/portfolio/investments/InvestmentUi";
import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";

const CORPORATE = new Set(["bonus", "right", "ipo", "fpo", "auction"]);

export function InvestmentCorporateActionsScreen({
  rows,
  ledger,
  onOpenHolding,
}: {
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onOpenHolding: (id: string) => void;
}) {
  const nameById = useMemo(() => new Map(rows.map((r) => [r.id, r.name])), [rows]);

  const entries = useMemo(() => {
    return sortByTradeDateDesc(
      ledger.filter((e) => e.bucket === "investment" && CORPORATE.has(classifyLedgerBucket(e))),
    );
  }, [ledger]);

  const counts = useMemo(() => {
    const c = { bonus: 0, right: 0, ipo: 0, fpo: 0, auction: 0 };
    for (const e of entries) {
      const k = classifyLedgerBucket(e);
      if (k in c) c[k as keyof typeof c] += 1;
    }
    return c;
  }, [entries]);

  return (
    <section className="space-y-4 pb-24">
      <InvSectionTitle
        title="Corporate Actions"
        subtitle="Bonus, rights, IPO/FPO, and auction lots across your portfolio"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["Bonus", counts.bonus],
            ["Rights", counts.right],
            ["IPO", counts.ipo],
            ["FPO", counts.fpo],
            ["Auction", counts.auction],
          ] as const
        ).map(([label, n]) => (
          <InvGlass key={label} className="px-3 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/45">{label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-white">{n}</p>
          </InvGlass>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No corporate actions yet"
          subtitle="Record bonus, rights, IPO, FPO, or auction lots when you add stock transactions."
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const kind = classifyLedgerBucket(e);
            return (
              <li key={e.id}>
                <InvGlass className="p-3.5" onClick={() => onOpenHolding(e.rowId)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black capitalize text-lime-200">{kind.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-emerald-50">
                        {e.assetLabel || nameById.get(e.rowId) || "Holding"}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-200/55">
                        {e.tradeDate}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black tabular-nums text-white">
                      {e.txType === "bonus_share"
                        ? `${e.quantity.toLocaleString("en-NP")} units`
                        : `${e.quantity.toLocaleString("en-NP")} × ${formatMoney(e.unitPrice, e.currency)}`}
                    </p>
                  </div>
                </InvGlass>
              </li>
            );
          })}
        </ul>
      )}

      <InvGlass className="p-4">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-200/45">Tip</p>
        <p className="mt-1 text-sm font-semibold text-emerald-100/75">
          Open any holding for WACC, buy/sell history, dividends, charts, and analytics — advanced detail stays off the home screen.
        </p>
      </InvGlass>
    </section>
  );
}
