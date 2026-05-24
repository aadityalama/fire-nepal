"use client";

import { BookOpen, ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ledgerRealizedTotalNpr } from "@/components/portfolio/portfolio-ledger";
import { LedgerEntryList } from "@/components/portfolio/ledger-ui/LedgerEntryList";
import {
  entryMatchesMasterView,
  entryMatchesSearch,
  filterLedgerByBucket,
  masterBucketFilterLabel,
  sortLedgerByTradeDate,
  type LedgerScopeView,
} from "@/components/portfolio/ledger-ui/ledger-shared";
import type { PortfolioLedgerBucket, PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";

const BUCKET_FILTERS: (PortfolioLedgerBucket | "all")[] = [
  "all",
  "liquid_cash",
  "investment",
  "retirement",
  "metal",
  "vehicle",
  "real_estate",
  "liability",
];

const VIEW_TABS: { id: LedgerScopeView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "adds", label: "Adds (buy · IPO · rights · bonus)" },
  { id: "sells", label: "Sells" },
  { id: "dividends", label: "Cash dividends" },
];

export function GlobalMasterLedgerPanel({ ledger }: { ledger: readonly PortfolioLedgerEntry[] }) {
  const [open, setOpen] = useState(false);
  const [bucketFilter, setBucketFilter] = useState<PortfolioLedgerBucket | "all">("all");
  const [view, setView] = useState<LedgerScopeView>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");

  const scoped = useMemo(() => {
    if (bucketFilter === "all") return [...ledger];
    return filterLedgerByBucket(ledger, bucketFilter);
  }, [ledger, bucketFilter]);

  const realized = useMemo(() => ledgerRealizedTotalNpr(scoped), [scoped]);

  const filtered = useMemo(() => {
    let rows = scoped.filter((e) => entryMatchesMasterView(e, view, bucketFilter));
    rows = rows.filter((e) => entryMatchesSearch(e, search));
    return sortLedgerByTradeDate(rows, sort);
  }, [scoped, view, bucketFilter, search, sort]);

  return (
    <section className="wealth-glass mt-4 rounded-[1.35rem] p-3.5 sm:mt-6 sm:rounded-[1.5rem] sm:p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-200">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-emerald-50 sm:text-lg">Global master ledger</h2>
            <p className="text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
              Optional combined book across all modules · {ledger.length} entries · realized in scope{" "}
              <span className={realized >= 0 ? "text-lime-300" : "text-rose-300"}>{formatMoney(realized, "NPR")}</span>
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300/45 sm:text-xs">
              Filter by asset type · search · sort by date
            </p>
          </div>
        </div>
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-black/30 text-emerald-200">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-emerald-400/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-200/50">
              <Filter size={12} /> Asset
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BUCKET_FILTERS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBucketFilter(b);
                    setView("all");
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black transition sm:text-[11px] ${
                    bucketFilter === b
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 shadow-md shadow-emerald-500/20"
                      : "border border-emerald-400/20 bg-black/25 text-emerald-100/80 hover:border-emerald-400/35"
                  }`}
                >
                  {masterBucketFilterLabel(b)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-emerald-400/15 bg-black/30 px-2.5 py-2 sm:max-w-md">
              <Search size={14} className="shrink-0 text-emerald-300/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search label, date, notes, type…"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none placeholder:text-emerald-200/35"
              />
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
              className="shrink-0 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-100/85 transition hover:border-emerald-400/35"
            >
              Sort date {sort === "desc" ? "↓" : "↑"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/50">View</span>
            <div className="flex flex-wrap gap-1.5">
              {VIEW_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setView(t.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-black transition sm:text-xs ${
                    view === t.id
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 shadow-md shadow-emerald-500/20"
                      : "border border-emerald-400/20 bg-black/25 text-emerald-100/80 hover:border-emerald-400/35"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-emerald-400/20 bg-black/20 px-3 py-6 text-center text-xs font-bold text-emerald-200/55">
              No transactions match this filter. Try All assets, clear search, or record activity from module
              Transactions strips.
            </p>
          ) : (
            <LedgerEntryList entries={filtered} listClassName="max-h-[min(70vh,520px)] space-y-2 overflow-y-auto pr-0.5" />
          )}
        </div>
      ) : null}
    </section>
  );
}

/** @deprecated Prefer importing GlobalMasterLedgerPanel. */
export const TransactionLedgerPanel = GlobalMasterLedgerPanel;
