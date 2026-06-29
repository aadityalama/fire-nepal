"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Calculator,
  Clock,
  Crown,
  GraduationCap,
  HeartPulse,
  Home,
  Menu,
  Pencil,
  Save,
  Settings,
  Shirt,
  Upload,
  User,
  Wallet,
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
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import {
  applyPlanSettings,
  COL_LIFESTYLE_OPTIONS,
  computeColSnapshot,
  patchExpenseAmount,
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
      className={`rounded-2xl border border-emerald-400/18 bg-gradient-to-br from-emerald-950/65 via-[#062018]/82 to-[#021510]/92 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${className}`}
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

              <label className="flex flex-col gap-1.5">
                <span className={`${LABEL_CLS} font-bold uppercase tracking-[0.14em] text-emerald-200/70`}>
                  Monthly Income
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={draft.monthlyIncomeNpr ?? ""}
                  placeholder="Enter monthly income"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      monthlyIncomeNpr: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  className={`${NUMBER_SAFE_CLS} rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[clamp(0.85rem,2vw,1rem)] font-bold text-white outline-none placeholder:text-emerald-100/35`}
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

function DesktopSidebar() {
  const items = [
    { icon: Home, label: "Dashboard", active: false },
    { icon: Calculator, label: "FIRE Calculator", active: false },
    { icon: Briefcase, label: "Portfolio", active: false },
    { icon: BarChart3, label: "Cashflow", active: false },
    { icon: Zap, label: "FIRE Biz", active: false },
    { icon: Wallet, label: "Cost of Living", active: true },
    { icon: Wrench, label: "Tools", active: false },
    { icon: BarChart3, label: "Reports", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  return (
    <aside className="hidden w-[150px] shrink-0 border-r border-emerald-500/15 bg-[#02140f] px-2 py-3 min-[1000px]:flex min-[1000px]:flex-col">
      <div className="mb-5 flex items-center gap-2 px-1">
        <Image src="/logo.png" alt="FIRE Nepal" width={21} height={21} className="rounded-md" />
        <span className="whitespace-nowrap text-[14px] font-black tracking-tight text-white">FIRE Nepal</span>
        <span aria-hidden className="text-sm">🇳🇵</span>
      </div>

      <nav className="space-y-1">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex h-10 items-center gap-2.5 rounded-lg px-2 text-[11px] font-bold ${
              item.active
                ? "bg-emerald-500/16 text-white shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]"
                : "text-emerald-50/80"
            }`}
          >
            <SolidIcon icon={item.icon} size={14} className={item.active ? "" : "opacity-65"} />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-lg border border-emerald-500/12 bg-emerald-950/35 p-2.5">
          <div className="flex items-center gap-1.5 text-[12px] font-black text-amber-300">
            <Crown size={13} fill="currentColor" />
            Go Premium
          </div>
          <p className="mt-2 text-[10px] leading-snug text-emerald-50/60">Unlock advanced tools and AI insights.</p>
          <button
            type="button"
            className="mt-3 h-8 w-full rounded-md bg-emerald-500 text-[11px] font-black text-emerald-950"
          >
            Upgrade Now
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-950/25 p-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-slate-200">
            <User size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-white">Raj Kumar</p>
            <p className="truncate text-[10px] font-semibold text-emerald-100/50">Premium Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DesktopKpiCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  subValue: React.ReactNode;
}) {
  return (
    <GlassCard className="flex h-[72px] min-w-0 items-center gap-2.5 rounded-lg p-3" delay={0.04}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/12 shadow-[0_0_30px_-12px_rgba(16,185,129,0.9)]">
        <SolidIcon icon={Icon} size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold leading-tight text-emerald-50/75">{label}</p>
        <p className="mt-0.5 text-[18px] font-black leading-none tracking-tight text-white">{value}</p>
        <p className="mt-1 text-[10px] font-bold text-emerald-400">{subValue}</p>
      </div>
    </GlassCard>
  );
}

function DesktopExpenseRow({
  item,
  icon: Icon,
  total,
  onAmountChange,
}: {
  item: ColExpenseItem;
  icon: LucideIcon;
  total: number;
  onAmountChange: (amount: number) => void;
}) {
  const [draftState, setDraftState] = useState({ amount: item.amount, value: String(item.amount) });
  const draft = draftState.amount === item.amount ? draftState.value : String(item.amount);
  const setDraft = (value: string, amount = item.amount) => setDraftState({ amount, value });
  const pct = total > 0 ? (item.amount / total) * 100 : 0;

  const commit = (raw: string) => {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(String(item.amount));
      return;
    }
    const next = Math.max(0, Math.round(parsed));
    setDraft(String(next), next);
    if (next !== item.amount) onAmountChange(next);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "" || raw === "-") {
      setDraft(raw, 0);
      if (item.amount !== 0) onAmountChange(0);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const next = Math.round(parsed);
      setDraft(raw, next);
      if (next !== item.amount) onAmountChange(next);
    }
  };

  return (
    <div className="grid h-[22px] grid-cols-[1.45fr_0.72fr_0.45fr_0.72fr] items-center gap-3 border-t border-emerald-500/10 px-3 text-[11px] text-emerald-50/85">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-emerald-500">
          <Icon size={10} className="text-white" fill="currentColor" strokeWidth={1.6} />
        </span>
        <span className="truncate font-semibold">{item.label}</span>
      </div>
      <label className="flex min-w-0 items-center gap-1.5">
        <Pencil size={9} className="shrink-0 text-emerald-100/65" />
        <span className="sr-only">{item.label} monthly amount in NPR</span>
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
          className={`${NUMBER_SAFE_CLS} w-full bg-transparent font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
      </label>
      <NumericText className="font-semibold text-emerald-50/80">{pct.toFixed(1)}%</NumericText>
      <div className="h-1 overflow-hidden rounded-full bg-emerald-950">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png", 1);
  });
}

async function captureDashboardReport(element: HTMLElement): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const { default: html2canvas } = await import("html2canvas");
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(Math.max(element.scrollWidth, rect.width));
  const height = Math.ceil(Math.max(element.scrollHeight, rect.height));

  return html2canvas(element, {
    backgroundColor: "#00120d",
    scale: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height,
    windowWidth: Math.max(width, document.documentElement.clientWidth),
    windowHeight: Math.max(height, document.documentElement.clientHeight),
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (clonedDocument) => {
      const clonedFrame = clonedDocument.querySelector("[data-col-report-frame]") as HTMLElement | null;
      const clonedMain = clonedDocument.querySelector("[data-col-report-main]") as HTMLElement | null;
      for (const node of [clonedFrame, clonedMain]) {
        if (!node) continue;
        node.style.height = "auto";
        node.style.minHeight = `${height}px`;
        node.style.overflow = "visible";
      }
    },
  });
}

async function downloadDashboardReport(element: HTMLElement, filenameBase: string): Promise<void> {
  const canvas = await captureDashboardReport(element);
  const pngBlob = await canvasToPngBlob(canvas);
  downloadBlob(pngBlob, `${filenameBase}.png`);

  const { jsPDF } = await import("jspdf");
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    unit: "px",
    format: [canvas.width, canvas.height],
    orientation,
    compress: true,
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
  pdf.save(`${filenameBase}.pdf`);
}

export function NepalCostOfLivingDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { plan, setPlan, hydrated, persistPlan, userId } = useColPlanState();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [krwPerNpr] = useState(FALLBACK_KRW_PER_NPR);

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const snapshot = useMemo(() => computeColSnapshot(plan), [plan]);
  const animatedSavings = useCountUpNumber(snapshot.monthlySavings ?? 0, { durationMs: 900 });
  const animatedReadiness = useCountUpNumber(snapshot.readiness, { durationMs: 1100 });

  const patchPlanSettings = (patch: Partial<Omit<ColPlanState, "expenses">>) =>
    setPlan((current) => applyPlanSettings(current, patch));

  const patchMonthlyIncome = (raw: string) =>
    setPlan((current) => ({
      ...current,
      monthlyIncomeNpr: raw.trim() === "" ? null : Number(raw),
    }));

  const patchExpense = (categoryId: ColExpenseCategoryId, amount: number) =>
    setPlan((current) => patchExpenseAmount(current, categoryId, amount));

  const handleSavePlan = () => {
    persistPlan(plan);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2200);
  };

  const handleExportReport = async () => {
    if (!reportRef.current || exportingReport) return;
    setExportingReport(true);
    try {
      await downloadDashboardReport(reportRef.current, "fire-nepal-cost-of-living-report");
    } finally {
      setExportingReport(false);
    }
  };

  const shellBg = light
    ? "bg-gradient-to-b from-emerald-50 via-white to-emerald-100/80"
    : "bg-[#010d0a]";

  const frameBorder = light
    ? "border-emerald-200/80 shadow-[0_40px_120px_-40px_rgba(5,46,22,0.25)]"
    : "border-emerald-500/15 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]";

  const yearlyTotal = snapshot.total * 12;
  const dailyAverage = Math.round(snapshot.total / 30);
  const weeklyAverage = Math.round((snapshot.total * 12) / 52);
  const topExpense = snapshot.items.reduce((largest, item) => (item.amount > largest.amount ? item : largest), snapshot.items[0]);
  const hasMonthlyIncome = plan.monthlyIncomeNpr !== null;

  return (
    <div className={`min-h-[100dvh] overflow-x-hidden ${shellBg}`}>
      <div
        ref={reportRef}
        data-col-report-frame
        className={`mx-auto flex min-h-[100dvh] w-full max-w-[1440px] overflow-x-hidden border-x border-transparent min-[1000px]:h-[100dvh] min-[1000px]:border ${frameBorder}`}
      >
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 shrink-0 border-b border-emerald-500/10 bg-[#021510]/94 px-4 py-3 backdrop-blur-xl max-[389px]:px-3 md:px-6 min-[1000px]:hidden">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between">
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

          <main data-col-report-main className="flex min-h-0 flex-1 flex-col gap-3 bg-[#00120d] px-3 pb-4 pt-4 sm:px-4 md:px-5 min-[1000px]:gap-2 min-[1000px]:px-3 min-[1000px]:pb-2 min-[1000px]:pt-6">
            <div className="flex shrink-0 flex-col gap-3 min-[1000px]:flex-row min-[1000px]:items-start min-[1000px]:justify-between min-[1000px]:gap-4">
              <div className="min-w-0 min-[1000px]:min-w-[230px]">
                <h1 className="text-[28px] font-black leading-none tracking-[-0.04em] text-white min-[1000px]:whitespace-nowrap">
                  Nepal Cost of Living
                </h1>
                <p className="mt-2 text-[13px] font-semibold text-emerald-50/70">Plan your life in Nepal before you return</p>
                <div className="mt-3 h-0.5 w-8 rounded-full bg-emerald-400" />
              </div>

              <div className="grid w-full grid-cols-1 gap-2 min-[390px]:grid-cols-2 md:grid-cols-4 min-[1000px]:mt-3 min-[1000px]:w-[490px] min-[1000px]:grid-cols-[98px_98px_120px_1fr]">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="h-[48px] rounded-lg border border-emerald-500/16 bg-emerald-950/40 px-3 text-left"
                >
                  <span className="block text-[11px] font-semibold text-emerald-50/70">Family</span>
                  <span className="block text-[12px] font-bold text-white">
                    A{plan.family.adults} · C{plan.family.children} · P{plan.family.parents}
                  </span>
                </button>
                <label className="block h-[48px] rounded-lg border border-emerald-500/16 bg-emerald-950/40 px-3 py-2">
                  <span className="block text-[11px] font-semibold text-emerald-50/70">Lifestyle</span>
                  <select
                    value={plan.lifestyle}
                    onChange={(event) => {
                      const option = COL_LIFESTYLE_OPTIONS.find((candidate) => candidate.id === event.target.value);
                      if (option) patchPlanSettings({ lifestyle: option.id });
                    }}
                    className="w-full bg-transparent text-[12px] font-bold text-white outline-none"
                  >
                    {COL_LIFESTYLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id} className="bg-[#062018]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block h-[48px] rounded-lg border border-emerald-500/16 bg-emerald-950/40 px-3 py-2">
                  <span className="block text-[11px] font-semibold text-emerald-50/70">Monthly Income</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={plan.monthlyIncomeNpr ?? ""}
                    placeholder="Enter income"
                    onChange={(event) => patchMonthlyIncome(event.target.value)}
                    className={`${NUMBER_SAFE_CLS} w-full bg-transparent text-[12px] font-bold text-white outline-none placeholder:text-emerald-100/35 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  />
                </label>
                <GlassCard className="flex min-h-[64px] flex-col items-center justify-center rounded-lg p-2 text-center min-[1000px]:h-[60px] min-[1000px]:min-h-0" delay={0.02}>
                  <p className="text-[11px] font-bold text-emerald-50/70">Total Monthly Cost</p>
                  <p className="text-[22px] font-black leading-[1.05] tracking-tight text-white tabular-nums min-[1000px]:text-[18px]">
                    {formatNprInteger(snapshot.total)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-400">{formatKrwInteger(nprToKrw(snapshot.total, krwPerNpr))}</p>
                </GlassCard>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-3 min-[1000px]:!grid-cols-5">
              <DesktopKpiCard
                icon={Wallet}
                label="Monthly Expenses"
                value={<AnimatedNpr value={snapshot.total} />}
                subValue={formatKrwInteger(nprToKrw(snapshot.total, krwPerNpr))}
              />
              <DesktopKpiCard
                icon={Calendar}
                label="Yearly Expenses"
                value={formatNprInteger(yearlyTotal)}
                subValue={formatKrwInteger(nprToKrw(yearlyTotal, krwPerNpr))}
              />
              <DesktopKpiCard
                icon={Clock}
                label="Daily Average"
                value={formatNprInteger(dailyAverage)}
                subValue={formatKrwInteger(nprToKrw(dailyAverage, krwPerNpr))}
              />
              <DesktopKpiCard
                icon={Calendar}
                label="Weekly Average"
                value={formatNprInteger(weeklyAverage)}
                subValue={formatKrwInteger(nprToKrw(weeklyAverage, krwPerNpr))}
              />
              <DesktopKpiCard
                icon={Building2}
                label="Monthly Savings"
                value={
                  hasMonthlyIncome ? (
                    formatNprInteger(Math.round(animatedSavings))
                  ) : (
                    <span className="block text-[13px] leading-tight">Enter Monthly Income</span>
                  )
                }
                subValue={
                  hasMonthlyIncome && snapshot.savingsPct !== null
                    ? `Savings Rate ${snapshot.savingsPct.toFixed(1)}%`
                    : "Savings Rate --"
                }
              />
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-3 min-[1000px]:h-[326px] min-[1000px]:grid-cols-12">
              <GlassCard className="min-h-0 overflow-hidden rounded-lg p-0 min-[1000px]:col-span-7" delay={0.08}>
                <div className="flex min-h-10 flex-col items-start gap-2 border-b border-emerald-500/12 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
                  <h2 className="text-[15px] font-black uppercase tracking-wide text-white">Monthly Expense Breakdown</h2>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-500/12 bg-white/5 px-3 text-[11px] font-bold text-emerald-50/80"
                  >
                    <Pencil size={12} />
                    Edit Expenses
                  </button>
                </div>
                <div className="grid h-6 grid-cols-[1.45fr_0.72fr_0.45fr_0.72fr] items-center gap-3 px-3 text-[10px] font-semibold text-emerald-50/70">
                  <span>Category</span>
                  <span>Monthly Cost (₹)</span>
                  <span>% of Total</span>
                  <span>Progress</span>
                </div>
                <div>
                  {snapshot.items.map((item) => (
                    <DesktopExpenseRow
                      key={item.id}
                      item={item}
                      icon={EXPENSE_ICONS[item.id]}
                      total={snapshot.total}
                      onAmountChange={(amount) => patchExpense(item.id, amount)}
                    />
                  ))}
                </div>
                <div className="grid h-6 grid-cols-[1.45fr_0.72fr_0.45fr_0.72fr] items-center gap-3 border-t border-emerald-500/18 px-3 text-[10px] font-black uppercase text-emerald-50">
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500">
                      <BarChart3 size={10} className="text-white" />
                    </span>
                    Total Monthly Cost
                  </div>
                  <NumericText className="text-emerald-400">{formatNprInteger(snapshot.total)}</NumericText>
                  <span>100%</span>
                  <span />
                </div>
                <p className="border-t border-emerald-500/10 px-4 py-1 text-[10px] font-semibold text-emerald-50/55">
                  Click on any amount to edit. Changes are saved automatically.
                </p>
              </GlassCard>

              <div className="grid min-h-0 gap-3 min-[1000px]:col-span-5 min-[1000px]:grid-rows-[1fr_1fr]">
                <GlassCard className="overflow-hidden rounded-lg p-4" delay={0.1}>
                  <h2 className="text-[14px] font-black uppercase tracking-wide text-white">FIRE Readiness Score</h2>
                  <div className="mt-3 flex flex-col gap-4 min-[390px]:flex-row min-[390px]:items-center min-[1000px]:gap-6">
                    <div
                      className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(#4ade80 ${animatedReadiness * 3.6}deg, rgba(16,185,129,0.16) 0deg)`,
                      }}
                    >
                      <div className="grid h-[70%] w-[70%] place-items-center rounded-full bg-[#041610] text-center">
                        <div>
                          <NumericText className="block text-[34px] font-black leading-none text-white">
                            {Math.round(animatedReadiness)}
                          </NumericText>
                          <span className="text-[12px] font-bold text-emerald-50/70">/100</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-white">Keep building your wealth!</p>
                      <p className="mt-2 max-w-[260px] text-[11px] font-semibold leading-relaxed text-emerald-50/78">
                        You&apos;re on the right track. Optimize your expenses and increase savings to improve your score.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="overflow-hidden rounded-lg p-4" delay={0.12}>
                  <h2 className="text-[14px] font-black uppercase tracking-wide text-white">Expense Insights</h2>
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500">
                        <Home size={13} className="text-white" fill="currentColor" />
                      </span>
                      <p className="text-[11px] leading-snug text-emerald-50/78">
                        <span className="block font-black text-orange-300">{topExpense?.label ?? "Housing"} is your largest expense</span>
                        Consider optimizing rent or location
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-500">
                        <Utensils size={13} className="text-white" fill="currentColor" />
                      </span>
                      <p className="text-[11px] leading-snug text-emerald-50/78">
                        <span className="block font-black text-green-300">Food expenses are within normal range</span>
                        Well managed! Keep it up.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-500">
                        <Car size={13} className="text-white" fill="currentColor" />
                      </span>
                      <p className="text-[11px] leading-snug text-emerald-50/78">
                        <span className="block font-black text-blue-300">You can save more on transportation</span>
                        Consider public transport or carpooling
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-3 min-[1000px]:h-[158px] min-[1000px]:grid-cols-12">
              <GlassCard className="h-full overflow-hidden rounded-lg p-3 min-[1000px]:col-span-7" delay={0.14}>
                <h2 className="text-[14px] font-black uppercase tracking-wide text-white">Expense Analytics</h2>
                <div className="mt-1 grid gap-3 md:grid-cols-[150px_150px_1fr] min-[1000px]:h-[120px]">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-50/75">Category Distribution</p>
                    <div className="relative mt-1 h-[150px] md:h-[100px]">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={snapshot.donutData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="78%">
                              {snapshot.donutData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <NumericText className="text-[11px] font-black text-white">{formatNprInteger(snapshot.total)}</NumericText>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5 md:mt-5">
                    {snapshot.items.slice(0, 9).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-[9px] font-semibold text-emerald-50/72">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: snapshot.donutData.find((entry) => entry.name === item.label)?.fill ?? EMERALD }} />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span>{item.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white">Monthly Trend</p>
                    <p className="text-[9px] font-semibold text-emerald-50/55">Estimated Monthly Cost (₹)</p>
                    <div className="h-[150px] md:h-[100px]">
                      {chartsReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={snapshot.trend} margin={{ top: 14, right: 8, left: 4, bottom: 0 }}>
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#a7f3d0", fontSize: 10 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#a7f3d0", fontSize: 10 }} width={42} />
                            <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: "#d9f99d" }} />
                            <Tooltip formatter={(value) => formatNprInteger(Number(value))} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="h-full overflow-hidden rounded-lg p-3 min-[1000px]:col-span-5" delay={0.16}>
                <h2 className="text-[14px] font-black text-white">Quick Actions</h2>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="grid h-11 place-items-center rounded-lg bg-emerald-950/55 text-center text-[9px] font-semibold leading-tight text-emerald-50/80"
                  >
                    <Pencil size={16} />
                    <span className="text-[9px] leading-tight">
                      Edit
                      <br />
                      Expenses
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    className="grid h-11 place-items-center rounded-lg bg-emerald-950/55 text-center text-[9px] font-semibold leading-tight text-emerald-50/80"
                  >
                    <Save size={16} />
                    <span className="text-[9px] leading-tight">
                      Save
                      <br />
                      Plan
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleExportReport()}
                  disabled={exportingReport}
                  className="mt-1 flex h-[42px] w-full flex-col items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-green-400 text-[14px] font-black text-white shadow-[0_16px_32px_-22px_rgba(34,197,94,0.9)] transition disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="inline-flex items-center gap-2">
                    <Upload size={16} />
                    {exportingReport ? "Preparing Report" : "Download Report"}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-950/70">PDF & PNG</span>
                </button>
                {savedToast ? <p className="mt-2 text-center text-[11px] font-bold text-emerald-300">Plan saved{userId ? " to your account" : " locally"}.</p> : null}
              </GlassCard>
            </div>
            {!hydrated ? (
              <p className="text-center text-[clamp(0.65rem,1.8vw,0.85rem)] font-bold text-emerald-100/50">Loading plan…</p>
            ) : null}
          </main>
        </div>
      </div>

      <NavMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <EditPlanSheet
        key={`${editOpen ? "open" : "closed"}-${plan.lifestyle}-${plan.family.adults}-${plan.family.children}-${plan.family.parents}-${plan.monthlyIncomeNpr ?? "none"}-${plan.monthlyKoreaSpendNpr}`}
        open={editOpen}
        plan={plan}
        onClose={() => setEditOpen(false)}
        onSave={(draft) =>
          setPlan((current) =>
            applyPlanSettings(current, {
              lifestyle: draft.lifestyle,
              family: draft.family,
              monthlyIncomeNpr: draft.monthlyIncomeNpr,
              monthlyKoreaSpendNpr: draft.monthlyKoreaSpendNpr,
            }),
          )
        }
      />
    </div>
  );
}
