"use client";

import { BookOpen, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ledgerRealizedTotalNpr } from "@/components/portfolio/portfolio-ledger";
import type { PortfolioLedgerBucket, PortfolioLedgerEntry, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { LedgerEntryList } from "@/components/portfolio/ledger-ui/LedgerEntryList";
import {
  entryMatchesScopeView,
  entryMatchesSearch,
  filterLedgerByBucket,
  sortLedgerByTradeDate,
  type LedgerScopeView,
} from "@/components/portfolio/ledger-ui/ledger-shared";

function tabsForBucket(bucket: PortfolioLedgerBucket): { id: LedgerScopeView; label: string }[] {
  if (bucket === "investment") {
    return [
      { id: "all", label: "All" },
      { id: "adds", label: "Adds · IPO · rights · bonus" },
      { id: "sells", label: "Sells" },
      { id: "dividends", label: "Dividends" },
    ];
  }
  if (bucket === "retirement") {
    return [{ id: "all", label: "All" }];
  }
  if (bucket === "liquid_cash") {
    return [
      { id: "all", label: "All" },
      { id: "adds", label: "Adds" },
      { id: "sells", label: "Withdrawals" },
    ];
  }
  return [
    { id: "all", label: "All" },
    { id: "adds", label: "Buys" },
    { id: "sells", label: "Sells" },
  ];
}

export function ModuleLedgerCard({
  title,
  subtitle,
  bucket,
  ledger,
  defaultOpen = false,
  ledgerMutate,
}: {
  title: string;
  subtitle: string;
  bucket: PortfolioLedgerBucket;
  ledger: readonly PortfolioLedgerEntry[];
  defaultOpen?: boolean;
  /** When set, metal ledger rows can delete attachments in-place. */
  ledgerMutate?: (fn: (s: WealthPortfolioStateV2) => WealthPortfolioStateV2 | null) => boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState<LedgerScopeView>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");

  const onPatchLedgerEntry = useCallback(
    (entryId: string, patch: (e: PortfolioLedgerEntry) => PortfolioLedgerEntry) => {
      if (!ledgerMutate || bucket !== "metal") return;
      ledgerMutate((s) => {
        const idx = s.ledger.findIndex((x) => x.id === entryId);
        if (idx < 0) return null;
        const ledgerNext = [...s.ledger];
        ledgerNext[idx] = patch(ledgerNext[idx]!);
        return { ...s, ledger: ledgerNext };
      });
    },
    [ledgerMutate, bucket],
  );

  const tabs = useMemo(() => tabsForBucket(bucket), [bucket]);

  const scoped = useMemo(() => filterLedgerByBucket(ledger, bucket), [ledger, bucket]);

  const realized = useMemo(() => ledgerRealizedTotalNpr(scoped), [scoped]);

  const filtered = useMemo(() => {
    let rows = scoped.filter((e) => entryMatchesScopeView(e, view));
    rows = rows.filter((e) => entryMatchesSearch(e, search));
    return sortLedgerByTradeDate(rows, sort);
  }, [scoped, view, search, sort]);

  return (
    <div className="mt-3 rounded-xl border border-emerald-400/12 bg-black/25 p-3 shadow-inner ring-1 ring-white/[0.03] sm:mt-4 sm:p-3.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-400/12 text-sky-200">
            <BookOpen size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white sm:text-base">{title}</h3>
            <p className="text-[11px] font-semibold leading-snug text-gray-100 sm:text-xs">{subtitle}</p>
            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-gray-100 sm:text-xs">
              {scoped.length} tx · realized{" "}
              <span className={realized >= 0 ? "text-lime-300" : "text-rose-300"}>{formatMoney(realized, "NPR")}</span>
            </p>
          </div>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-400/15 bg-black/30 text-gray-100">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-emerald-400/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-emerald-400/15 bg-black/30 px-2 py-1.5 sm:max-w-[16rem]">
              <Search size={13} className="shrink-0 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
              className="shrink-0 rounded-full border border-emerald-400/20 bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-100 transition hover:border-emerald-400/35"
            >
              Date {sort === "desc" ? "↓" : "↑"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-black transition sm:text-[11px] ${
                  view === t.id
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 shadow-sm shadow-emerald-500/15"
                    : "border border-emerald-400/18 bg-black/25 text-gray-100 hover:border-emerald-400/32"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-emerald-400/18 bg-black/20 px-3 py-5 text-center text-[11px] font-semibold text-gray-100">
              {scoped.length === 0
                ? "No transactions in this book yet. Record activity from Transactions above."
                : "No rows match this view or search."}
            </p>
          ) : (
            <LedgerEntryList
              entries={filtered}
              onPatchLedgerEntry={bucket === "metal" ? onPatchLedgerEntry : undefined}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
