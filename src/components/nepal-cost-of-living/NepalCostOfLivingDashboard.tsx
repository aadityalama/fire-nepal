"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  Car,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
  Pencil,
  Save,
  Shirt,
  Sparkles,
  Tv,
  Utensils,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKrwInteger, formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";
import { DEFAULT_NEPAL_COST_CITIES } from "@/lib/nepal-cost-data";
import {
  COL_LIFESTYLE_OPTIONS,
  COL_PLAN_STORAGE_KEY,
  computeColSnapshot,
  defaultColPlan,
  provinceForCity,
  sanitizeColPlan,
  type ColExpenseCategoryId,
  type ColLifestyleId,
  type ColPlanState,
} from "@/lib/nepal-col-dashboard";
import { FALLBACK_KRW_PER_NPR, nprToKrw } from "@/lib/exchange-rate";

const EXPENSE_ICONS: Record<ColExpenseCategoryId, LucideIcon> = {
  home: Home,
  food: Utensils,
  transportation: Car,
  utilities: Zap,
  internet: Wifi,
  healthcare: HeartPulse,
  education: GraduationCap,
  entertainment: Tv,
  clothing: Shirt,
  miscellaneous: Wrench,
};

function AnimatedNpr({ value, className }: { value: number; className?: string }) {
  const display = useCountUpNumber(value, { durationMs: 900 });
  return <span className={className}>{formatNprInteger(Math.round(display))}</span>;
}

function GlassCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[1.35rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-950/70 via-[#062018]/85 to-[#021510]/90 p-4 shadow-[0_20px_60px_-28px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/70">{label}</span>
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/8 text-lg font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
        >
          −
        </button>
        <span className="text-xl font-black tabular-nums text-white">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/8 text-lg font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

function EditPlanSheet({
  open,
  plan,
  onClose,
  onSave,
}: {
  open: boolean;
  plan: ColPlanState;
  onClose: () => void;
  onSave: (next: ColPlanState) => void;
}) {
  const [draft, setDraft] = useState(plan);

  useEffect(() => {
    if (open) setDraft(plan);
  }, [open, plan]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close edit plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-[1.75rem] border border-emerald-400/20 bg-gradient-to-b from-[#083026] to-[#021510] p-5 pb-8 shadow-[0_-20px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Edit Plan</h2>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/8 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/70">City</span>
                <select
                  value={draft.cityId}
                  onChange={(event) => {
                    const cityId = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      cityId,
                      province: provinceForCity(cityId),
                    }));
                  }}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none"
                >
                  {DEFAULT_NEPAL_COST_CITIES.map((city) => (
                    <option key={city.id} value={city.id} className="bg-[#062018]">
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/70">Province</span>
                <select
                  value={draft.province}
                  onChange={(event) => setDraft((current) => ({ ...current, province: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none"
                >
                  {[...new Set(DEFAULT_NEPAL_COST_CITIES.map((city) => provinceForCity(city.id)))].map((province) => (
                    <option key={province} value={province} className="bg-[#062018]">
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-3">
                <Stepper
                  label="Adults"
                  value={draft.family.adults}
                  min={1}
                  max={6}
                  onChange={(adults) => setDraft((current) => ({ ...current, family: { ...current.family, adults } }))}
                />
                <Stepper
                  label="Children"
                  value={draft.family.children}
                  min={0}
                  max={6}
                  onChange={(children) => setDraft((current) => ({ ...current, family: { ...current.family, children } }))}
                />
                <Stepper
                  label="Parents"
                  value={draft.family.parents}
                  min={0}
                  max={4}
                  onChange={(parents) => setDraft((current) => ({ ...current, family: { ...current.family, parents } }))}
                />
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/70">
                  Korea monthly spend (NPR model)
                </span>
                <input
                  type="number"
                  min={40_000}
                  max={800_000}
                  step={1000}
                  value={draft.monthlyKoreaSpendNpr}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      monthlyKoreaSpendNpr: Number(event.target.value),
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, lifestyle: option.id }))}
                    className={`rounded-2xl border px-3 py-3 text-left text-sm font-black transition active:scale-[0.98] ${
                      draft.lifestyle === option.id
                        ? "border-emerald-300/50 bg-emerald-500/20 text-emerald-50"
                        : "border-white/10 bg-white/5 text-emerald-100/80 hover:border-emerald-400/30"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onSave(draft);
                  onClose();
                }}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 py-3.5 text-sm font-black text-emerald-950 shadow-[0_12px_40px_-12px_rgba(52,211,153,0.65)] transition hover:brightness-105 active:scale-[0.99]"
              >
                Apply changes
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function CompareCitiesSheet({
  open,
  onClose,
  cities,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  cities: Array<{ id: string; label: string; total: number }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close compare cities"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-[1.75rem] border border-emerald-400/20 bg-gradient-to-b from-[#083026] to-[#021510] p-5 pb-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Compare Cities</h2>
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/8 text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelect(city.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] ${
                    selectedId === city.id
                      ? "border-emerald-300/50 bg-emerald-500/15"
                      : "border-white/10 bg-white/5 hover:border-emerald-400/25"
                  }`}
                >
                  <span className="text-sm font-black text-white">{city.label}</span>
                  <span className="text-sm font-black tabular-nums text-emerald-200">{formatNprInteger(city.total)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function NepalCostOfLivingDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [plan, setPlan, hydrated] = useLocalStorageJsonState({
    storageKey: COL_PLAN_STORAGE_KEY,
    getDefault: defaultColPlan,
    sanitize: sanitizeColPlan,
  });
  const [chartsReady, setChartsReady] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [krwPerNpr] = useState(FALLBACK_KRW_PER_NPR);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 380);
    return () => window.clearTimeout(timer);
  }, []);

  const snapshot = useMemo(() => computeColSnapshot(plan), [plan]);
  const animatedSavings = useCountUpNumber(snapshot.monthlySavings, { durationMs: 900 });
  const animatedSavingsPct = useCountUpNumber(snapshot.savingsPct, { durationMs: 900 });
  const animatedReadiness = useCountUpNumber(snapshot.readiness, { durationMs: 1100 });

  const compareMax = Math.max(snapshot.koreaSpend, snapshot.total, 1);
  const koreaBarPct = (snapshot.koreaSpend / compareMax) * 100;
  const nepalBarPct = (snapshot.total / compareMax) * 100;

  const patchPlan = (patch: Partial<ColPlanState>) => setPlan((current) => ({ ...current, ...patch }));

  const handleSavePlan = () => {
    setPlan(plan);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2200);
  };

  const handleExportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("FIRE Nepal — Cost of Living Plan", 48, 56);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`City: ${snapshot.location.label}`, 48, 84);
    doc.text(`Province: ${plan.province}`, 48, 100);
    doc.text(`Lifestyle: ${snapshot.lifestyle.label}`, 48, 116);
    doc.text(`Monthly total: ${formatNprInteger(snapshot.total)}`, 48, 140);
    doc.text(`Monthly savings vs Korea model: ${formatNprInteger(snapshot.monthlySavings)}`, 48, 156);
    let y = 188;
    doc.setFont("helvetica", "bold");
    doc.text("Expense breakdown", 48, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    snapshot.items.forEach((item) => {
      doc.text(`${item.label}: ${formatNprInteger(item.amount)} (${item.pct.toFixed(1)}%)`, 48, y);
      y += 16;
    });
    doc.save(`fire-nepal-col-${snapshot.location.label.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const shellBg = light
    ? "bg-gradient-to-b from-emerald-50 via-white to-emerald-100/80"
    : "bg-[#010d0a]";

  const frameBorder = light ? "border-emerald-200/80 shadow-[0_40px_120px_-40px_rgba(5,46,22,0.25)]" : "border-emerald-500/15 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]";

  return (
    <div className={`min-h-[100dvh] ${shellBg}`}>
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col border-x border-transparent lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:overflow-hidden lg:rounded-[2rem] lg:border ${frameBorder}`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-emerald-500/10 bg-[#021510]/92 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 text-emerald-100 transition hover:bg-white/10 active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="FIRE Nepal" width={28} height={28} className="rounded-lg" />
              <span className="text-sm font-black tracking-tight text-white">FIRE Nepal</span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 text-emerald-100 transition hover:bg-white/10 active:scale-95"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-5">
          {/* Title row */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[1.65rem] font-black leading-tight tracking-[-0.03em] text-white">
                Nepal Cost of Living <span aria-hidden>🇳🇵</span>
              </h1>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-100/70">
                Plan your life in Nepal before you return.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-500/20 active:scale-95"
            >
              <Pencil size={14} />
              Edit Plan
            </button>
          </motion.div>

          {/* Hero card */}
          <GlassCard className="mb-4 p-4 sm:p-5" delay={0.04}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-300/30 bg-gradient-to-br from-emerald-400/30 via-teal-500/20 to-emerald-950 shadow-[0_0_40px_-8px_rgba(52,211,153,0.55)]">
                  <Building2 size={26} className="text-emerald-100" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/65">Selected City</p>
                  <p className="truncate text-xl font-black text-white">{snapshot.location.label}</p>
                  <label className="mt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/55">Province</span>
                    <select
                      value={plan.province}
                      onChange={(event) => patchPlan({ province: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5 text-xs font-bold text-emerald-50 outline-none"
                    >
                      {[...new Set(DEFAULT_NEPAL_COST_CITIES.map((city) => provinceForCity(city.id)))].map((province) => (
                        <option key={province} value={province} className="bg-[#062018]">
                          {province}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/65">Monthly Estimated Cost</p>
                <AnimatedNpr value={snapshot.total} className="mt-1 block text-2xl font-black tabular-nums tracking-tight text-white" />
                <p className="mt-1 text-[11px] font-bold text-emerald-200/70">
                  {formatKrwInteger(nprToKrw(snapshot.total, krwPerNpr))}
                </p>
                <span className="mt-2 inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                  {snapshot.lifestyle.label} Lifestyle
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Second row */}
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <GlassCard className="p-3" delay={0.08}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/60">Family</p>
              <div className="mt-2 space-y-1 text-[11px] font-bold text-emerald-50/90">
                <p>Adults {plan.family.adults}</p>
                <p>Children {plan.family.children}</p>
                <p>Parents {plan.family.parents}</p>
              </div>
            </GlassCard>
            <GlassCard className="p-3" delay={0.1}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/60">Lifestyle</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patchPlan({ lifestyle: option.id as ColLifestyleId })}
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide transition ${
                      plan.lifestyle === option.id
                        ? "bg-emerald-400 text-emerald-950"
                        : "bg-white/8 text-emerald-100/70 hover:bg-white/12"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <span
                    key={option.id}
                    className={`h-1.5 flex-1 rounded-full ${plan.lifestyle === option.id ? "bg-emerald-400" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-3" delay={0.12}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/60">Monthly Savings</p>
              <p className="mt-2 text-lg font-black tabular-nums text-emerald-300">{formatNprInteger(Math.round(animatedSavings))}</p>
              <p className="mt-1 text-[11px] font-bold text-emerald-100/70">{animatedSavingsPct.toFixed(1)}%</p>
            </GlassCard>
          </div>

          {/* Expense grid */}
          <section className="mb-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-emerald-200/75">Monthly Expenses</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {snapshot.items.map((item, index) => {
                const Icon = EXPENSE_ICONS[item.id];
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 + index * 0.03 }}
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-[1.1rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-950/55 to-[#041610]/90 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-200">
                        <Icon size={15} />
                      </span>
                      <span className="text-[10px] font-black text-emerald-200/70">{item.pct.toFixed(0)}%</span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-100/75">{item.label}</p>
                    <p className="mt-1 text-sm font-black tabular-nums text-white">{formatNprInteger(item.amount)}</p>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Total cost card */}
          <GlassCard className="mb-4 p-4" delay={0.16}>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/65">Total Cost</p>
                <AnimatedNpr value={snapshot.total} className="mt-1 block text-3xl font-black tabular-nums text-white" />
              </div>
              <Sparkles size={18} className="text-emerald-300/80" />
            </div>
            <div className="h-[88px]">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot.trend}>
                    <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={900} />
                    <Tooltip
                      formatter={(value) => formatNprInteger(Number(value))}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid rgba(52,211,153,0.25)",
                        background: "rgba(2,24,18,0.96)",
                        color: "#ecfdf5",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full animate-pulse rounded-xl bg-white/5" />
              )}
            </div>
          </GlassCard>

          {/* Analytics */}
          <section className="mb-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-200/75">Analytics</h2>

            <GlassCard className="p-4" delay={0.18}>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200/70">Expense Distribution</p>
              <div className="grid grid-cols-[1fr_1.1fr] items-center gap-2">
                <div className="relative h-[150px]">
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={snapshot.donutData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} isAnimationActive animationDuration={950}>
                          {snapshot.donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full animate-pulse rounded-full bg-white/5" />
                  )}
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="text-xs font-black text-emerald-100">{formatNprInteger(snapshot.total)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {snapshot.items.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-[10px] font-bold text-emerald-100/80">
                      <span className="truncate">{item.label}</span>
                      <span className="tabular-nums">{item.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4" delay={0.2}>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200/70">Korea vs Nepal</p>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] font-bold text-emerald-100/80">
                    <span>Korea spend model</span>
                    <span>{formatNprInteger(snapshot.koreaSpend)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${koreaBarPct}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] font-bold text-emerald-100/80">
                    <span>Nepal lifestyle cost</span>
                    <span>{formatNprInteger(snapshot.total)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${nepalBarPct}%` }}
                      transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 h-[120px]">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { label: "Korea", value: snapshot.koreaSpend, fill: "#22d3ee" },
                        { label: "Nepal", value: snapshot.total, fill: "#34d399" },
                      ]}
                      margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                    >
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#a7f3d0", fontSize: 11, fontWeight: 700 }} />
                      <YAxis hide />
                      <Bar dataKey="value" radius={[10, 10, 4, 4]} isAnimationActive animationDuration={900} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard className="p-4" delay={0.22}>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200/70">Retirement Readiness</p>
              <div className="flex items-center gap-4">
                <div
                  className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(#34d399 ${animatedReadiness * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                  }}
                >
                  <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#041610]">
                    <span className="text-lg font-black tabular-nums text-white">{Math.round(animatedReadiness)}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-emerald-100/75">
                  {snapshot.location.label} scores {Math.round(snapshot.readiness)}/100 for your selected lifestyle and family profile.
                </p>
              </div>
            </GlassCard>
          </section>

          {/* AI insight */}
          <GlassCard className="mb-2 p-4" delay={0.24}>
            <div className="flex items-start gap-3">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/25 to-cyan-500/15">
                <Bot size={24} className="text-emerald-100" />
                <div className="pointer-events-none absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[10px] font-black text-emerald-950">
                  AI
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/70">AI Insight</p>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-emerald-50/90">{snapshot.aiMessage}</p>
              </div>
            </div>
          </GlassCard>

          {!hydrated ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-bold text-emerald-100/60">
              Loading your saved plan…
            </div>
          ) : null}
        </main>

        {/* Bottom action bar */}
        <div className="sticky bottom-0 z-30 border-t border-emerald-500/10 bg-[#021510]/95 px-4 py-3 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSavePlan}
              className="inline-flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-400/20 bg-emerald-500/12 px-2 text-[10px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.98]"
            >
              <Save size={16} />
              Save Plan
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="inline-flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/6 px-2 text-[10px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <MapPin size={16} />
              Compare Cities
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/6 px-2 text-[10px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <FileText size={16} />
              Export PDF
            </button>
          </div>
          <AnimatePresence>
            {savedToast ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-2 text-center text-[11px] font-bold text-emerald-300"
              >
                Plan saved locally on this device.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <EditPlanSheet open={editOpen} plan={plan} onClose={() => setEditOpen(false)} onSave={setPlan} />
      <CompareCitiesSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        cities={snapshot.compareCities}
        selectedId={plan.cityId}
        onSelect={(cityId) => patchPlan({ cityId, province: provinceForCity(cityId) })}
      />
    </div>
  );
}
