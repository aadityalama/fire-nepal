"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CashflowDashboardState, IncomeEntry } from "@/components/cashflow/types";
import {
  CashflowIncomeFormSheet,
  defaultIncomeForm,
  incomeFormFromEntry,
  parseIncomeForm,
  type IncomeFormState,
} from "@/components/cashflow-workspace/CashflowIncomeFormSheet";
import {
  buildCashflowInsights,
  formatShortDate,
  getIncomeEntriesForMonth,
  heroStatusMessage,
  monthlyComparisonLabel,
  sortIncomeEntriesByDateDesc,
  type CashflowWorkspaceInsight,
} from "@/components/cashflow-workspace/cashflow-workspace-utils";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";
import {
  buildIncomeHistoryChartData,
  hasIncomeChartData,
  type CashflowLiveMetrics,
} from "@/lib/cashflow/cashflow-live-metrics";
import {
  CASHFLOW_INCOME_TYPES,
  getFrequencyLabel,
  getIncomeTypeMeta,
  type CashflowIncomeTypeId,
} from "@/lib/cashflow/income-types";
import { formatMoney } from "@/lib/expense-utils";

const CashflowIncomeTrendChart = dynamic(
  () => import("@/components/cashflow-workspace/CashflowIncomeTrendChart").then((mod) => mod.CashflowIncomeTrendChart),
  { ssr: false, loading: () => null },
);

type CashflowWorkspaceDashboardProps = {
  state: CashflowDashboardState;
  live: CashflowLiveMetrics;
  hydrated: boolean;
  onAddIncome: (entry: Omit<IncomeEntry, "id" | "createdAt">) => void;
  onUpdateIncome: (id: string, patch: Partial<Omit<IncomeEntry, "id" | "createdAt">>) => void;
  onDeleteIncome: (id: string) => void;
};

const glassCardClassName = "rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.65rem]";

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function SavingsRateRing({ pct }: { pct: number | null }) {
  const resolved = pct === null ? 0 : clampPct(pct);
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (resolved / 100) * c;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="cashflow-savings-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#cashflow-savings-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-black leading-none text-white">{pct === null ? "—" : `${resolved}%`}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Savings Rate</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone = "emerald" }: { label: string; value: string; tone?: "emerald" | "lime" | "rose" | "cyan" }) {
  const toneClass =
    tone === "rose" ? "text-rose-200" : tone === "lime" ? "text-lime-200" : tone === "cyan" ? "text-cyan-200" : "text-emerald-100";
  return (
    <div className={`${glassCardClassName} min-h-[88px] p-3.5`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className={`mt-2 truncate text-xl font-black leading-none tracking-[-0.05em] tabular-nums sm:text-2xl ${toneClass}`}>{value}</p>
    </div>
  );
}

function IncomeSourceCard({
  entry,
  index,
  onEdit,
  onDelete,
}: {
  entry: IncomeEntry;
  index: number;
  onEdit: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
}) {
  const typeMeta = getIncomeTypeMeta(entry.incomeType);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.28, delay: index * 0.03 }}
      className={`${glassCardClassName} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-xl ring-1 ring-white/10">{typeMeta.emoji}</span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{entry.name}</h3>
            <p className="mt-0.5 text-xs font-bold text-emerald-100/55">{typeMeta.label}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`Actions for ${entry.name}`}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-emerald-100/70 transition hover:bg-white/[0.08] active:scale-95"
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen ? (
            <>
              <button type="button" className="fixed inset-0 z-10" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 min-w-[9.5rem] overflow-hidden rounded-2xl border border-white/10 bg-[#071512]/95 shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(entry);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-emerald-50 hover:bg-white/[0.06]"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(entry.id);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-200 hover:bg-rose-500/10"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/8 bg-black/15 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Amount</p>
          <p className="mt-1 text-sm font-black tabular-nums text-lime-100">{formatNpr(entry.amount)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Frequency</p>
          <p className="mt-1 text-xs font-black text-emerald-50">{getFrequencyLabel(entry.frequency ?? (entry.repeatMonthly ? "monthly" : "once"))}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/15 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Last received</p>
          <p className="mt-1 text-xs font-black text-emerald-50">{formatShortDate(entry.date)}</p>
        </div>
      </div>
    </motion.article>
  );
}

function InsightRow({ insight }: { insight: CashflowWorkspaceInsight }) {
  const toneClass =
    insight.tone === "positive"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-50"
      : insight.tone === "warning"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-50"
        : insight.tone === "info"
          ? "border-sky-300/25 bg-sky-500/10 text-sky-50"
          : "border-white/10 bg-white/[0.04] text-emerald-50";
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ${toneClass}`}>{insight.message}</div>;
}

export function CashflowWorkspaceDashboard({
  state,
  live,
  hydrated,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
}: CashflowWorkspaceDashboardProps) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [chartsReady, setChartsReady] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomeFormState>(() => defaultIncomeForm(todayIso));
  const [deleteTarget, setDeleteTarget] = useState<IncomeEntry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CashflowIncomeTypeId | "all">("all");

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 480);
    return () => window.clearTimeout(id);
  }, []);

  const monthEntries = useMemo(() => getIncomeEntriesForMonth(state), [state]);
  const allEntries = useMemo(() => sortIncomeEntriesByDateDesc(state.incomeEntries ?? []), [state.incomeEntries]);
  const incomeChartData = useMemo(() => buildIncomeHistoryChartData(state), [state]);
  const showChart = hasIncomeChartData(incomeChartData);
  const insights = useMemo(() => buildCashflowInsights({ live, state }), [live, state]);

  const filteredRecent = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (typeFilter !== "all" && entry.incomeType !== typeFilter) return false;
      if (!q) return true;
      return entry.name.toLowerCase().includes(q) || getIncomeTypeMeta(entry.incomeType).label.toLowerCase().includes(q);
    });
  }, [allEntries, search, typeFilter]);

  const groupedMonthEntries = useMemo(() => {
    const map = new Map<CashflowIncomeTypeId, IncomeEntry[]>();
    for (const type of CASHFLOW_INCOME_TYPES) map.set(type.id, []);
    for (const entry of monthEntries) {
      const list = map.get(entry.incomeType) ?? [];
      list.push(entry);
      map.set(entry.incomeType, list);
    }
    return CASHFLOW_INCOME_TYPES.filter((type) => (map.get(type.id)?.length ?? 0) > 0).map((type) => ({
      type,
      entries: map.get(type.id) ?? [],
    }));
  }, [monthEntries]);

  const comparisonUp = live.netCashflowChangePct !== null && live.netCashflowChangePct >= 0;

  function openAddForm() {
    setEditingId(null);
    setForm(defaultIncomeForm(todayIso));
    setFormOpen(true);
  }

  function openEditForm(entry: IncomeEntry) {
    setEditingId(entry.id);
    setForm(incomeFormFromEntry(entry));
    setFormOpen(true);
  }

  function handleSave() {
    const parsed = parseIncomeForm(form);
    if (!parsed) {
      toast.error("Enter a valid income name and amount.");
      return;
    }
    if (editingId) {
      onUpdateIncome(editingId, parsed);
      toast.success("Income updated.");
    } else {
      onAddIncome(parsed);
      toast.success("Income saved.");
    }
    setFormOpen(false);
    setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    onDeleteIncome(deleteTarget.id);
    toast.success("Income deleted.");
    setDeleteTarget(null);
  }

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#020806] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
        <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-5 lg:max-w-6xl lg:gap-6">
        <header>
          <Link
            href="/finance"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl transition active:scale-95"
          >
            <ArrowLeft size={15} /> Finance
          </Link>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem]">Cashflow</h1>
          <p className="mt-1 text-sm font-semibold text-emerald-100/58">Income Center · powered by Income, Expense &amp; Savings</p>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/22 via-emerald-950/88 to-[#03110d] p-5 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.55)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(163,230,53,0.16),transparent_36%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Net Cashflow</p>
              <p className="mt-2 text-[2.15rem] font-black leading-none tracking-[-0.06em] text-white sm:text-[2.5rem]">
                {live.netCashflow >= 0 ? "+" : ""}
                {formatMoney(live.netCashflow, "NPR")}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-emerald-100">
                {comparisonUp ? <TrendingUp size={14} className="text-lime-300" /> : <TrendingDown size={14} className="text-amber-300" />}
                {monthlyComparisonLabel(live)}
              </div>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-emerald-100/70">{heroStatusMessage(live)}</p>
            </div>
            <SavingsRateRing pct={live.savingsRatePct} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          <KpiCard label="Total Income" value={formatNpr(live.monthlyIncome)} tone="lime" />
          <KpiCard label="Total Expenses" value={formatNpr(live.monthlyExpense)} tone="rose" />
          <KpiCard label="Total Savings" value={formatNpr(live.totalSavings)} tone="emerald" />
          <KpiCard label="Remaining Cash" value={formatNpr(live.remainingCash)} tone="cyan" />
        </section>

        <section>
          <div className="mb-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Income Sources</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100/55">This month</p>
          </div>
          {groupedMonthEntries.length === 0 ? (
            <div className={`${glassCardClassName} border-dashed px-4 py-10 text-center`}>
              <p className="text-sm font-black text-white">No income sources yet</p>
              <p className="mt-1 text-xs font-semibold text-emerald-100/50">Tap + to add your first income.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedMonthEntries.map(({ type, entries }) => (
                <div key={type.id}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    {type.emoji} {type.label}
                  </p>
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {entries.map((entry, index) => (
                        <IncomeSourceCard
                          key={entry.id}
                          entry={entry}
                          index={index}
                          onEdit={openEditForm}
                          onDelete={(id) => {
                            const target = entries.find((item) => item.id === id);
                            if (target) setDeleteTarget(target);
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${glassCardClassName} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Recent Income</p>
            </div>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-100/40" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search income..."
                className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/20 py-2 pl-10 pr-4 text-sm font-semibold text-white outline-none placeholder:text-emerald-100/35"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                  typeFilter === "all" ? "bg-lime-300/20 text-lime-100 ring-1 ring-lime-300/40" : "bg-white/[0.05] text-emerald-100/60"
                }`}
              >
                All
              </button>
              {CASHFLOW_INCOME_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTypeFilter(type.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                    typeFilter === type.id ? "bg-lime-300/20 text-lime-100 ring-1 ring-lime-300/40" : "bg-white/[0.05] text-emerald-100/60"
                  }`}
                >
                  {type.emoji} {type.label}
                </button>
              ))}
            </div>
          </div>
          {filteredRecent.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-100/50">No matching income records.</p>
          ) : (
            <div className="space-y-2.5">
              {filteredRecent.map((entry) => {
                const typeMeta = getIncomeTypeMeta(entry.incomeType);
                return (
                  <div
                    key={`recent-${entry.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-lg">{typeMeta.emoji}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{entry.name}</p>
                        <p className="text-xs font-semibold text-emerald-100/50">
                          {formatShortDate(entry.date)} · {getFrequencyLabel(entry.frequency ?? "once")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className="mr-1 text-sm font-black tabular-nums text-lime-100">{formatNpr(entry.amount)}</p>
                      <button type="button" aria-label="Edit" onClick={() => openEditForm(entry)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-emerald-100">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => setDeleteTarget(entry)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-rose-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showChart ? (
          <section className={`${glassCardClassName} p-4 sm:p-5`}>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Monthly Income Trend</p>
            <CashflowIncomeTrendChart data={incomeChartData} ready={chartsReady && hydrated} />
          </section>
        ) : null}

        <section className={`${glassCardClassName} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
              <Bot size={18} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">AI Insight</p>
            <Sparkles className="ml-auto h-4 w-4 text-lime-300" />
          </div>
          <div className="space-y-2.5">
            {insights.map((insight) => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={openAddForm}
        aria-label="Add Income"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-[0_18px_50px_-12px_rgba(16,185,129,0.75)] transition active:scale-95 sm:right-6"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <CashflowIncomeFormSheet
        open={formOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSave={handleSave}
      />

      <AnimatePresence>
        {deleteTarget ? (
          <>
            <motion.button
              type="button"
              aria-label="Close delete dialog"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 mx-auto max-w-lg rounded-[1.5rem] border border-white/10 bg-[#071512]/95 p-5 shadow-2xl backdrop-blur-2xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
            >
              <p className="text-lg font-black text-white">Delete income?</p>
              <p className="mt-2 text-sm font-semibold text-emerald-100/60">
                Remove {deleteTarget.name} ({formatNpr(deleteTarget.amount)}).
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-emerald-50">
                  Cancel
                </button>
                <button type="button" onClick={confirmDelete} className="min-h-[48px] rounded-2xl bg-rose-500 text-sm font-black text-white">
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
