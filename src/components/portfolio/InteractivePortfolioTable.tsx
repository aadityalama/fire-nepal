"use client";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { valueInvestmentRow } from "@/components/portfolio/calculations";
import { CurrencySelect } from "@/components/portfolio/CurrencySelect";
import { InvestmentMasterSelector } from "@/components/portfolio/InvestmentMasterSelector";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";
import type { InvestmentKind, InvestmentRow } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { buildHoldingRealtimeMetrics } from "@/services/portfolio/live-holdings-intel";
import type { MarketSnapshot } from "@/types/market";

const KIND_OPTIONS: { value: InvestmentKind; label: string }[] = [
  { value: "nepse", label: "NEPSE" },
  { value: "sip", label: "Open MF" },
  { value: "closed_end_mf", label: "Closed MF" },
  { value: "us_stock", label: "US stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

function kindLabel(kind: InvestmentKind): string {
  return KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

/** Annualized return from cost to current over calendar span; requires ISO purchase date. */
function annualizedCagr(costNpr: number, liveNpr: number, purchaseIso: string | undefined): number | null {
  if (!purchaseIso?.trim() || costNpr <= 0 || liveNpr <= 0) return null;
  const start = new Date(`${purchaseIso.trim()}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const years = (end.getTime() - start.getTime()) / msPerYear;
  if (years < 1 / 365) return null;
  const ratio = liveNpr / costNpr;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return ratio ** (1 / years) - 1;
}

function formatDayPctFromFeed(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

function formatSipIrr(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function formatPctRatio(r: number | null, digits = 1): string {
  if (r == null || !Number.isFinite(r)) return "—";
  const pct = r * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

type SortKey = "name" | "kind" | "cost" | "live" | "pnl" | "cagr" | "alloc" | "day" | "fire";

function sortHeaderHint(column: SortKey, active: SortKey, dir: "asc" | "desc") {
  if (active !== column) return null;
  return dir === "asc" ? (
    <ArrowUpAZ className="ml-0.5 inline h-3 w-3 opacity-80" aria-hidden />
  ) : (
    <ArrowDownAZ className="ml-0.5 inline h-3 w-3 opacity-80" aria-hidden />
  );
}

type EnrichedRow = {
  row: InvestmentRow;
  costNpr: number;
  liveNpr: number;
  pnlNpr: number;
  cagr: number | null;
  allocPct: number;
  dayChangePct: number | null;
  fireImpactPct: number | null;
  sipIrrPct: number | null;
};

export function InteractivePortfolioTable({
  rows,
  krwPerNpr,
  usdPerNpr,
  liveMarket = null,
  netWorthLiveNpr = null,
  onChange,
  onRemove,
}: {
  rows: InvestmentRow[];
  krwPerNpr: number;
  usdPerNpr: number;
  liveMarket?: MarketSnapshot | null;
  netWorthLiveNpr?: number | null;
  onChange: (id: string, patch: Partial<InvestmentRow>) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<Set<InvestmentKind>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("live");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalLive = useMemo(() => {
    return rows.reduce((a, r) => a + valueInvestmentRow(r, krwPerNpr, usdPerNpr, liveMarket).liveValueNpr, 0);
  }, [rows, krwPerNpr, usdPerNpr, liveMarket]);

  const liveMetricsById = useMemo(() => {
    const nw = netWorthLiveNpr != null && netWorthLiveNpr > 0 ? netWorthLiveNpr : Math.max(totalLive, 1e-9);
    const list = buildHoldingRealtimeMetrics(rows, krwPerNpr, usdPerNpr, liveMarket, nw);
    return new Map(list.map((m) => [m.rowId, m]));
  }, [rows, krwPerNpr, usdPerNpr, liveMarket, netWorthLiveNpr, totalLive]);

  const enriched = useMemo((): EnrichedRow[] => {
    return rows.map((row) => {
      const v = valueInvestmentRow(row, krwPerNpr, usdPerNpr, liveMarket);
      const cagr = annualizedCagr(v.costNpr, v.liveValueNpr, row.purchaseDate);
      const allocPct = totalLive > 0 ? (v.liveValueNpr / totalLive) * 100 : 0;
      const m = liveMetricsById.get(row.id);
      return {
        row,
        costNpr: v.costNpr,
        liveNpr: v.liveValueNpr,
        pnlNpr: v.pnlNpr,
        cagr,
        allocPct,
        dayChangePct: m?.dayChangePct ?? null,
        fireImpactPct: m?.fireNetWorthImpactPct ?? null,
        sipIrrPct: m?.sipGrowthIrrPct ?? null,
      };
    });
  }, [rows, krwPerNpr, usdPerNpr, liveMarket, totalLive, liveMetricsById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched;
    if (kindFilter.size > 0) {
      list = list.filter((e) => kindFilter.has(e.row.kind));
    }
    if (q) {
      list = list.filter(
        (e) =>
          e.row.name.toLowerCase().includes(q) ||
          kindLabel(e.row.kind).toLowerCase().includes(q) ||
          e.row.kind.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      const cmp = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);
      switch (sortKey) {
        case "name":
          return dir * a.row.name.localeCompare(b.row.name);
        case "kind":
          return dir * kindLabel(a.row.kind).localeCompare(kindLabel(b.row.kind));
        case "cost":
          return dir * cmp(a.costNpr, b.costNpr);
        case "live":
          return dir * cmp(a.liveNpr, b.liveNpr);
        case "pnl":
          return dir * cmp(a.pnlNpr, b.pnlNpr);
        case "cagr": {
          const ac = a.cagr ?? -Infinity;
          const bc = b.cagr ?? -Infinity;
          return dir * cmp(ac, bc);
        }
        case "alloc":
          return dir * cmp(a.allocPct, b.allocPct);
        case "day": {
          const ad = a.dayChangePct ?? -Infinity;
          const bd = b.dayChangePct ?? -Infinity;
          return dir * cmp(ad, bd);
        }
        case "fire": {
          const af = a.fireImpactPct ?? -Infinity;
          const bf = b.fireImpactPct ?? -Infinity;
          return dir * cmp(af, bf);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [enriched, query, kindFilter, sortKey, sortDir]);

  const toggleKindFilter = useCallback((k: InvestmentKind) => {
    setKindFilter((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setKindFilter(new Set());
    setQuery("");
  }, []);

  const onHeaderSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir(key === "name" || key === "kind" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  const editingRow = editingId ? rows.find((r) => r.id === editingId) : undefined;

  return (
    <section className="wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-emerald-50 sm:text-lg">Position table</h2>
          <p className="mt-0.5 max-w-xl text-xs font-bold leading-snug text-emerald-200/65 sm:text-sm">
            Search, filter by sleeve, sort by category or performance. Live day % and FIRE % need the realtime feed;
            CAGR uses purchase date and NPR cost vs mark. SIP est. uses optional monthly contribution + start date.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/40"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or category…"
            className="wealth-input-text w-full rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold sm:text-sm"
            aria-label="Search positions"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition sm:hidden ${
            kindFilter.size
              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
              : "border-emerald-400/20 bg-black/20 text-emerald-200/90"
          }`}
        >
          <Filter size={16} />
          Filters{kindFilter.size ? ` (${kindFilter.size})` : ""}
        </button>
        <div
          className={`flex flex-wrap gap-1.5 ${filterOpen ? "flex" : "hidden"} sm:flex`}
          role="group"
          aria-label="Category filters"
        >
          <button
            type="button"
            onClick={() => setKindFilter(new Set())}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${
              kindFilter.size === 0
                ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-50"
                : "border-white/10 bg-black/25 text-emerald-200/70 hover:border-emerald-400/30"
            }`}
          >
            All
          </button>
          {KIND_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleKindFilter(value)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${
                kindFilter.has(value)
                  ? "border-cyan-400/45 bg-cyan-500/20 text-cyan-50"
                  : "border-white/10 bg-black/25 text-emerald-200/70 hover:border-cyan-400/25"
              }`}
            >
              {label}
            </button>
          ))}
          {(kindFilter.size > 0 || query.trim()) && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white sm:text-[11px]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 lg:hidden" aria-label="Position cards">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-emerald-400/15 bg-black/20 px-4 py-10 text-center text-sm font-bold text-emerald-200/50">
            No positions match your search or filters.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map(({ row, costNpr, liveNpr, pnlNpr, cagr, allocPct, dayChangePct, fireImpactPct, sipIrrPct }) => {
              const displayName = row.name.trim() || "Untitled";
              const pnlPos = pnlNpr >= 0;
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-emerald-400/15 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-emerald-50">{displayName}</p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-200/70">{kindLabel(row.kind)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${displayName}`}
                        onClick={() => setEditingId(row.id)}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-400/25 text-emerald-200/85 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${displayName}`}
                        onClick={() => setDeleteId(row.id)}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-400/25 text-emerald-300/55 transition hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-200"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs font-bold sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">Cost</dt>
                      <dd className="mt-0.5 tabular-nums text-emerald-200/90">{formatMoney(costNpr, "NPR")}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">Value</dt>
                      <dd className="mt-0.5 tabular-nums text-white">{formatMoney(liveNpr, "NPR")}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">CAGR</dt>
                      <dd
                        className={`mt-0.5 tabular-nums ${cagr == null ? "text-zinc-500" : cagr >= 0 ? "text-lime-300" : "text-rose-300"}`}
                      >
                        {formatPctRatio(cagr)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">P/L</dt>
                      <dd className={`mt-0.5 tabular-nums ${pnlPos ? "text-lime-300" : "text-rose-300"}`}>{formatMoney(pnlNpr, "NPR")}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">Alloc</dt>
                      <dd className="mt-0.5 tabular-nums text-emerald-200/80">{allocPct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">Day %</dt>
                      <dd
                        className={`mt-0.5 tabular-nums ${
                          dayChangePct == null
                            ? "text-zinc-500"
                            : dayChangePct >= 0
                              ? "text-lime-300"
                              : "text-rose-300"
                        }`}
                      >
                        {formatDayPctFromFeed(dayChangePct)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">FIRE % NW</dt>
                      <dd className="mt-0.5 tabular-nums text-cyan-200/85">
                        {fireImpactPct != null ? `${fireImpactPct.toFixed(2)}%` : "—"}
                      </dd>
                    </div>
                    {row.kind === "sip" ? (
                      <div className="col-span-2 sm:col-span-1">
                        <dt className="text-[10px] font-black uppercase tracking-wide text-emerald-200/45">SIP growth est.</dt>
                        <dd className="mt-0.5 tabular-nums text-amber-200/90">{formatSipIrr(sipIrrPct)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-emerald-400/15 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:block">
        <table className="w-full min-w-[1040px] border-collapse text-left text-[11px] sm:min-w-[1180px] sm:text-xs">
          <thead>
            <tr className="border-b border-emerald-400/15 bg-zinc-950/80 text-[10px] font-black uppercase tracking-wide text-emerald-200/55 backdrop-blur-sm">
              <th className="px-2 py-2.5 sm:px-3">
                <button type="button" className="inline-flex items-center hover:text-emerald-100" onClick={() => onHeaderSort("name")}>
                  Asset {sortHeaderHint("name", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 sm:px-3">
                <button type="button" className="inline-flex items-center hover:text-emerald-100" onClick={() => onHeaderSort("kind")}>
                  Category {sortHeaderHint("kind", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("cost")}>
                  Cost (NPR) {sortHeaderHint("cost", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("live")}>
                  Value (NPR) {sortHeaderHint("live", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("cagr")}>
                  CAGR {sortHeaderHint("cagr", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("pnl")}>
                  P/L (NPR) {sortHeaderHint("pnl", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("alloc")}>
                  Alloc % {sortHeaderHint("alloc", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("day")}>
                  Day % {sortHeaderHint("day", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">
                <button type="button" className="inline-flex items-center justify-end hover:text-emerald-100" onClick={() => onHeaderSort("fire")}>
                  FIRE % NW {sortHeaderHint("fire", sortKey, sortDir)}
                </button>
              </th>
              <th className="px-2 py-2.5 text-right sm:px-3">SIP est.</th>
              <th className="px-2 py-2.5 text-right sm:px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-sm font-bold text-emerald-200/50">
                  No positions match your search or filters.
                </td>
              </tr>
            ) : (
              filtered.map(({ row, costNpr, liveNpr, pnlNpr, cagr, allocPct, dayChangePct, fireImpactPct, sipIrrPct }) => {
                const displayName = row.name.trim() || "Untitled";
                const pnlPos = pnlNpr >= 0;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-emerald-400/10 font-semibold text-emerald-100/90 transition last:border-0 hover:bg-emerald-500/[0.06]"
                  >
                    <td className="max-w-[10rem] truncate px-2 py-2.5 font-black text-emerald-50 sm:max-w-[14rem] sm:px-3" title={displayName}>
                      {displayName}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-emerald-200/80 sm:px-3">{kindLabel(row.kind)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-200/90 sm:px-3">{formatMoney(costNpr, "NPR")}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-black text-white sm:px-3">{formatMoney(liveNpr, "NPR")}</td>
                    <td
                      className={`px-2 py-2.5 text-right tabular-nums sm:px-3 ${
                        cagr == null ? "text-zinc-500" : cagr >= 0 ? "text-lime-300" : "text-rose-300"
                      }`}
                    >
                      {formatPctRatio(cagr)}
                    </td>
                    <td className={`px-2 py-2.5 text-right tabular-nums font-black sm:px-3 ${pnlPos ? "text-lime-300" : "text-rose-300"}`}>
                      {formatMoney(pnlNpr, "NPR")}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-200/80 sm:px-3">{allocPct.toFixed(1)}%</td>
                    <td
                      className={`px-2 py-2.5 text-right tabular-nums sm:px-3 ${
                        dayChangePct == null ? "text-zinc-500" : dayChangePct >= 0 ? "text-lime-300" : "text-rose-300"
                      }`}
                    >
                      {formatDayPctFromFeed(dayChangePct)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-cyan-200/85 sm:px-3">
                      {fireImpactPct != null ? `${fireImpactPct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-amber-200/85 sm:px-3">
                      {row.kind === "sip" ? formatSipIrr(sipIrrPct) : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right sm:px-3">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${displayName}`}
                          onClick={() => setEditingId(row.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/20 text-emerald-200/80 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${displayName}`}
                          onClick={() => setDeleteId(row.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/20 text-emerald-300/50 transition hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingRow ? (
        <AssetEditorModal
          key={editingRow.id}
          row={editingRow}
          usdPerNpr={usdPerNpr}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            onChange(editingRow.id, patch);
            setEditingId(null);
          }}
        />
      ) : null}

      {deleteId ? (
        <ConfirmDeleteModal
          name={rows.find((r) => r.id === deleteId)?.name?.trim() || "this asset"}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            onRemove(deleteId);
            setDeleteId(null);
            if (editingId === deleteId) setEditingId(null);
          }}
        />
      ) : null}
    </section>
  );
}

function AssetEditorModal({
  row,
  usdPerNpr,
  onClose,
  onSave,
}: {
  row: InvestmentRow;
  usdPerNpr: number;
  onClose: () => void;
  onSave: (patch: Partial<InvestmentRow>) => void;
}) {
  const [kind, setKind] = useState(row.kind);
  const [name, setName] = useState(row.name);
  const [currency, setCurrency] = useState(row.currency);
  const [purchaseDate, setPurchaseDate] = useState<string | undefined>(row.purchaseDate);
  const [qtyStr, setQtyStr] = useState(row.quantity != null ? String(row.quantity) : "");
  const [buyStr, setBuyStr] = useState(row.buyPrice != null ? String(row.buyPrice) : "");
  const [instrumentKey, setInstrumentKey] = useState(row.instrumentKey);
  const [sipMonthlyStr, setSipMonthlyStr] = useState(
    row.sipMonthlyContributionNpr != null ? String(row.sipMonthlyContributionNpr) : "",
  );
  const [sipStartedAt, setSipStartedAt] = useState<string | undefined>(row.sipStartedAt);

  const submit = () => {
    const quantity = qtyStr.trim() === "" ? undefined : Number(qtyStr.replace(/,/g, ""));
    const buyPrice = buyStr.trim() === "" ? undefined : Number(buyStr.replace(/,/g, ""));
    if (quantity != null && (!Number.isFinite(quantity) || quantity < 0)) return;
    if (buyPrice != null && (!Number.isFinite(buyPrice) || buyPrice < 0)) return;

    const sipMonthlyContributionNpr =
      kind === "sip" && sipMonthlyStr.trim() !== ""
        ? Number(sipMonthlyStr.replace(/,/g, ""))
        : undefined;
    if (kind === "sip" && sipMonthlyStr.trim() !== "" && (!Number.isFinite(sipMonthlyContributionNpr!) || sipMonthlyContributionNpr! < 0)) {
      return;
    }

    const patch: Partial<InvestmentRow> = {
      kind,
      name,
      currency,
      purchaseDate,
      quantity,
      buyPrice,
    };
    if (kind === "sip") {
      patch.sipMonthlyContributionNpr =
        sipMonthlyContributionNpr != null && Number.isFinite(sipMonthlyContributionNpr) && sipMonthlyContributionNpr >= 0
          ? sipMonthlyContributionNpr
          : undefined;
      patch.sipStartedAt = sipStartedAt?.trim() || undefined;
    } else {
      patch.sipMonthlyContributionNpr = undefined;
      patch.sipStartedAt = undefined;
    }
    if (kind !== "crypto") {
      patch.instrumentKey = instrumentKey;
    } else {
      patch.instrumentKey = undefined;
    }
    onSave(patch);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-editor-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-emerald-400/20 bg-gradient-to-b from-zinc-950 via-zinc-950 to-emerald-950/40 p-4 shadow-2xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 id="asset-editor-title" className="text-lg font-black text-emerald-50">
            Edit asset
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-emerald-300/60 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Category</span>
            <select
              value={kind}
              onChange={(e) => {
                const k = e.target.value as InvestmentKind;
                setKind(k);
                setInstrumentKey(undefined);
                if (k !== "crypto") setName("");
              }}
              className="wealth-input w-full px-2 py-2 text-sm font-black"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>

          {kind === "crypto" ? (
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Asset name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="wealth-input-text w-full px-3 py-2 text-sm font-bold"
                placeholder="e.g. BTC"
              />
            </label>
          ) : (
            <div>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Instrument</span>
              <InvestmentMasterSelector
                kind={kind}
                instrumentKey={instrumentKey}
                name={name}
                usdPerNpr={usdPerNpr}
                onApplyInstrument={(patch) => {
                  if (patch.name != null) setName(patch.name);
                  if (patch.instrumentKey !== undefined) setInstrumentKey(patch.instrumentKey);
                  if (patch.kind != null) setKind(patch.kind);
                }}
              />
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Display currency</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>

          <PortfolioIsoDateField label="Purchase date (for CAGR)" value={purchaseDate} onChange={setPurchaseDate} />

          {kind === "sip" ? (
            <div className="grid gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-cyan-200/65">
                  SIP monthly contribution (NPR)
                </span>
                <input
                  value={sipMonthlyStr}
                  onChange={(e) => setSipMonthlyStr(e.target.value)}
                  inputMode="decimal"
                  className="wealth-input-text w-full px-3 py-2 text-sm font-bold tabular-nums"
                  placeholder="e.g. 10000"
                />
              </label>
              <PortfolioIsoDateField label="SIP start date (optional)" value={sipStartedAt} onChange={setSipStartedAt} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Quantity held</span>
              <input
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                inputMode="decimal"
                className="wealth-input-text w-full px-3 py-2 text-sm font-bold tabular-nums"
                placeholder="0"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Avg buy (per unit)</span>
              <input
                value={buyStr}
                onChange={(e) => setBuyStr(e.target.value)}
                inputMode="decimal"
                className="wealth-input-text w-full px-3 py-2 text-sm font-bold tabular-nums"
                placeholder="0"
              />
            </label>
          </div>

          <p className="text-[11px] font-semibold leading-relaxed text-emerald-200/45">
            Totals match the summary cards: NEPSE / Nepal MF rows use the live directory when linked (or search “Live”
            hits). Other sleeves use Yahoo / CoinGecko where mapped. SIP growth estimate uses your monthly contribution vs
            current value (rough IRR, not tax advice).
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-emerald-400/10 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-emerald-200/80 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-xl border border-emerald-400/35 bg-emerald-500/20 px-4 py-2.5 text-sm font-black text-emerald-50 transition hover:bg-emerald-500/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="w-full max-w-sm rounded-2xl border border-rose-400/25 bg-zinc-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-black text-white">Remove asset?</p>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-200/60">
          <span className="text-emerald-100/90">{name}</span> will be deleted from your portfolio. This does not remove
          ledger history until you clean the ledger separately.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-emerald-200/80 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
