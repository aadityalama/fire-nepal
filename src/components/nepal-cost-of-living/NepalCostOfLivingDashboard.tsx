"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Bot,
  Building2,
  Car,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
  Menu,
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
import { useColPlanState } from "@/hooks/useColPlanState";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { DEFAULT_NEPAL_COST_CITIES } from "@/lib/nepal-cost-data";
import {
  applyPlanSettings,
  COL_LIFESTYLE_OPTIONS,
  computeColSnapshot,
  patchExpenseAmount,
  provinceForCity,
  type ColExpenseCategoryId,
  type ColExpenseItem,
  type ColPlanState,
} from "@/lib/nepal-col-dashboard";
import { FALLBACK_KRW_PER_NPR, nprToKrw } from "@/lib/exchange-rate";

const EMERALD = "#10B981";
const ICON_CLS = "text-[#10B981]";

function SolidIcon({ icon: Icon, size = 14, className = "" }: { icon: LucideIcon; size?: number; className?: string }) {
  return <Icon size={size} className={`${ICON_CLS} ${className}`} fill={EMERALD} stroke={EMERALD} strokeWidth={1.25} />;
}

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

const NAV_LINKS = [
  { href: "/portfolio", label: "Wealth Dashboard" },
  { href: "/return-to-nepal", label: "Return to Nepal" },
  { href: "/savings-tracker", label: "Savings Tracker" },
  { href: "/cost-of-living", label: "Cost of Living" },
] as const;

function AnimatedNpr({ value, className }: { value: number; className?: string }) {
  const display = useCountUpNumber(value, { durationMs: 900 });
  return <span className={className}>{formatNprInteger(Math.round(display))}</span>;
}

function ExpenseCategoryCard({
  item,
  icon: Icon,
  onAmountChange,
}: {
  item: ColExpenseItem;
  icon: LucideIcon;
  onAmountChange: (amount: number) => void;
}) {
  const [draft, setDraft] = useState(String(item.amount));

  useEffect(() => {
    setDraft(String(item.amount));
  }, [item.amount]);

  const commit = (raw: string) => {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(String(item.amount));
      return;
    }
    const next = Math.max(0, Math.round(parsed));
    setDraft(String(next));
    if (next !== item.amount) onAmountChange(next);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "" || raw === "-") {
      if (item.amount !== 0) onAmountChange(0);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const next = Math.round(parsed);
      if (next !== item.amount) onAmountChange(next);
    }
  };

  return (
    <div className="flex min-h-[34px] flex-col justify-center rounded-lg border border-emerald-400/12 bg-gradient-to-br from-emerald-950/50 to-[#041610]/88 px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <div className="flex items-center gap-0.5">
        <SolidIcon icon={Icon} size={10} />
        <span className="min-w-0 flex-1 truncate text-[8px] font-bold leading-none text-emerald-100/80">{item.label}</span>
        <span className="text-[7px] font-black tabular-nums text-emerald-200/60">{item.pct.toFixed(0)}%</span>
      </div>
      <label className="mt-0.5 block">
        <span className="sr-only">{item.label} monthly amount in NPR</span>
        <div className="flex h-5 items-center gap-0.5 rounded-md border border-white/8 bg-black/30 px-1 focus-within:border-emerald-400/35">
          <span className="text-[8px] font-bold text-emerald-200/50">₹</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={draft}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-[9px] font-black tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </label>
    </div>
  );
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-xl border border-emerald-400/18 bg-gradient-to-br from-emerald-950/65 via-[#062018]/82 to-[#021510]/92 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${className}`}
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
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/70">{label}</span>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/8 text-base font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
        >
          −
        </button>
        <span className="text-lg font-black tabular-nums text-white">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/8 text-base font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

function NavMenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.nav
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r border-emerald-400/20 bg-gradient-to-b from-[#083026] to-[#021510] p-4 shadow-[20px_0_60px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="FIRE Nepal" width={24} height={24} className="rounded-md" />
                <span className="text-sm font-black text-white">FIRE Nepal</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/8 text-white"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block rounded-xl border border-transparent px-3 py-2.5 text-sm font-bold text-emerald-50/90 transition hover:border-emerald-400/25 hover:bg-emerald-500/10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        </>
      ) : null}
    </AnimatePresence>
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[390px] rounded-t-2xl border border-emerald-400/20 bg-gradient-to-b from-[#083026] to-[#021510] p-4 pb-8 shadow-[0_-20px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-white">Edit Plan</h2>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/8 text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[70dvh] space-y-3 overflow-y-auto">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/70">City</span>
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
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white outline-none"
                >
                  {DEFAULT_NEPAL_COST_CITIES.map((city) => (
                    <option key={city.id} value={city.id} className="bg-[#062018]">
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/70">Province</span>
                <select
                  value={draft.province}
                  onChange={(event) => setDraft((current) => ({ ...current, province: event.target.value }))}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white outline-none"
                >
                  {[...new Set(DEFAULT_NEPAL_COST_CITIES.map((city) => provinceForCity(city.id)))].map((province) => (
                    <option key={province} value={province} className="bg-[#062018]">
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
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

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/70">
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
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, lifestyle: option.id }))}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black transition active:scale-[0.98] ${
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
                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-300 py-3 text-sm font-black text-emerald-950 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)] transition hover:brightness-105 active:scale-[0.99]"
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[390px] rounded-t-2xl border border-emerald-400/20 bg-gradient-to-b from-[#083026] to-[#021510] p-4 pb-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-white">Compare Cities</h2>
              <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/8 text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelect(city.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
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
  const { plan, setPlan, hydrated, persistPlan, userId } = useColPlanState();
  const [chartsReady, setChartsReady] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [krwPerNpr] = useState(FALLBACK_KRW_PER_NPR);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const snapshot = useMemo(() => computeColSnapshot(plan), [plan]);
  const animatedSavings = useCountUpNumber(snapshot.monthlySavings, { durationMs: 900 });
  const animatedSavingsPct = useCountUpNumber(snapshot.savingsPct, { durationMs: 900 });
  const animatedReadiness = useCountUpNumber(snapshot.readiness, { durationMs: 1100 });

  const compareMax = Math.max(snapshot.koreaSpend, snapshot.total, 1);
  const koreaBarPct = (snapshot.koreaSpend / compareMax) * 100;
  const nepalBarPct = (snapshot.total / compareMax) * 100;

  const patchPlanSettings = (patch: Partial<Omit<ColPlanState, "expenses">>) =>
    setPlan((current) => applyPlanSettings(current, patch));

  const patchPlanMeta = (patch: Partial<Pick<ColPlanState, "province" | "monthlyKoreaSpendNpr">>) =>
    setPlan((current) => ({ ...current, ...patch }));

  const patchExpense = (categoryId: ColExpenseCategoryId, amount: number) =>
    setPlan((current) => patchExpenseAmount(current, categoryId, amount));

  const handleSavePlan = () => {
    persistPlan(plan);
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

  const frameBorder = light
    ? "border-emerald-200/80 shadow-[0_40px_120px_-40px_rgba(5,46,22,0.25)]"
    : "border-emerald-500/15 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]";

  return (
    <div className={`min-h-[100dvh] ${shellBg}`}>
      <div
        className={`mx-auto flex h-[100dvh] max-h-[844px] w-full max-w-[390px] flex-col overflow-hidden border-x border-transparent lg:my-6 lg:h-[844px] lg:rounded-[1.75rem] lg:border ${frameBorder}`}
      >
        {/* Compact header */}
        <header className="z-30 shrink-0 border-b border-emerald-500/10 bg-[#021510]/94 px-3 py-2 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/6 transition hover:bg-white/10 active:scale-95"
            >
              <SolidIcon icon={Menu} size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              <Image src="/logo.png" alt="FIRE Nepal" width={22} height={22} className="rounded-md" />
              <span className="text-xs font-black tracking-tight text-white">FIRE Nepal</span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/6 transition hover:bg-white/10 active:scale-95"
            >
              <SolidIcon icon={Bell} size={15} />
            </button>
          </div>
        </header>

        {/* Single-screen scroll-free main */}
        <main className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-2.5 pb-1 pt-1.5">
          {/* Title row */}
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base font-black leading-tight tracking-[-0.02em] text-white">
                Nepal Cost of Living <span aria-hidden>🇳🇵</span>
              </h1>
              <p className="text-[10px] font-semibold leading-snug text-emerald-100/65">
                Plan your life in Nepal before you return.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2 py-1 text-[10px] font-black text-emerald-100 transition hover:bg-emerald-500/20 active:scale-95"
            >
              <SolidIcon icon={Pencil} size={10} />
              Edit
            </button>
          </div>

          {/* Hero card */}
          <GlassCard className="shrink-0 p-2" delay={0.03}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-300/25 bg-gradient-to-br from-emerald-400/25 to-emerald-950 shadow-[0_0_24px_-6px_rgba(16,185,129,0.45)]">
                  <SolidIcon icon={Building2} size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-200/60">Selected City</p>
                  <p className="truncate text-sm font-black text-white">{snapshot.location.label}</p>
                  <select
                    value={plan.province}
                    onChange={(event) => patchPlanMeta({ province: event.target.value })}
                    aria-label="Province"
                    className="mt-0.5 w-full rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-50 outline-none"
                  >
                    {[...new Set(DEFAULT_NEPAL_COST_CITIES.map((city) => provinceForCity(city.id)))].map((province) => (
                      <option key={province} value={province} className="bg-[#062018]">
                        {province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-200/60">Monthly Cost</p>
                <AnimatedNpr value={snapshot.total} className="block text-lg font-black tabular-nums leading-none text-white" />
                <p className="mt-0.5 text-[9px] font-bold text-emerald-200/65">
                  {formatKrwInteger(nprToKrw(snapshot.total, krwPerNpr))}
                </p>
                <span className="mt-0.5 inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase text-emerald-100">
                  {snapshot.lifestyle.label}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Family / Lifestyle / Savings */}
          <div className="grid shrink-0 grid-cols-3 gap-1">
            <GlassCard className="p-1.5" delay={0.05}>
              <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-emerald-200/55">Family</p>
              <div className="mt-0.5 space-y-0 text-[8px] font-bold leading-tight text-emerald-50/85">
                <p>A {plan.family.adults}</p>
                <p>C {plan.family.children}</p>
                <p>P {plan.family.parents}</p>
              </div>
            </GlassCard>
            <GlassCard className="p-1.5" delay={0.06}>
              <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-emerald-200/55">Lifestyle</p>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patchPlanSettings({ lifestyle: option.id })}
                    className={`rounded-full px-1 py-px text-[6px] font-black uppercase transition ${
                      plan.lifestyle === option.id
                        ? "bg-[#10B981] text-emerald-950"
                        : "bg-white/8 text-emerald-100/65 hover:bg-white/12"
                    }`}
                  >
                    {option.label.slice(0, 4)}
                  </button>
                ))}
              </div>
              <div className="mt-0.5 flex gap-0.5">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <span
                    key={option.id}
                    className={`h-0.5 flex-1 rounded-full ${plan.lifestyle === option.id ? "bg-[#10B981]" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-1.5" delay={0.07}>
              <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-emerald-200/55">Savings</p>
              <p className="mt-0.5 text-xs font-black tabular-nums leading-none text-[#10B981]">
                {formatNprInteger(Math.round(animatedSavings))}
              </p>
              <p className="mt-0.5 text-[8px] font-bold text-emerald-100/65">{animatedSavingsPct.toFixed(1)}%</p>
            </GlassCard>
          </div>

          {/* Monthly expense breakdown — 5×2 compact grid */}
          <section className="min-h-0 shrink-0">
            <h2 className="mb-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-200/70">
              Monthly Expense Breakdown
            </h2>
            <div className="grid grid-cols-5 gap-0.5">
              {snapshot.items.map((item) => (
                <ExpenseCategoryCard
                  key={item.id}
                  item={item}
                  icon={EXPENSE_ICONS[item.id]}
                  onAmountChange={(amount) => patchExpense(item.id, amount)}
                />
              ))}
            </div>
          </section>

          {/* Total monthly cost */}
          <GlassCard className="shrink-0 p-2" delay={0.1}>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-200/60">Total Monthly Cost</p>
                <AnimatedNpr value={snapshot.total} className="block text-xl font-black tabular-nums leading-none text-white" />
              </div>
              <SolidIcon icon={Sparkles} size={14} className="opacity-80" />
            </div>
            <div className="mt-1 h-8">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot.trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={EMERALD}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={900}
                    />
                    <Tooltip
                      formatter={(value) => formatNprInteger(Number(value))}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid rgba(16,185,129,0.25)",
                        background: "rgba(2,24,18,0.96)",
                        color: "#ecfdf5",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full animate-pulse rounded-md bg-white/5" />
              )}
            </div>
          </GlassCard>

          {/* Compact analytics — single card, three columns */}
          <section className="min-h-0 shrink-0">
            <h2 className="mb-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-200/70">Analytics</h2>
            <GlassCard className="p-1.5" delay={0.12}>
              <div className="grid grid-cols-[72px_1fr_56px] items-center gap-1.5">
                {/* Donut */}
                <div>
                  <p className="mb-0.5 text-[6px] font-black uppercase tracking-wide text-emerald-200/55">Distribution</p>
                  <div className="relative h-14">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart key={`col-donut-${snapshot.total}`}>
                          <Pie
                            data={snapshot.donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="52%"
                            outerRadius="78%"
                            paddingAngle={1}
                            isAnimationActive
                            animationDuration={800}
                          >
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
                      <span className="text-[7px] font-black text-emerald-100">{formatNprInteger(snapshot.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Korea vs Nepal */}
                <div>
                  <p className="mb-0.5 text-[6px] font-black uppercase tracking-wide text-emerald-200/55">Korea vs Nepal</p>
                  <div className="space-y-1">
                    <div>
                      <div className="mb-px flex justify-between text-[7px] font-bold text-emerald-100/75">
                        <span>Korea</span>
                        <span className="tabular-nums">{formatNprInteger(snapshot.koreaSpend)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${koreaBarPct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-[#10B981]/45"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-px flex justify-between text-[7px] font-bold text-emerald-100/75">
                        <span>Nepal</span>
                        <span className="tabular-nums">{formatNprInteger(snapshot.total)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${nepalBarPct}%` }}
                          transition={{ duration: 0.8, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-[#10B981]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 h-10">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { label: "KR", value: snapshot.koreaSpend, fill: "#10B981" },
                            { label: "NP", value: snapshot.total, fill: "#059669" },
                          ]}
                          margin={{ top: 0, right: 0, left: -22, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#a7f3d0", fontSize: 7, fontWeight: 700 }}
                          />
                          <YAxis hide />
                          <Bar dataKey="value" radius={[4, 4, 2, 2]} isAnimationActive animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>

                {/* Retirement readiness */}
                <div>
                  <p className="mb-0.5 text-[6px] font-black uppercase tracking-wide text-emerald-200/55">Retirement</p>
                  <div
                    className="relative mx-auto grid h-14 w-14 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(${EMERALD} ${animatedReadiness * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                    }}
                  >
                    <div className="grid h-[68%] w-[68%] place-items-center rounded-full bg-[#041610]">
                      <span className="text-xs font-black tabular-nums text-white">{Math.round(animatedReadiness)}</span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-center text-[6px] font-bold leading-tight text-emerald-100/65">/100 score</p>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* AI insight */}
          <GlassCard className="min-h-0 shrink p-1.5" delay={0.14}>
            <div className="flex items-start gap-1.5">
              <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-500/10">
                <SolidIcon icon={Bot} size={14} />
                <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#10B981] text-[6px] font-black text-emerald-950">
                  AI
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-200/60">AI Insight</p>
                <p className="line-clamp-2 text-[9px] font-semibold leading-snug text-emerald-50/90">{snapshot.aiMessage}</p>
              </div>
            </div>
          </GlassCard>

          {!hydrated ? (
            <p className="shrink-0 text-center text-[8px] font-bold text-emerald-100/50">Loading plan…</p>
          ) : null}
        </main>

        {/* Sticky bottom action bar */}
        <div className="z-30 shrink-0 border-t border-emerald-500/10 bg-[#021510]/96 px-2.5 py-1.5 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={handleSavePlan}
              className="inline-flex min-h-[38px] flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-400/20 bg-emerald-500/12 px-1 text-[8px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.98]"
            >
              <SolidIcon icon={Save} size={13} />
              Save
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="inline-flex min-h-[38px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/6 px-1 text-[8px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <SolidIcon icon={MapPin} size={13} />
              Compare
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex min-h-[38px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/6 px-1 text-[8px] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <SolidIcon icon={FileText} size={13} />
              PDF
            </button>
          </div>
          <AnimatePresence>
            {savedToast ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mt-0.5 text-center text-[8px] font-bold text-[#10B981]"
              >
                Plan saved{userId ? " to your account" : " locally"}.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <NavMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <EditPlanSheet
        open={editOpen}
        plan={plan}
        onClose={() => setEditOpen(false)}
        onSave={(draft) =>
          setPlan((current) =>
            applyPlanSettings(current, {
              cityId: draft.cityId,
              province: draft.province,
              lifestyle: draft.lifestyle,
              family: draft.family,
              monthlyKoreaSpendNpr: draft.monthlyKoreaSpendNpr,
            }),
          )
        }
      />
      <CompareCitiesSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        cities={snapshot.compareCities}
        selectedId={plan.cityId}
        onSelect={(cityId) => patchPlanSettings({ cityId })}
      />
    </div>
  );
}
