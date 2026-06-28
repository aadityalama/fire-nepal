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
const NUMBER_SAFE_CLS =
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap tabular-nums [font-variant-numeric:tabular-nums]";
const LABEL_CLS = "text-[clamp(0.65rem,1.8vw,0.85rem)] max-[389px]:text-[clamp(0.55rem,1.53vw,0.72rem)]";
const MICRO_LABEL_CLS = "text-[clamp(0.58rem,1.6vw,0.78rem)] max-[389px]:text-[clamp(0.5rem,1.36vw,0.66rem)]";
const EXPENSE_AMOUNT_CLS =
  "text-[clamp(0.95rem,2.8vw,1.35rem)] max-[389px]:text-[clamp(0.8rem,2.38vw,1.15rem)]";

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
  return <span className={`${NUMBER_SAFE_CLS} ${className ?? ""}`}>{formatNprInteger(Math.round(display))}</span>;
}

function NumericText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`${NUMBER_SAFE_CLS} ${className}`}>{children}</span>;
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
    <div className="flex min-h-[92px] min-w-0 flex-col justify-center rounded-xl border border-emerald-400/12 bg-gradient-to-br from-emerald-950/50 to-[#041610]/88 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm max-[389px]:p-2 md:p-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <SolidIcon icon={Icon} size={12} />
        <span className={`${LABEL_CLS} min-w-0 flex-1 truncate font-bold leading-tight text-emerald-100/80`}>{item.label}</span>
        <NumericText className={`${MICRO_LABEL_CLS} font-black text-emerald-200/60`}>{item.pct.toFixed(0)}%</NumericText>
      </div>
      <label className="mt-2 block min-w-0">
        <span className="sr-only">{item.label} monthly amount in NPR</span>
        <div className="flex min-h-10 min-w-0 items-center gap-1.5 rounded-lg border border-white/8 bg-black/30 px-2 focus-within:border-emerald-400/35">
          <span className={`${LABEL_CLS} shrink-0 font-bold text-emerald-200/50`}>₹</span>
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
            className={`${NUMBER_SAFE_CLS} ${EXPENSE_AMOUNT_CLS} flex-1 bg-transparent font-black text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
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
      <span className={`${LABEL_CLS} font-bold uppercase tracking-[0.14em] text-emerald-200/70`}>{label}</span>
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/8 text-[clamp(1rem,2.8vw,1.15rem)] font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
        >
          −
        </button>
        <NumericText className="text-[clamp(1.1rem,3vw,1.35rem)] font-black text-white">{value}</NumericText>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-lg bg-white/8 text-[clamp(1rem,2.8vw,1.15rem)] font-black text-white transition hover:bg-emerald-500/20 active:scale-95"
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
                <span className="text-[clamp(0.85rem,2vw,1rem)] font-black text-white">FIRE Nepal</span>
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
                    className="block rounded-xl border border-transparent px-3 py-2.5 text-[clamp(0.85rem,2vw,1rem)] font-bold text-emerald-50/90 transition hover:border-emerald-400/25 hover:bg-emerald-500/10"
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
              <h2 className="text-[clamp(1rem,2.6vw,1.2rem)] font-black text-white">Edit Plan</h2>
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
                <span className={`${LABEL_CLS} font-bold uppercase tracking-[0.14em] text-emerald-200/70`}>City</span>
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
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[clamp(0.85rem,2vw,1rem)] font-bold text-white outline-none"
                >
                  {DEFAULT_NEPAL_COST_CITIES.map((city) => (
                    <option key={city.id} value={city.id} className="bg-[#062018]">
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={`${LABEL_CLS} font-bold uppercase tracking-[0.14em] text-emerald-200/70`}>Province</span>
                <select
                  value={draft.province}
                  onChange={(event) => setDraft((current) => ({ ...current, province: event.target.value }))}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[clamp(0.85rem,2vw,1rem)] font-bold text-white outline-none"
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
                <span className={`${LABEL_CLS} font-bold uppercase tracking-[0.14em] text-emerald-200/70`}>
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
                  className={`${NUMBER_SAFE_CLS} rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[clamp(0.85rem,2vw,1rem)] font-bold text-white outline-none`}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, lifestyle: option.id }))}
                    className={`rounded-xl border px-3 py-2.5 text-left text-[clamp(0.85rem,2vw,1rem)] font-black transition active:scale-[0.98] ${
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
                className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-300 py-3 text-[clamp(0.85rem,2vw,1rem)] font-black text-emerald-950 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)] transition hover:brightness-105 active:scale-[0.99]"
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
              <h2 className="text-[clamp(1rem,2.6vw,1.2rem)] font-black text-white">Compare Cities</h2>
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
                  <span className="min-w-0 truncate text-[clamp(0.85rem,2vw,1rem)] font-black text-white">{city.label}</span>
                  <NumericText className="text-[clamp(0.85rem,2vw,1rem)] font-black text-emerald-200">
                    {formatNprInteger(city.total)}
                  </NumericText>
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
    <div className={`min-h-[100dvh] overflow-x-hidden ${shellBg}`}>
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col overflow-x-hidden border-x border-transparent lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:rounded-[1.75rem] lg:border ${frameBorder}`}
      >
        <header className="z-30 shrink-0 border-b border-emerald-500/10 bg-[#021510]/94 px-4 py-3 backdrop-blur-xl max-[389px]:px-3 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 transition hover:bg-white/10 active:scale-95 md:h-11 md:w-11"
            >
              <SolidIcon icon={Menu} size={16} />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="FIRE Nepal" width={28} height={28} className="rounded-md" />
              <span className="text-[clamp(0.85rem,2vw,1rem)] font-black tracking-tight text-white">FIRE Nepal</span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 transition hover:bg-white/10 active:scale-95 md:h-11 md:w-11"
            >
              <SolidIcon icon={Bell} size={15} />
            </button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-[1320px] flex-1 grid-cols-1 gap-4 overflow-x-hidden px-4 py-4 pb-24 max-[389px]:gap-3 max-[389px]:px-3 md:grid-cols-2 md:gap-5 md:px-6 md:py-6 lg:grid-cols-12 lg:gap-6 lg:px-8 lg:pb-8">
          <div className="flex min-w-0 items-start justify-between gap-3 md:col-span-2 lg:col-span-12">
            <div className="min-w-0">
              <h1 className="text-[clamp(1.35rem,4vw,2.35rem)] font-black leading-tight tracking-[-0.02em] text-white max-[389px]:text-[clamp(1.15rem,3.4vw,2rem)]">
                Nepal Cost of Living <span aria-hidden>🇳🇵</span>
              </h1>
              <p className="text-[clamp(0.78rem,2.2vw,1rem)] font-semibold leading-snug text-emerald-100/65 max-[389px]:text-[clamp(0.66rem,1.87vw,0.85rem)]">
                Plan your life in Nepal before you return.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-2 text-[clamp(0.72rem,2vw,0.9rem)] font-black text-emerald-100 transition hover:bg-emerald-500/20 active:scale-95 max-[389px]:text-[clamp(0.61rem,1.7vw,0.76rem)]"
            >
              <SolidIcon icon={Pencil} size={10} />
              Edit
            </button>
          </div>

          <GlassCard className="min-w-0 p-4 max-[389px]:p-3 md:col-span-2 md:p-5 lg:col-span-8 xl:col-span-9" delay={0.03}>
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-300/25 bg-gradient-to-br from-emerald-400/25 to-emerald-950 shadow-[0_0_24px_-6px_rgba(16,185,129,0.45)] md:h-14 md:w-14">
                  <SolidIcon icon={Building2} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.12em] text-emerald-200/60`}>Selected City</p>
                  <p className="min-w-0 truncate text-[clamp(1rem,3vw,1.45rem)] font-black text-white max-[389px]:text-[clamp(0.85rem,2.55vw,1.23rem)]">
                    {snapshot.location.label}
                  </p>
                  <select
                    value={plan.province}
                    onChange={(event) => patchPlanMeta({ province: event.target.value })}
                    aria-label="Province"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[clamp(0.72rem,2vw,0.9rem)] font-bold text-emerald-50 outline-none max-[389px]:text-[clamp(0.61rem,1.7vw,0.76rem)]"
                  >
                    {[...new Set(DEFAULT_NEPAL_COST_CITIES.map((city) => provinceForCity(city.id)))].map((province) => (
                      <option key={province} value={province} className="bg-[#062018]">
                        {province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-emerald-300/15 bg-black/20 p-3 text-left sm:w-[45%] sm:text-right lg:p-4">
                <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.12em] text-emerald-200/60`}>Monthly Cost</p>
                <AnimatedNpr
                  value={snapshot.total}
                  className="block text-[clamp(1.75rem,5vw,2.8rem)] font-extrabold leading-none text-white max-[389px]:text-[clamp(1.49rem,4.25vw,2.38rem)]"
                />
                <p className={`${NUMBER_SAFE_CLS} mt-1 text-[clamp(0.78rem,2.1vw,1rem)] font-bold text-emerald-200/65 max-[389px]:text-[clamp(0.66rem,1.78vw,0.85rem)]`}>
                  {formatKrwInteger(nprToKrw(snapshot.total, krwPerNpr))}
                </p>
                <span className="mt-2 inline-flex max-w-full rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[clamp(0.62rem,1.8vw,0.78rem)] font-black uppercase text-emerald-100 max-[389px]:text-[clamp(0.53rem,1.53vw,0.66rem)]">
                  {snapshot.lifestyle.label}
                </span>
              </div>
            </div>
          </GlassCard>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 md:col-span-2 lg:col-span-4 lg:grid-cols-1 xl:col-span-3">
            <GlassCard className="flex min-h-[92px] min-w-0 flex-col justify-center p-4 max-[389px]:p-3" delay={0.05}>
              <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.1em] text-emerald-200/55`}>Family</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[clamp(0.78rem,2.2vw,0.95rem)] font-bold leading-tight text-emerald-50/85 max-[389px]:text-[clamp(0.66rem,1.87vw,0.8rem)]">
                <p className="min-w-0">A <NumericText>{plan.family.adults}</NumericText></p>
                <p className="min-w-0">C <NumericText>{plan.family.children}</NumericText></p>
                <p className="min-w-0">P <NumericText>{plan.family.parents}</NumericText></p>
              </div>
            </GlassCard>
            <GlassCard className="flex min-h-[92px] min-w-0 flex-col justify-center p-4 max-[389px]:p-3" delay={0.06}>
              <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.1em] text-emerald-200/55`}>Lifestyle</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COL_LIFESTYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patchPlanSettings({ lifestyle: option.id })}
                    className={`min-h-7 rounded-full px-2 py-1 text-[clamp(0.58rem,1.7vw,0.75rem)] font-black uppercase transition max-[389px]:text-[clamp(0.5rem,1.45vw,0.64rem)] ${
                      plan.lifestyle === option.id
                        ? "bg-[#10B981] text-emerald-950"
                        : "bg-white/8 text-emerald-100/65 hover:bg-white/12"
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
                    className={`h-0.5 flex-1 rounded-full ${plan.lifestyle === option.id ? "bg-[#10B981]" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </GlassCard>
            <GlassCard className="flex min-h-[92px] min-w-0 flex-col justify-center p-4 max-[389px]:p-3" delay={0.07}>
              <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.1em] text-emerald-200/55`}>Savings</p>
              <p className={`${NUMBER_SAFE_CLS} mt-2 text-[clamp(1rem,3vw,1.45rem)] font-black leading-none text-[#10B981] max-[389px]:text-[clamp(0.85rem,2.55vw,1.23rem)]`}>
                {formatNprInteger(Math.round(animatedSavings))}
              </p>
              <p className={`${NUMBER_SAFE_CLS} mt-1 text-[clamp(0.7rem,2vw,0.9rem)] font-bold text-emerald-100/65 max-[389px]:text-[clamp(0.6rem,1.7vw,0.76rem)]`}>
                {animatedSavingsPct.toFixed(1)}%
              </p>
            </GlassCard>
          </div>

          <section className="min-w-0 md:col-span-1 lg:col-span-7 xl:col-span-8">
            <h2 className={`${LABEL_CLS} mb-2 font-black uppercase tracking-[0.12em] text-emerald-200/70`}>
              Monthly Expense Breakdown
            </h2>
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-2.5">
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

          <GlassCard className="flex min-h-[170px] min-w-0 flex-col justify-between p-4 max-[389px]:p-3 md:col-span-1 lg:col-span-5 lg:min-h-[220px] xl:col-span-4" delay={0.1}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className={`${LABEL_CLS} font-bold uppercase tracking-[0.12em] text-emerald-200/60`}>Total Monthly Cost</p>
                <AnimatedNpr
                  value={snapshot.total}
                  className="block text-[clamp(1.75rem,5vw,2.8rem)] font-extrabold leading-none text-white max-[389px]:text-[clamp(1.49rem,4.25vw,2.38rem)]"
                />
              </div>
              <SolidIcon icon={Sparkles} size={14} className="opacity-80" />
            </div>
            <div className="mt-4 h-20 min-w-0 md:h-24 lg:h-28">
              {chartsReady ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot.trend} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
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

          <section className="min-w-0 md:col-span-2 lg:col-span-12">
            <h2 className={`${LABEL_CLS} mb-2 font-black uppercase tracking-[0.12em] text-emerald-200/70`}>Analytics</h2>
            <GlassCard className="min-w-0 p-4 max-[389px]:p-3 md:p-5" delay={0.12}>
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(280px,1.4fr)_minmax(160px,0.8fr)]">
                <div className="min-w-0">
                  <p className={`${MICRO_LABEL_CLS} mb-2 font-black uppercase tracking-wide text-emerald-200/55`}>Distribution</p>
                  <div className="relative h-32 min-w-0 sm:h-36 lg:h-44">
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
                      <NumericText className="max-w-[72%] text-center text-[clamp(0.72rem,2vw,0.95rem)] font-black text-emerald-100 max-[389px]:text-[clamp(0.61rem,1.7vw,0.8rem)]">
                        {formatNprInteger(snapshot.total)}
                      </NumericText>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={`${MICRO_LABEL_CLS} mb-2 font-black uppercase tracking-wide text-emerald-200/55`}>Korea vs Nepal</p>
                  <div className="space-y-1">
                    <div>
                      <div className="mb-1 flex min-w-0 justify-between gap-2 text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold text-emerald-100/75 max-[389px]:text-[clamp(0.55rem,1.53vw,0.72rem)]">
                        <span>Korea</span>
                        <NumericText>{formatNprInteger(snapshot.koreaSpend)}</NumericText>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${koreaBarPct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-[#10B981]/45"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex min-w-0 justify-between gap-2 text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold text-emerald-100/75 max-[389px]:text-[clamp(0.55rem,1.53vw,0.72rem)]">
                        <span>Nepal</span>
                        <NumericText>{formatNprInteger(snapshot.total)}</NumericText>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${nepalBarPct}%` }}
                          transition={{ duration: 0.8, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-[#10B981]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-28 min-w-0 sm:h-32 lg:h-40">
                    {chartsReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { label: "KR", value: snapshot.koreaSpend, fill: "#10B981" },
                            { label: "NP", value: snapshot.total, fill: "#059669" },
                          ]}
                          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                        >
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#a7f3d0", fontSize: 10, fontWeight: 700 }}
                          />
                          <YAxis hide />
                          <Bar dataKey="value" radius={[4, 4, 2, 2]} isAnimationActive animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className={`${MICRO_LABEL_CLS} mb-2 font-black uppercase tracking-wide text-emerald-200/55`}>Retirement</p>
                  <div
                    className="relative mx-auto grid aspect-square w-full max-w-36 place-items-center rounded-full lg:max-w-44"
                    style={{
                      background: `conic-gradient(${EMERALD} ${animatedReadiness * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                    }}
                  >
                    <div className="grid h-[68%] w-[68%] place-items-center rounded-full bg-[#041610]">
                      <NumericText className="text-[clamp(1rem,3vw,1.6rem)] font-black text-white max-[389px]:text-[clamp(0.85rem,2.55vw,1.36rem)]">
                        {Math.round(animatedReadiness)}
                      </NumericText>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold leading-tight text-emerald-100/65 max-[389px]:text-[clamp(0.55rem,1.53vw,0.72rem)]">/100 score</p>
                </div>
              </div>
            </GlassCard>
          </section>

          <GlassCard className="min-w-0 p-4 max-[389px]:p-3 md:col-span-2 lg:col-span-12" delay={0.14}>
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-500/10">
                <SolidIcon icon={Bot} size={14} />
                <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#10B981] text-[clamp(0.5rem,1.4vw,0.62rem)] font-black text-emerald-950">
                  AI
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${LABEL_CLS} font-black uppercase tracking-[0.1em] text-emerald-200/60`}>AI Insight</p>
                <p className="text-[clamp(0.78rem,2.2vw,1rem)] font-semibold leading-snug text-emerald-50/90 max-[389px]:text-[clamp(0.66rem,1.87vw,0.85rem)]">{snapshot.aiMessage}</p>
              </div>
            </div>
          </GlassCard>

          {!hydrated ? (
            <p className="text-center text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold text-emerald-100/50 md:col-span-2 lg:col-span-12">Loading plan…</p>
          ) : null}
        </main>

        <div className="sticky bottom-0 z-30 shrink-0 border-t border-emerald-500/10 bg-[#021510]/96 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl max-[389px]:px-3 lg:px-8">
          <div className="mx-auto grid max-w-[1320px] grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSavePlan}
              className="inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-emerald-400/20 bg-emerald-500/12 px-2 text-[clamp(0.62rem,1.8vw,0.82rem)] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.98] max-[389px]:text-[clamp(0.53rem,1.53vw,0.7rem)] md:min-h-14"
            >
              <SolidIcon icon={Save} size={13} />
              Save
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/6 px-2 text-[clamp(0.62rem,1.8vw,0.82rem)] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98] max-[389px]:text-[clamp(0.53rem,1.53vw,0.7rem)] md:min-h-14"
            >
              <SolidIcon icon={MapPin} size={13} />
              Compare
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/6 px-2 text-[clamp(0.62rem,1.8vw,0.82rem)] font-black uppercase tracking-wide text-emerald-100 transition hover:bg-white/10 active:scale-[0.98] max-[389px]:text-[clamp(0.53rem,1.53vw,0.7rem)] md:min-h-14"
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
                className="mt-2 text-center text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold text-[#10B981]"
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
