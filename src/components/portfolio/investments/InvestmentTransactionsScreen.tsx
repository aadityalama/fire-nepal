"use client";

import { useMemo, useState } from "react";
import {
  classifyLedgerBucket,
  sortByTradeDateDesc,
} from "@/components/portfolio/investments/investment-card-model";
import { EmptyState, InvGlass, InvSectionTitle, ToneValue, formatInvMoney } from "@/components/portfolio/investments/InvestmentUi";
import type { InvestmentRow, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { cn } from "@/lib/utils";

type TxFilter = "all" | "buy" | "sell" | "dividend" | "bonus" | "right" | "ipo" | "fpo";

const FILTERS: { id: TxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buy", label: "Buys" },
  { id: "sell", label: "Sells" },
  { id: "dividend", label: "Dividends" },
  { id: "bonus", label: "Bonus" },
  { id: "right", label: "Rights" },
  { id: "ipo", label: "IPO" },
  { id: "fpo", label: "FPO" },
];

export function InvestmentTransactionsScreen({
  rows,
  ledger,
  onOpenHolding,
}: {
  rows: InvestmentRow[];
  ledger: readonly PortfolioLedgerEntry[];
  onOpenHolding: (id: string) => void;
}) {
  const [filter, setFilter] = useState<TxFilter>("all");
  const nameById = useMemo(() => new Map(rows.map((r) => [r.id, r.name])), [rows]);

  const entries = useMemo(() => {
    const inv = ledger.filter((e) => e.bucket === "investment");
    const sorted = sortByTradeDateDesc(inv);
    if (filter === "all") return sorted;
    return sorted.filter((e) => classifyLedgerBucket(e) === filter);
  }, [ledger, filter]);

  return (
    <section className="space-y-3 pb-24">
      <InvSectionTitle title="Transactions" subtitle="Every buy, sell, dividend, and corporate lot from your ledger" />
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-wide",
              filter === f.id
                ? "border-emerald-300/50 bg-emerald-400 text-emerald-950"
                : "border-emerald-400/20 bg-black/25 text-emerald-100/70",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState title="No transactions" subtitle="Add a stock trade to populate this timeline." />
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const bucket = classifyLedgerBucket(e);
            return (
              <li key={e.id}>
                <InvGlass className="p-3.5" onClick={() => onOpenHolding(e.rowId)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-emerald-50">
                        {e.assetLabel || nameById.get(e.rowId) || "Holding"}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold capitalize text-emerald-200/55">
                        {e.ledgerAction || bucket.replace(/_/g, " ")} · {e.tradeDate}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black tabular-nums text-white">
                        {e.txType === "cash_dividend"
                          ? formatMoney(e.quantity, e.currency)
                          : `${e.quantity.toLocaleString("en-NP")} × ${formatMoney(e.unitPrice, e.currency)}`}
                      </p>
                      {e.realizedGainNpr != null ? (
                        <ToneValue value={e.realizedGainNpr} className="mt-0.5 block text-xs">
                          {e.realizedGainNpr >= 0 ? "+" : ""}
                          {formatInvMoney(e.realizedGainNpr)}
                        </ToneValue>
                      ) : null}
                    </div>
                  </div>
                </InvGlass>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
