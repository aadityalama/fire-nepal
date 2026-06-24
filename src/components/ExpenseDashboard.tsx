"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowRightLeft,
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  History,
  Info,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  PieChart,
  Plus,
  Crown,
  ReceiptText,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ExpenseAiInsightsPanel } from "@/components/ExpenseAiInsightsPanel";
import { ExpenseHistoryPanel } from "@/components/ExpenseHistoryPanel";
import { ExpenseMonthPicker } from "@/components/ExpenseMonthPicker";
import { ExpenseReceiptUpload } from "@/components/ExpenseReceiptUpload";
import { sanitizeDecimalTyping } from "@/components/NumericMoneyInput";
import { RoommateShareSummaryModal } from "@/components/RoommateShareSummaryModal";
import { SettlementCelebration } from "@/components/SettlementCelebration";
import { SettlementShareModal } from "@/components/SettlementShareModal";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  formatExpenseAmountForInput,
  krwToNpr,
  nprToKrw,
  parseExpenseAmountInput,
} from "@/lib/exchange-rate";
import { monthlyComparisonData, normalizeCategory } from "@/lib/expense-analytics";
import {
  FALLBACK_KRW_PER_NPR,
  fallbackExchangeRate,
  fetchLiveExchangeRate,
  type ExchangeRateSnapshot,
} from "@/lib/exchange-rate";
import {
  createActivity,
  filterExpensesByMonth,
  formatMonthLabel,
  listMonthKeys,
  loadDashboardState,
  saveDashboardState,
  type TimelineActivity,
} from "@/lib/expense-storage";
import { buildRoommateExpenseSummaryText, isDesktopShareUi } from "@/lib/roommate-expense-share";
import {
  buildSettlementShareData,
  downloadSettlementSharePdf,
  downloadSettlementSharePng,
} from "@/lib/settlement-share";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  loadExpenseWorkspaceSettings,
  saveExpenseWorkspaceSettings,
} from "@/services/expense-workspace-supabase";
import {
  generateMemberId,
  memberDisplayName,
  memberNameMap,
  resolveExpensePayerName,
} from "@/lib/expense-members";
import {
  currentMonthKey,
  expenseAttributedShares,
  expenseEntryCurrency,
  expenseMonthKey,
  getSettlement,
  type Expense,
} from "@/lib/expense-utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Currency = "NPR" | "KRW" | "USD";
type Tab = "Dashboard" | "Members" | "Expenses" | "Settlement" | "Analytics" | "AI Insights" | "History";

type BottomTab = "Dashboard" | "Members" | "Expenses" | "Settlement" | "Analytics";

type ExpenseForm = {
  title: string;
  amount: string;
  payerId: string;
  category: string;
  splitEqually: boolean;
  date: string;
  splitAmong: string[];
  splitPercentStr: Record<string, string>;
};

type RoommateProfile = {
  name: string;
  avatarUrl?: string;
  phone: string;
  kakaoId: string;
  bankName: string;
  accountNumber: string;
  emergencyContact: string;
  notes: string;
};

const categories = ["Food/Mart", "Rent", "Electricity", "Internet", "Remittance", "Other"];
const bottomTabs: Array<{ id: BottomTab; label: string; icon: LucideIcon }> = [
  { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "Members", label: "Members", icon: UsersRound },
  { id: "Expenses", label: "Expenses", icon: ReceiptText },
  { id: "Settlement", label: "Settlement", icon: Calculator },
  { id: "Analytics", label: "Analytics", icon: BarChart3 },
];

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const motionEase = [0.22, 1, 0.36, 1] as const;

function ExpenseBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className = "",
  showHandle = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  showHandle?: boolean;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="expense-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-black/35"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            key="expense-sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "expense-sheet-title" : undefined}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            className={`fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.35rem] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.14)] ${className}`}
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {showHandle ? (
              <div className="flex shrink-0 flex-col items-center pt-2.5">
                <div className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
              </div>
            ) : null}
            {title || subtitle ? (
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-4 pb-3 pt-1">
                <div className="min-w-0">
                  {title ? (
                    <h2 id="expense-sheet-title" className="text-base font-black text-emerald-950">
                      {title}
                    </h2>
                  ) : null}
                  {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition active:scale-95"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function getCurrencyMeta(krwPerNpr: number) {
  return {
    NPR: { symbol: "रु", rate: 1 },
    KRW: { symbol: "₩", rate: krwPerNpr },
    USD: { symbol: "$", rate: 0.0075 },
  };
}

function emptyExpenseForm(payerId = "", memberList: string[] = []): ExpenseForm {
  return {
    title: "",
    amount: "",
    payerId,
    category: categories[0],
    splitEqually: true,
    date: new Date().toISOString().slice(0, 10),
    splitAmong: [...memberList],
    splitPercentStr: Object.fromEntries(memberList.map((m) => [m, ""])),
  };
}

function resolveSplitAmong(selected: string[], groupMembers: string[]) {
  const filtered = selected.filter((m) => groupMembers.includes(m));
  return filtered.length > 0 ? filtered : [...groupMembers];
}

function resolveSplitPercentages(
  splitEqually: boolean,
  splitAmong: string[],
  splitPercentStr: Record<string, string>,
): Record<string, number> | undefined {
  if (splitEqually) return undefined;
  const raw = splitAmong.map((m) => {
    const s = splitPercentStr[m]?.trim();
    const n = s === "" || s === undefined ? NaN : Number(s);
    return { m, w: Number.isFinite(n) && n >= 0 ? n : 0 };
  });
  const sum = raw.reduce((s, x) => s + x.w, 0);
  if (sum <= 0) {
    return Object.fromEntries(splitAmong.map((m) => [m, 100 / Math.max(splitAmong.length, 1)]));
  }
  return Object.fromEntries(raw.map(({ m, w }) => [m, (w / sum) * 100]));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createProfile(name: string): RoommateProfile {
  return {
    name,
    phone: "+82 10-0000-0000",
    kakaoId: `${name.toLowerCase().replace(/\s+/g, ".")}.kr`,
    bankName: "Korean Bank",
    accountNumber: "000-000-000000",
    emergencyContact: "+977 98X-XXX-XXXX",
    notes: "New roommate profile. Add bank and contact details for faster settlement.",
  };
}

function formatMoney(amount: number, currency: Currency, krwPerNpr = FALLBACK_KRW_PER_NPR) {
  const meta = getCurrencyMeta(krwPerNpr);
  const converted = amount * meta[currency].rate;
  const maximumFractionDigits = currency === "USD" ? 2 : 0;

  return `${meta[currency].symbol} ${converted.toLocaleString("en-US", {
    maximumFractionDigits,
  })}`;
}

function transferOverrideKey(from: string, to: string) {
  return `${from}|${to}`;
}

function ExpenseInlineAmountEditor({
  expense,
  krwPerNpr,
  fmt,
  onSave,
}: {
  expense: Expense;
  krwPerNpr: number;
  fmt: (amount: number, cur?: Currency) => string;
  onSave: (id: number, amountNpr: number) => void;
}) {
  const [inputCurrency, setInputCurrency] = useState<"NPR" | "KRW">("NPR");
  const [amountStr, setAmountStr] = useState(() =>
    formatExpenseAmountForInput(expense.amount, "NPR", krwPerNpr),
  );

  useEffect(() => {
    setAmountStr(formatExpenseAmountForInput(expense.amount, inputCurrency, krwPerNpr));
  }, [expense.id, expense.amount, inputCurrency, krwPerNpr]);

  const parsedNpr = useMemo(
    () => parseExpenseAmountInput(amountStr, inputCurrency, krwPerNpr),
    [amountStr, inputCurrency, krwPerNpr],
  );

  const dirty =
    parsedNpr !== null && Math.abs(parsedNpr - expense.amount) > (expense.amount < 100 ? 0.001 : 0.01);

  function switchCurrency(next: "NPR" | "KRW") {
    const n = Number(String(amountStr).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) {
      if (inputCurrency === "NPR" && next === "KRW") {
        setAmountStr(String(Math.round(nprToKrw(n, krwPerNpr))));
      } else if (inputCurrency === "KRW" && next === "NPR") {
        setAmountStr(String(Math.round(krwToNpr(n, krwPerNpr) * 100) / 100));
      }
    }
    setInputCurrency(next);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-3 shadow-inner sm:max-w-[220px] lg:max-w-[260px]">
      <div className="flex rounded-xl bg-white/90 p-0.5 shadow-sm ring-1 ring-emerald-100/80">
        {(["NPR", "KRW"] as const).map((cur) => (
          <button
            key={cur}
            type="button"
            onClick={() => switchCurrency(cur)}
            className={`flex-1 rounded-lg py-2 text-[11px] font-black transition ${
              inputCurrency === cur ? "bg-emerald-700 text-white shadow" : "text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {cur === "NPR" ? "रु NPR" : "₩ KRW"}
          </button>
        ))}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={amountStr}
        onChange={(event) => setAmountStr(sanitizeDecimalTyping(event.target.value))}
        className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-base font-black text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
        placeholder="Enter amount"
        aria-label="Expense amount"
      />
      {parsedNpr !== null ? (
        <p className="text-[11px] font-bold leading-relaxed text-slate-600">
          {inputCurrency === "NPR" ? (
            <>
              ≈ ₩{Math.round(nprToKrw(parsedNpr, krwPerNpr)).toLocaleString()} · {fmt(parsedNpr, "NPR")}
            </>
          ) : (
            <>
              ≈ {fmt(parsedNpr, "NPR")} · ₩{Math.round(nprToKrw(parsedNpr, krwPerNpr)).toLocaleString()}
            </>
          )}
        </p>
      ) : (
        <p className="text-[11px] font-bold text-amber-700">Enter a valid positive number</p>
      )}
      <button
        type="button"
        disabled={!dirty || parsedNpr === null}
        onClick={() => parsedNpr !== null && onSave(expense.id, parsedNpr)}
        className="rounded-xl bg-emerald-700 py-2.5 text-sm font-black text-white shadow-md transition enabled:hover:-translate-y-0.5 enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save amount
      </button>
    </div>
  );
}

function SettlementTransferRowEditor({
  from,
  to,
  fromLabel,
  toLabel,
  amountNpr,
  baseAmountNpr,
  hasOverride,
  krwPerNpr,
  fmt,
  onSave,
  onReset,
  compact = false,
}: {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  amountNpr: number;
  baseAmountNpr: number;
  hasOverride: boolean;
  krwPerNpr: number;
  fmt: (amount: number, cur?: Currency) => string;
  onSave: (fromMember: string, toMember: string, npr: number) => void;
  onReset: (fromMember: string, toMember: string) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(!compact);
  const [inputCurrency, setInputCurrency] = useState<"NPR" | "KRW">("NPR");
  const [amountStr, setAmountStr] = useState(() =>
    formatExpenseAmountForInput(amountNpr, "NPR", krwPerNpr),
  );

  useEffect(() => {
    setAmountStr(formatExpenseAmountForInput(amountNpr, inputCurrency, krwPerNpr));
  }, [from, to, amountNpr, inputCurrency, krwPerNpr]);

  const parsedNpr = useMemo(
    () => parseExpenseAmountInput(amountStr, inputCurrency, krwPerNpr),
    [amountStr, inputCurrency, krwPerNpr],
  );

  const dirty =
    parsedNpr !== null && Math.abs(parsedNpr - amountNpr) > (amountNpr < 100 ? 0.001 : 0.01);

  function switchCurrency(next: "NPR" | "KRW") {
    const n = Number(String(amountStr).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) {
      if (inputCurrency === "NPR" && next === "KRW") {
        setAmountStr(String(Math.round(nprToKrw(n, krwPerNpr))));
      } else if (inputCurrency === "KRW" && next === "NPR") {
        setAmountStr(String(Math.round(krwToNpr(n, krwPerNpr) * 100) / 100));
      }
    }
    setInputCurrency(next);
  }

  if (compact && !editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-2.5 py-2">
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-emerald-950">
          {fromLabel} <span className="text-emerald-400">→</span> {toLabel}
        </p>
        <p className="shrink-0 text-xs font-black tabular-nums text-emerald-800">{fmt(amountNpr)}</p>
        {hasOverride ? (
          <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-black uppercase text-amber-800">
            Custom
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-emerald-700 transition active:bg-emerald-50"
          aria-label={`Edit transfer ${fromLabel} to ${toLabel}`}
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className={`border border-emerald-100 bg-white shadow-sm ${compact ? "rounded-lg p-3" : "rounded-2xl p-4"}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <p className={`font-black text-emerald-950 ${compact ? "text-xs" : "text-sm"}`}>
          {fromLabel} <span className="text-emerald-400">→</span> {toLabel}
        </p>
        <div className="flex items-center gap-1.5">
          {hasOverride ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
              Custom
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
              Auto
            </span>
          )}
          {compact ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition active:bg-slate-50"
              aria-label="Close editor"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex rounded-xl bg-emerald-50/80 p-0.5">
            {(["NPR", "KRW"] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => switchCurrency(cur)}
                className={`flex-1 rounded-lg py-2 text-[11px] font-black transition ${
                  inputCurrency === cur ? "bg-white text-emerald-900 shadow-sm" : "text-emerald-700"
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(event) => setAmountStr(sanitizeDecimalTyping(event.target.value))}
            className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-black text-emerald-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="Enter amount"
            aria-label={`Transfer amount ${fromLabel} to ${toLabel}`}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!dirty || parsedNpr === null}
            onClick={() => {
              if (parsedNpr !== null) {
                onSave(from, to, parsedNpr);
                if (compact) setEditing(false);
              }
            }}
            className={`rounded-xl bg-emerald-700 font-black text-white transition enabled:hover:bg-emerald-800 disabled:opacity-40 ${
              compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
            }`}
          >
            Save
          </button>
          {hasOverride ? (
            <button
              type="button"
              onClick={() => {
                onReset(from, to);
                if (compact) setEditing(false);
              }}
              className={`rounded-xl border border-emerald-200 bg-white font-black text-emerald-800 transition hover:bg-emerald-50 ${
                compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm"
              }`}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>
      {parsedNpr !== null ? (
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          ≈ {fmt(parsedNpr)} · ₩{Math.round(nprToKrw(parsedNpr, krwPerNpr)).toLocaleString()}
          {hasOverride ? (
            <span className="ml-2 text-emerald-700">· Calculated was {fmt(baseAmountNpr)}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function ExpenseDashboard() {
  const { user } = useProductAuth();
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [currency, setCurrency] = useState<Currency>("NPR");
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [members, setMembers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, RoommateProfile>>({});
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [newMember, setNewMember] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => emptyExpenseForm());
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateSnapshot>(fallbackExchangeRate);
  const [receiptPreview, setReceiptPreview] = useState<string | undefined>();
  const [receiptOcrText, setReceiptOcrText] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [settlementOverrides, setSettlementOverrides] = useState<Record<string, Record<string, number>>>({});
  const [shareModal, setShareModal] = useState<null | { text: string; pageUrl: string }>(null);
  const [shareModalKey, setShareModalKey] = useState(0);
  const [settlementShareOpen, setSettlementShareOpen] = useState(false);
  const [shareGeneratedAt, setShareGeneratedAt] = useState<Date | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({ companyName: "", roomNumber: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const skipNextSave = useRef(true);
  const prevTransferCount = useRef(0);
  const prevFormEntryCurrency = useRef<"NPR" | "KRW">("NPR");

  const openExpenseSettings = useCallback(() => {
    setSettingsDraft({ companyName, roomNumber });
    setSettingsSheetOpen(true);
  }, [companyName, roomNumber]);

  const saveExpenseSettings = useCallback(async () => {
    const nextCompany = settingsDraft.companyName.trim();
    const nextRoom = settingsDraft.roomNumber.trim();
    setSettingsSaving(true);
    try {
      setCompanyName(nextCompany);
      setRoomNumber(nextRoom);

      if (user?.id && isSupabaseConfigured()) {
        const client = getSupabaseBrowserClient();
        const saved = await saveExpenseWorkspaceSettings(client, user.id, {
          companyName: nextCompany,
          roomNumber: nextRoom,
        });
        setCompanyName(saved.companyName);
        setRoomNumber(saved.roomNumber);
        setSettingsDraft(saved);
        toast.success("Expense settings saved to your workspace");
      } else {
        toast.success("Expense settings saved on this device");
      }

      setSettingsSheetOpen(false);
    } catch {
      toast.error("Could not save expense settings");
    } finally {
      setSettingsSaving(false);
    }
  }, [settingsDraft.companyName, settingsDraft.roomNumber, user?.id]);

  const krwPerNpr = exchangeRate.krwPerNpr;
  const fmt = (amount: number, cur: Currency = currency) => formatMoney(amount, cur, krwPerNpr);

  const editingExpense = useMemo(
    () => (editingExpenseId ? expenses.find((expense) => expense.id === editingExpenseId) : undefined),
    [editingExpenseId, expenses],
  );

  const formEntryCurrency = useMemo((): "NPR" | "KRW" => {
    if (editingExpense) return editingExpense.amountCurrency ?? "NPR";
    return expenseEntryCurrency(currency);
  }, [editingExpense, currency]);

  useEffect(() => {
    const stored = loadDashboardState();
    if (stored) {
      setExpenses(stored.expenses);
      setMembers(stored.members);
      setProfiles(stored.profiles);
      setActivities(stored.activities ?? []);
      if (stored.exchangeRate) setExchangeRate(stored.exchangeRate);
      if (stored.settlementTransferOverrides) {
        setSettlementOverrides(stored.settlementTransferOverrides);
      }
      if (stored.displayCurrency) setCurrency(stored.displayCurrency);
      if (stored.companyName) setCompanyName(stored.companyName);
      if (stored.roomNumber) setRoomNumber(stored.roomNumber);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !user?.id || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const remote = await loadExpenseWorkspaceSettings(client, user.id);
        if (cancelled) return;
        if (remote.companyName || remote.roomNumber) {
          setCompanyName(remote.companyName);
          setRoomNumber(remote.roomNumber);
        }
      } catch {
        /* local fallback remains */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id]);

  useEffect(() => {
    void fetchLiveExchangeRate().then(setExchangeRate);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDashboardState({
      version: 3,
      expenses,
      members,
      profiles,
      activities,
      exchangeRate,
      displayCurrency: currency,
      settlementTransferOverrides: settlementOverrides,
      companyName,
      roomNumber,
    });
  }, [hydrated, expenses, members, profiles, activities, exchangeRate, currency, settlementOverrides, companyName, roomNumber]);

  useEffect(() => {
    if (!members.length) return;
    setForm((current) => {
      const payerId = members.includes(current.payerId) ? current.payerId : members[0];
      const splitAmong = resolveSplitAmong(current.splitAmong, members);
      if (payerId === current.payerId && splitAmong.length === current.splitAmong.length) return current;
      return { ...current, payerId, splitAmong };
    });
  }, [members, profiles]);

  useEffect(() => {
    if (!isModalOpen || editingExpenseId !== null) return;
    const nextCur = expenseEntryCurrency(currency);
    const prevCur = prevFormEntryCurrency.current;
    if (nextCur === prevCur) return;
    setForm((current) => {
      const n = Number(String(current.amount).replace(/,/g, ""));
      if (!Number.isFinite(n) || n <= 0) return current;
      const amount =
        prevCur === "NPR" && nextCur === "KRW"
          ? String(Math.round(nprToKrw(n, krwPerNpr)))
          : prevCur === "KRW" && nextCur === "NPR"
            ? String(Math.round(krwToNpr(n, krwPerNpr) * 100) / 100)
            : current.amount;
      return { ...current, amount };
    });
    prevFormEntryCurrency.current = nextCur;
  }, [currency, isModalOpen, editingExpenseId, krwPerNpr]);

  const monthKeys = useMemo(() => listMonthKeys(expenses), [expenses]);
  const monthExpenses = useMemo(
    () => filterExpensesByMonth(expenses, selectedMonthKey),
    [expenses, selectedMonthKey],
  );

  const appendActivity = useCallback((activity: Omit<TimelineActivity, "id" | "timestamp">) => {
    setActivities((current) => [createActivity(activity), ...current]);
  }, []);

  const { balances, equalSplitAmount, memberExpectedShare, paidByMember, totalExpense, transfers: rawTransfers } =
    useMemo(() => getSettlement(members, monthExpenses), [members, monthExpenses]);

  const splitPreviewShares = useMemo(() => {
    const amount = parseExpenseAmountInput(form.amount, formEntryCurrency, krwPerNpr);
    if (amount === null || amount <= 0) return null;
    const splitAmong = resolveSplitAmong(form.splitAmong, members);
    const splitPercentages = resolveSplitPercentages(form.splitEqually, splitAmong, form.splitPercentStr);
    return expenseAttributedShares(
      {
        id: 0,
        title: "",
        amount,
        payerId: form.payerId,
        category: form.category,
        splitEqually: form.splitEqually,
        date: form.date,
        splitAmong: splitAmong.length === members.length ? undefined : splitAmong,
        splitPercentages: form.splitEqually ? undefined : splitPercentages,
      },
      members,
    );
  }, [form, members, krwPerNpr, formEntryCurrency]);

  const customPercentSum = useMemo(() => {
    if (form.splitEqually) return null;
    const splitAmong = resolveSplitAmong(form.splitAmong, members);
    return splitAmong.reduce((sum, m) => {
      const t = form.splitPercentStr[m]?.trim();
      const n = t === "" || t === undefined ? NaN : Number(t);
      return sum + (Number.isFinite(n) && n >= 0 ? n : 0);
    }, 0);
  }, [form.splitEqually, form.splitAmong, form.splitPercentStr, members]);

  const transfers = useMemo(() => {
    const monthOv = settlementOverrides[selectedMonthKey] ?? {};
    return rawTransfers.map((t) => ({
      ...t,
      amount: monthOv[transferOverrideKey(t.from, t.to)] ?? t.amount,
    }));
  }, [rawTransfers, settlementOverrides, selectedMonthKey]);
  const isSettled = transfers.length === 0 && monthExpenses.length > 0;
  const receivableTotal = useMemo(
    () => Object.values(balances).reduce((sum, balance) => sum + Math.max(0, balance), 0),
    [balances],
  );
  const payableTotal = useMemo(
    () => Object.values(balances).reduce((sum, balance) => sum + Math.max(0, -balance), 0),
    [balances],
  );
  const recentExpenses = useMemo(
    () => [...monthExpenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 2),
    [monthExpenses],
  );

  useEffect(() => {
    if (prevTransferCount.current > 0 && transfers.length === 0 && monthExpenses.length > 0) {
      setShowCelebration(true);
    }
    prevTransferCount.current = transfers.length;
  }, [transfers.length, monthExpenses.length]);

  const contributorTotals = members.map((memberId) => ({
    id: memberId,
    name: memberDisplayName(memberId, profiles),
    total: paidByMember[memberId] ?? 0,
  }));
  const highestContributor = contributorTotals.reduce(
    (highest, contributor) => (contributor.total > highest.total ? contributor : highest),
    { name: "N/A", total: 0 },
  );

  const categoryTotals = categories.map((category) =>
    monthExpenses
      .filter((expense) => normalizeCategory(expense.category) === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  );

  const monthlyComparison = monthlyComparisonData(expenses, currency, 6, krwPerNpr);
  const monthlyData = {
    labels: monthlyComparison.labels,
    datasets: [
      {
        label: "Monthly expenses",
        data: monthlyComparison.data,
        backgroundColor: "#007a3d",
        borderRadius: 14,
      },
    ],
  };

  const categoryData = {
    labels: categories,
    datasets: [
      {
        data: categoryTotals.map((amount) => amount * getCurrencyMeta(krwPerNpr)[currency].rate),
        backgroundColor: ["#007a3d", "#064e3b", "#d6a83e", "#22c55e", "#0f766e", "#94a3b8"],
        borderColor: "#ffffff",
        borderWidth: 3,
      },
    ],
  };
  const dashboardStats: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accent?: "default" | "receivable" | "payable";
  }> = [
    {
      label: "Group spend",
      value: fmt(totalExpense),
      icon: ReceiptText,
    },
    {
      label: "Top payer",
      value: highestContributor.total > 0 ? fmt(highestContributor.total) : "—",
      icon: Crown,
    },
    {
      label: "लिनु पर्ने",
      value: fmt(receivableTotal),
      icon: ArrowDown,
      accent: "receivable",
    },
    {
      label: "दिनु पर्ने",
      value: fmt(payableTotal),
      icon: ArrowUp,
      accent: "payable",
    },
  ];

  function addMember() {
    const name = newMember.trim();
    if (!name) return;
    if (members.some((memberId) => memberDisplayName(memberId, profiles).toLowerCase() === name.toLowerCase())) {
      return;
    }
    const memberId = generateMemberId();
    setMembers((current) => [...current, memberId]);
    setProfiles((current) => ({
      ...current,
      [memberId]: current[memberId] ?? createProfile(name),
    }));
    appendActivity({
      type: "member_added",
      monthKey: selectedMonthKey,
      memberId,
      message: `${name} joined the expense group`,
    });
    setNewMember("");
  }

  function removeMember(memberId: string) {
    if (members.length <= 2) return;
    const remaining = members.filter((member) => member !== memberId);
    setMembers((current) => current.filter((member) => member !== memberId));
    setProfiles((current) => {
      const next = { ...current };
      delete next[memberId];
      return next;
    });
    setExpenses((current) =>
      current
        .filter((expense) => expense.payerId !== memberId)
        .map((expense) => {
          if (!expense.splitAmong?.includes(memberId)) return expense;
          const nextAmong = expense.splitAmong.filter((m) => m !== memberId);
          const nextPct =
            expense.splitPercentages &&
            Object.fromEntries(Object.entries(expense.splitPercentages).filter(([k]) => k !== memberId));
          return {
            ...expense,
            splitAmong: nextAmong.length > 0 ? nextAmong : undefined,
            splitPercentages: nextPct && Object.keys(nextPct).length > 0 ? nextPct : undefined,
          };
        }),
    );
    setSelectedMember((current) => (current === memberId ? null : current));
    setForm((current) => {
      const payerNext = current.payerId === memberId ? remaining[0] ?? current.payerId : current.payerId;
      const filteredAmong = current.splitAmong.filter((m) => m !== memberId);
      const splitAmongNext =
        filteredAmong.length > 0 ? filteredAmong : remaining.length > 0 ? remaining : current.splitAmong;
      return { ...current, payerId: payerNext, splitAmong: splitAmongNext };
    });
  }

  function openAddExpenseModal() {
    setEditingExpenseId(null);
    setReceiptPreview(undefined);
    setReceiptOcrText("");
    prevFormEntryCurrency.current = expenseEntryCurrency(currency);
    setForm(emptyExpenseForm(members[0], members));
    setIsModalOpen(true);
  }

  function openEditExpenseModal(expense: Expense) {
    setEditingExpenseId(expense.id);
    const entryCur = expense.amountCurrency ?? "NPR";
    const baseAmong =
      expense.splitAmong && expense.splitAmong.length > 0
        ? expense.splitAmong.filter((m) => members.includes(m))
        : [...members];
    const splitAmong = baseAmong.length > 0 ? baseAmong : [...members];
    const splitPercentStr: Record<string, string> = Object.fromEntries(
      members.map((m) => {
        const v = expense.splitPercentages?.[m];
        return [m, v != null && Number.isFinite(v) ? String(Math.round(v * 100) / 100) : ""];
      }),
    );
    setForm({
      title: expense.title,
      amount: formatExpenseAmountForInput(expense.amount, entryCur, krwPerNpr),
      payerId: expense.payerId,
      category: expense.category,
      splitEqually: expense.splitEqually ?? true,
      date: expense.date,
      splitAmong,
      splitPercentStr,
    });
    setReceiptPreview(expense.receiptImage);
    setReceiptOcrText("");
    setIsModalOpen(true);
  }

  function closeExpenseModal() {
    setIsModalOpen(false);
    setEditingExpenseId(null);
    setReceiptPreview(undefined);
    setReceiptOcrText("");
    setForm(emptyExpenseForm(members[0], members));
  }

  function saveExpenseAmount(id: number, amountNpr: number) {
    let snapshot: Expense | undefined;
    setExpenses((current) => {
      snapshot = current.find((e) => e.id === id);
      return current.map((e) => (e.id === id ? { ...e, amount: amountNpr } : e));
    });
    if (snapshot) {
      appendActivity({
        type: "expense_edited",
        monthKey: expenseMonthKey(snapshot.date),
        memberId: snapshot.payerId,
        title: snapshot.title,
        amount: amountNpr,
        category: normalizeCategory(snapshot.category),
        message: `${memberDisplayName(snapshot.payerId, profiles)} updated amount for ${snapshot.title}`,
      });
    }
  }

  const saveTransferOverride = useCallback(
    (from: string, to: string, npr: number) => {
      const key = transferOverrideKey(from, to);
      setSettlementOverrides((prev) => ({
        ...prev,
        [selectedMonthKey]: { ...(prev[selectedMonthKey] ?? {}), [key]: npr },
      }));
    },
    [selectedMonthKey],
  );

  const resetTransferOverride = useCallback(
    (from: string, to: string) => {
      const key = transferOverrideKey(from, to);
      setSettlementOverrides((prev) => {
        const nextMonth = { ...(prev[selectedMonthKey] ?? {}) };
        delete nextMonth[key];
        return { ...prev, [selectedMonthKey]: nextMonth };
      });
    },
    [selectedMonthKey],
  );

  function saveExpense() {
    const amount = parseExpenseAmountInput(form.amount, formEntryCurrency, krwPerNpr);
    if (!form.title.trim() || amount === null || !form.payerId) return;
    const splitAmong = resolveSplitAmong(form.splitAmong, members);
    if (splitAmong.length === 0) return;
    const splitPercentages = resolveSplitPercentages(form.splitEqually, splitAmong, form.splitPercentStr);
    const nextExpense: Expense = {
      id: editingExpenseId ?? Date.now(),
      title: form.title.trim(),
      amount,
      payerId: form.payerId,
      category: form.category,
      splitEqually: form.splitEqually,
      date: form.date,
      receiptImage: receiptPreview,
      splitAmong: splitAmong.length === members.length ? undefined : splitAmong,
      splitPercentages: form.splitEqually ? undefined : splitPercentages,
      amountCurrency: formEntryCurrency,
    };

    const monthKey = expenseMonthKey(nextExpense.date);

    if (editingExpenseId) {
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === editingExpenseId
            ? { ...nextExpense, receiptImage: receiptPreview ?? expense.receiptImage }
            : expense,
        ),
      );
      appendActivity({
        type: "expense_edited",
        monthKey,
        memberId: nextExpense.payerId,
        title: nextExpense.title,
        amount: nextExpense.amount,
        category: normalizeCategory(nextExpense.category),
        message: `${memberDisplayName(nextExpense.payerId, profiles)} updated ${nextExpense.title}`,
      });
    } else {
      setExpenses((current) => [nextExpense, ...current]);
      appendActivity({
        type: "expense_added",
        monthKey,
        memberId: nextExpense.payerId,
        title: nextExpense.title,
        amount: nextExpense.amount,
        category: normalizeCategory(nextExpense.category),
        message: `${memberDisplayName(nextExpense.payerId, profiles)} added ${nextExpense.title}`,
      });
    }

    if (!monthKeys.includes(monthKey)) {
      setSelectedMonthKey(monthKey);
    }

    closeExpenseModal();
  }

  function confirmDeleteExpense() {
    if (!expenseToDelete) return;
    setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));
    appendActivity({
      type: "expense_deleted",
      monthKey: expenseMonthKey(expenseToDelete.date),
      memberId: expenseToDelete.payerId,
      title: expenseToDelete.title,
      category: normalizeCategory(expenseToDelete.category),
      message: `${memberDisplayName(expenseToDelete.payerId, profiles)} removed ${expenseToDelete.title}`,
    });
    setExpenseToDelete(null);
  }

  const settlementMarkedComplete = useMemo(
    () =>
      activities.some(
        (activity) => activity.type === "settlement" && activity.monthKey === selectedMonthKey,
      ),
    [activities, selectedMonthKey],
  );

  const markSettlementComplete = useCallback(() => {
    const monthLabel = formatMonthLabel(selectedMonthKey);
    console.log("[settlement-complete] handler invoked", {
      monthKey: selectedMonthKey,
      monthLabel,
      transferCount: transfers.length,
      expenseCount: monthExpenses.length,
      alreadyMarked: settlementMarkedComplete,
    });

    if (settlementMarkedComplete) {
      console.log("[settlement-complete] skipped — already marked for month");
      toast.info(`${monthLabel} settlement is already marked complete`);
      return;
    }

    if (monthExpenses.length === 0) {
      console.log("[settlement-complete] blocked — no expenses for month");
      toast.error("Add expenses for this month before marking settlement complete");
      return;
    }

    const activity = {
      type: "settlement" as const,
      monthKey: selectedMonthKey,
      message: `Settlement completed for ${monthLabel}`,
    };
    console.log("[settlement-complete] persisting activity", activity);
    appendActivity(activity);

    console.log("[settlement-complete] updating UI — celebration + toast");
    setShowCelebration(true);
    toast.success(`${monthLabel} settlement marked complete`);
  }, [
    appendActivity,
    monthExpenses.length,
    selectedMonthKey,
    settlementMarkedComplete,
    transfers.length,
  ]);

  const settlementShareInput = useMemo(
    () => ({
      monthKey: selectedMonthKey,
      members,
      memberLabels: memberNameMap(members, profiles),
      memberAvatars: Object.fromEntries(members.map((id) => [id, profiles[id]?.avatarUrl])),
      balances,
      paidByMember,
      memberExpectedShare,
      totalExpenseNpr: totalExpense,
      transfers,
      transferLabels: transfers.map((t) => ({
        fromName: memberDisplayName(t.from, profiles),
        toName: memberDisplayName(t.to, profiles),
      })),
      currency,
      krwPerNpr,
    }),
    [
      selectedMonthKey,
      members,
      profiles,
      balances,
      paidByMember,
      memberExpectedShare,
      totalExpense,
      transfers,
      currency,
      krwPerNpr,
    ],
  );

  const settlementShareData = useMemo(
    () =>
      buildSettlementShareData({
        ...settlementShareInput,
        companyName,
        roomNumber,
        generatedAt: shareGeneratedAt ?? new Date(),
      }),
    [settlementShareInput, companyName, roomNumber, shareGeneratedAt],
  );

  const freshSettlementShareData = useCallback(
    () =>
      buildSettlementShareData({
        ...settlementShareInput,
        companyName,
        roomNumber,
        generatedAt: new Date(),
      }),
    [settlementShareInput, companyName, roomNumber],
  );

  const openSettlementShare = useCallback(() => {
    setShareGeneratedAt(new Date());
    setSettlementShareOpen(true);
  }, []);

  const downloadSettlementPng = useCallback(async () => {
    try {
      await downloadSettlementSharePng(
        freshSettlementShareData(),
        `roommate-settlement-${selectedMonthKey}.png`,
      );
      toast.success("Settlement image saved");
    } catch {
      toast.error("Could not export PNG");
    }
  }, [freshSettlementShareData, selectedMonthKey]);

  const downloadSettlementPdf = useCallback(async () => {
    try {
      await downloadSettlementSharePdf(
        freshSettlementShareData(),
        `roommate-settlement-${selectedMonthKey}.pdf`,
      );
      toast.success("Settlement PDF saved");
    } catch {
      toast.error("Could not export PDF");
    }
  }, [freshSettlementShareData, selectedMonthKey]);

  const buildShareSummaryText = useCallback(() => {
    return buildRoommateExpenseSummaryText({
      monthKey: selectedMonthKey,
      members,
      memberLabels: memberNameMap(members, profiles),
      memberExpectedShare,
      totalExpenseNpr: totalExpense,
      equalSplitNpr: equalSplitAmount,
      transfers: transfers.map((t) => ({
        from: memberDisplayName(t.from, profiles),
        to: memberDisplayName(t.to, profiles),
        amountNpr: t.amount,
      })),
      formatAmount: (n) => formatMoney(n, currency, krwPerNpr),
    });
  }, [
    selectedMonthKey,
    members,
    profiles,
    memberExpectedShare,
    totalExpense,
    equalSplitAmount,
    transfers,
    currency,
    krwPerNpr,
  ]);

  const handleShareSummary = useCallback(async () => {
    const text = buildShareSummaryText();
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";

    if (!isDesktopShareUi() && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Roommate Expense Summary",
          text,
          url: pageUrl,
        });
        toast.success("Summary shared successfully");
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }

    setShareModalKey((k) => k + 1);
    setShareModal({ text, pageUrl });
  }, [buildShareSummaryText]);

  const selectedProfile = selectedMember ? profiles[selectedMember] ?? createProfile(selectedMember) : null;

  return (
    <main
      className={`min-h-screen bg-[#f6f8f7] px-3 pt-3 text-emerald-950 sm:px-5 lg:px-10 ${
        activeTab === "Settlement"
          ? "pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))]"
          : "pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
      }`}
    >
      <div className="mx-auto max-w-lg lg:max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 transition active:text-emerald-800"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="flex items-center gap-1.5">
            {activeTab === "Settlement" ? (
              <button
                type="button"
                onClick={openSettlementShare}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-700 ring-1 ring-slate-200/80 transition active:bg-emerald-50"
                aria-label="Share settlement"
              >
                <Share2 size={15} />
              </button>
            ) : null}
            <div className="flex gap-0.5 rounded-lg bg-white p-0.5 ring-1 ring-slate-200/80">
            {(["NPR", "KRW", "USD"] as Currency[]).map((item) => (
              <button
                key={item}
                onClick={() => setCurrency(item)}
                className={`rounded-md px-2 py-1 text-[10px] font-black transition ${
                  currency === item ? "bg-emerald-600 text-white" : "text-slate-500"
                }`}
              >
                {item}
              </button>
            ))}
            </div>
          </div>
        </div>

        {activeTab === "Dashboard" && (
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <motion.section
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: motionEase } } }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#065f46] to-[#047857] p-3.5 text-white shadow-lg shadow-emerald-900/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100/75">Roommate Expenses</p>
                  <p className="mt-1 text-[11px] font-medium text-emerald-100/80">
                    ₩1 = Rs {exchangeRate.nprPerKrw.toFixed(4)} · {formatRelativeTime(exchangeRate.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionsSheetOpen(true)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition active:bg-white/20"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-emerald-100/70">Total balance</p>
                  <p className="text-[1.75rem] font-black leading-none tabular-nums tracking-tight">{fmt(totalExpense)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    isSettled ? "bg-white/15 text-emerald-50" : "bg-amber-400/25 text-amber-50"
                  }`}
                >
                  {isSettled ? "Settled" : `${transfers.length} due`}
                </span>
              </div>
            </motion.section>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: motionEase } } }}>
              <CompactGroupMembersRow
                balances={balances}
                members={members}
                profiles={profiles}
                onOpenProfile={setSelectedMember}
                onViewAll={() => setActiveTab("Members")}
              />
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: motionEase } } }}>
              <ExpenseMonthPicker
                compact
                monthKeys={monthKeys}
                selectedMonthKey={selectedMonthKey}
                onChange={setSelectedMonthKey}
              />
            </motion.div>

            <motion.section
              aria-label="Expense KPIs"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: motionEase } } }}
              className="grid grid-cols-2 gap-1.5"
            >
              {dashboardStats.map((stat) => (
                <ExpenseKpiCard key={stat.label} {...stat} />
              ))}
            </motion.section>

            <motion.section
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: motionEase } } }}
              className="rounded-xl border border-slate-200/80 bg-white p-2.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-500">Recent</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("Expenses")}
                  className="text-[10px] font-bold text-emerald-700"
                >
                  All
                </button>
              </div>
              {recentExpenses.length === 0 ? (
                <p className="py-3 text-center text-[11px] font-semibold text-slate-400">No expenses yet</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-emerald-950">{expense.title}</p>
                        <p className="truncate text-[10px] text-slate-400">
                          {resolveExpensePayerName(expense, profiles)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black tabular-nums text-emerald-800">{fmt(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </motion.div>
        )}

        {activeTab !== "History" && activeTab !== "AI Insights" && activeTab !== "Dashboard" && (
          <div className={activeTab === "Settlement" ? "mb-2" : "mb-3"}>
            <ExpenseMonthPicker
              dense={activeTab === "Settlement"}
              monthKeys={monthKeys}
              selectedMonthKey={selectedMonthKey}
              onChange={setSelectedMonthKey}
            />
          </div>
        )}

        {activeTab === "Members" && (
          <section className="mb-3">
            <GroupMembers
              balances={balances}
              fmt={fmt}
              members={members}
              newMember={newMember}
              paidByMember={paidByMember}
              profiles={profiles}
              setNewMember={setNewMember}
              addMember={addMember}
              onOpenProfile={setSelectedMember}
              removeMember={removeMember}
            />
          </section>
        )}

        {activeTab === "Expenses" && (
          <section className="mb-3 glass-card rounded-2xl p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Expense Ledger</h2>
              <button
                onClick={openAddExpenseModal}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-emerald-800"
              >
                <Plus size={16} /> Add Expense
              </button>
            </div>
            <div className="space-y-3">
              {monthExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center text-sm font-bold text-slate-600">
                  यो महिनामा कुनै खर्च छैन। Add expense to begin tracking.
                </div>
              ) : null}
              {monthExpenses.map((expense) => (
                <article
                  key={expense.id}
                  className="flex flex-col gap-4 rounded-2xl border border-emerald-50/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(0,122,61,0.12)] lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {expense.receiptImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={expense.receiptImage}
                        alt={`${expense.title} receipt`}
                        className="h-16 w-16 shrink-0 rounded-xl border border-emerald-100 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-black text-emerald-950">{expense.title}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {expense.category} · Paid by {resolveExpensePayerName(expense, profiles)} · {expense.date}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {(() => {
                          const n =
                            expense.splitAmong && expense.splitAmong.length > 0
                              ? expense.splitAmong.filter((m) => members.includes(m)).length
                              : members.length;
                          return expense.splitEqually !== false ? `Equal · ${n}` : `Custom % · ${n}`;
                        })()}
                      </span>
                    </div>
                  </div>
                  <ExpenseInlineAmountEditor
                    expense={expense}
                    krwPerNpr={krwPerNpr}
                    fmt={fmt}
                    onSave={saveExpenseAmount}
                  />
                  <div className="flex shrink-0 gap-2 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => openEditExpenseModal(expense)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 lg:flex-none"
                    >
                      <Pencil size={14} /> Full edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(expense)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 px-3 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100 lg:flex-none"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "Settlement" && (
          <section className="mb-2">
            <SettlementPanel
              balances={balances}
              equalSplitAmount={equalSplitAmount}
              memberExpectedShare={memberExpectedShare}
              paidByMember={paidByMember}
              rawTransfers={rawTransfers}
              displayTransfers={transfers}
              fmt={fmt}
              krwPerNpr={krwPerNpr}
              profiles={profiles}
              monthOverrideMap={settlementOverrides[selectedMonthKey] ?? {}}
              onSaveTransfer={saveTransferOverride}
              onResetTransfer={resetTransferOverride}
              onMarkComplete={markSettlementComplete}
              settlementMarkedComplete={settlementMarkedComplete}
              onShareSettlement={openSettlementShare}
              onDownloadPng={() => void downloadSettlementPng()}
              onDownloadPdf={() => void downloadSettlementPdf()}
            />
          </section>
        )}

        {activeTab === "Analytics" && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: motionEase }}
            className="mb-3 space-y-3"
          >
            <div className="rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="text-emerald-700" size={18} />
                <h2 className="text-base font-black text-emerald-950">Monthly trend</h2>
              </div>
              <div className="h-56">
                <Bar data={monthlyData} options={chartOptions(currency, krwPerNpr)} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <PieChart className="text-emerald-700" size={18} />
                <h2 className="text-base font-black text-emerald-950">Categories</h2>
              </div>
              <div className="mx-auto h-52 max-w-xs">
                <Pie data={categoryData} options={categoryPieOptions()} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">By category</h3>
              <div className="divide-y divide-slate-100">
                {categories.map((category, index) => (
                  <div key={category} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-semibold text-emerald-950">{category}</span>
                    <span className="text-sm font-black tabular-nums text-emerald-800">{fmt(categoryTotals[index] ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === "AI Insights" && (
          <ExpenseAiInsightsPanel
            expenses={expenses}
            members={members}
            profiles={profiles}
            selectedMonthKey={selectedMonthKey}
            currency={currency}
            krwPerNpr={krwPerNpr}
            exchangeRate={exchangeRate}
          />
        )}

        {activeTab === "History" && (
          <ExpenseHistoryPanel
            expenses={expenses}
            members={members}
            profiles={profiles}
            currency={currency}
            activities={activities}
            krwPerNpr={krwPerNpr}
          />
        )}
      </div>

      <SettlementCelebration show={showCelebration} onComplete={() => setShowCelebration(false)} />

      <ExpenseFabSpeedDial
        open={speedDialOpen}
        onToggle={() => setSpeedDialOpen((v) => !v)}
        onClose={() => setSpeedDialOpen(false)}
        onAddExpense={openAddExpenseModal}
        onAddIncome={openAddExpenseModal}
        onAddTransfer={() => {
          setSpeedDialOpen(false);
          setActiveTab("Settlement");
        }}
        onScanReceipt={openAddExpenseModal}
        raised={activeTab === "Settlement"}
      />

      <ExpenseBottomNav
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setSpeedDialOpen(false);
        }}
      />

      <ExpenseBottomSheet open={actionsSheetOpen} onClose={() => setActionsSheetOpen(false)} title="More">
        <div className="space-y-1 p-2">
          {[
            { label: "Expense settings", icon: Settings, action: openExpenseSettings },
            { label: "Download PDF", icon: Download, action: () => window.print() },
            { label: "Share summary", icon: Share2, action: () => void handleShareSummary() },
            { label: "AI Insights", icon: Sparkles, action: () => setActiveTab("AI Insights") },
            { label: "Full history", icon: History, action: () => setActiveTab("History") },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setActionsSheetOpen(false);
                item.action();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-emerald-950 transition active:bg-slate-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <item.icon size={17} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </ExpenseBottomSheet>

      <ExpenseBottomSheet
        open={settingsSheetOpen}
        onClose={() => !settingsSaving && setSettingsSheetOpen(false)}
        title="Expense settings"
        subtitle="Company and room details auto-fill settlement reports"
      >
        <div className="space-y-3 px-3 pb-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Company name
            </span>
            <input
              value={settingsDraft.companyName}
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, companyName: event.target.value }))
              }
              className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="KP Electric"
              autoComplete="organization"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
              Room number
            </span>
            <input
              value={settingsDraft.roomNumber}
              onChange={(event) =>
                setSettingsDraft((current) => ({ ...current, roomNumber: event.target.value }))
              }
              className="w-full rounded-xl border border-emerald-100 px-3 py-2.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="305"
              inputMode="text"
              autoComplete="off"
            />
          </label>
          <p className="text-[11px] font-semibold leading-5 text-slate-500">
            These values appear on settlement PNG, PDF, and share cards — for example{" "}
            <span className="font-black text-emerald-800">KP Electric • Room 305</span> with a{" "}
            <span className="font-black text-emerald-800">ROOM 305</span> badge.
          </p>
          <button
            type="button"
            disabled={settingsSaving}
            onClick={() => void saveExpenseSettings()}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-black text-white transition active:bg-emerald-800 disabled:opacity-60"
          >
            {settingsSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </ExpenseBottomSheet>

      <ExpenseBottomSheet
        open={isModalOpen}
        onClose={closeExpenseModal}
        title={editingExpenseId ? "Edit expense" : "Add expense"}
        subtitle={editingExpenseId ? "Edit expense details" : "Quick entry · uses dashboard currency"}
      >
        <div className="px-3 pb-3 sm:px-4">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2">
              <label className="sm:col-span-2">
                <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  Expense title
                </span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Mart expenses"
                />
              </label>

              <div className="sm:col-span-2 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-2.5 shadow-inner sm:p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-800 sm:text-xs">
                    Amount
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-emerald-800 ring-1 ring-emerald-100 sm:text-xs">
                    Currency: {formEntryCurrency}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: sanitizeDecimalTyping(event.target.value) }))
                  }
                  className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-base font-black text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:text-lg"
                  placeholder={formEntryCurrency === "KRW" ? "Enter amount in ₩" : "Enter amount in रु"}
                  aria-label={`Expense amount in ${formEntryCurrency}`}
                />
                {(() => {
                  const preview = parseExpenseAmountInput(form.amount, formEntryCurrency, krwPerNpr);
                  if (preview === null || !form.amount) return null;
                  return (
                    <p className="mt-1.5 text-center text-[10px] font-bold leading-snug text-emerald-800 sm:text-left sm:text-xs">
                      {formEntryCurrency === "KRW" ? (
                        <>≈ {fmt(preview, "NPR")} NPR</>
                      ) : (
                        <>≈ ₩{Math.round(nprToKrw(preview, krwPerNpr)).toLocaleString()}</>
                      )}
                      {currency !== formEntryCurrency ? (
                        <span className="ml-2">· {fmt(preview, currency)}</span>
                      ) : null}
                    </p>
                  );
                })()}
              </div>
              <label>
                <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  Payer
                </span>
                <select
                  value={form.payerId}
                  onChange={(event) => setForm((current) => ({ ...current, payerId: event.target.value }))}
                  className="w-full rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {members.map((memberId) => (
                    <option key={memberId} value={memberId}>
                      {memberDisplayName(memberId, profiles)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 sm:max-w-[12rem]">
                <span className="mb-0.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  <CalendarDays size={12} /> Date
                </span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-xl border border-emerald-100 px-2.5 py-2 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="sm:col-span-2">
                <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-2.5 shadow-inner ring-1 ring-emerald-100/50 sm:p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-900/15">
                        <UsersRound size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 sm:text-[10px]">
                          Split
                        </p>
                        <p className="truncate text-xs font-black text-emerald-950 sm:text-sm">Who shares this?</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, splitAmong: [...members] }))}
                      className="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 shadow-sm transition hover:bg-emerald-50 sm:text-[11px]"
                    >
                      Select all
                    </button>
                  </div>

                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected</p>
                  <div className="mb-2 flex min-h-[32px] flex-wrap gap-1.5">
                    {resolveSplitAmong(form.splitAmong, members).map((memberId) => (
                      <span
                        key={memberId}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-black text-emerald-900 shadow-sm sm:px-2.5 sm:text-xs"
                      >
                        {memberDisplayName(memberId, profiles)}
                        <button
                          type="button"
                          aria-label={`Remove ${memberDisplayName(memberId, profiles)} from split`}
                          disabled={resolveSplitAmong(form.splitAmong, members).length <= 1}
                          onClick={() => {
                            setForm((c) => {
                              const cur = resolveSplitAmong(c.splitAmong, members);
                              if (cur.length <= 1) return c;
                              return { ...c, splitAmong: cur.filter((x) => x !== memberId) };
                            });
                          }}
                          className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-5 sm:w-5"
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mb-2 max-h-[min(200px,32vh)] space-y-1 overflow-y-auto overscroll-y-contain rounded-lg border border-white/80 bg-white/80 p-1.5 shadow-inner sm:max-h-[min(220px,28vh)]">
                    {members.map((memberId) => {
                      const activeSplit = resolveSplitAmong(form.splitAmong, members);
                      const checked = activeSplit.includes(memberId);
                      const displayName = memberDisplayName(memberId, profiles);
                      return (
                        <label
                          key={memberId}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                            checked ? "bg-emerald-50 ring-1 ring-emerald-200/80" : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setForm((c) => {
                                const cur = resolveSplitAmong(c.splitAmong, members);
                                if (cur.includes(memberId)) {
                                  if (cur.length <= 1) return c;
                                  return { ...c, splitAmong: cur.filter((x) => x !== memberId) };
                                }
                                return { ...c, splitAmong: [...cur, memberId] };
                              });
                            }}
                            className="h-3.5 w-3.5 shrink-0 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600 sm:h-4 sm:w-4"
                          />
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-white text-[10px] font-black text-emerald-900 ring-1 ring-emerald-100 sm:h-8 sm:w-8 sm:text-[11px]">
                            {initials(displayName)}
                          </span>
                          <span className="min-w-0 flex-1 text-xs font-bold text-emerald-950 sm:text-sm">{displayName}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border border-emerald-100/80 bg-white/90 p-2 sm:flex-row sm:items-center sm:justify-between sm:p-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Split mode</p>
                      <p className="text-xs font-black text-emerald-950">Equal NPR / person</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.splitEqually}
                      onClick={() => setForm((c) => ({ ...c, splitEqually: !c.splitEqually }))}
                      className={`relative h-8 w-12 shrink-0 self-end rounded-full transition-colors sm:self-auto ${
                        form.splitEqually ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                          form.splitEqually ? "translate-x-[calc(3rem-1.75rem-0.25rem)]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {!form.splitEqually ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Weights (%)</p>
                        <p
                          className={`text-[10px] font-black ${
                            customPercentSum !== null && Math.abs(customPercentSum - 100) > 0.5
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          Σ {customPercentSum?.toFixed(1) ?? "0"}% · normalized on save
                        </p>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {resolveSplitAmong(form.splitAmong, members).map((memberId) => (
                          <label key={memberId} className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-500">
                              {memberDisplayName(memberId, profiles)}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="%"
                              value={form.splitPercentStr[memberId] ?? ""}
                              onChange={(e) =>
                                setForm((c) => ({
                                  ...c,
                                  splitPercentStr: {
                                    ...c.splitPercentStr,
                                    [memberId]: sanitizeDecimalTyping(e.target.value),
                                  },
                                }))
                              }
                              className="w-full rounded-md border border-emerald-100 bg-white px-2 py-1 text-xs font-black text-emerald-950 outline-none focus:border-emerald-600"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {splitPreviewShares ? (
                    <div className="mt-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-2 sm:p-2.5">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                        Preview (NPR)
                      </p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {(() => {
                          const active = resolveSplitAmong(form.splitAmong, members);
                          return members.map((memberId) => {
                            const v = splitPreviewShares[memberId] ?? 0;
                            if (v <= 0 && !active.includes(memberId)) return null;
                            return (
                              <div
                                key={memberId}
                                className="flex items-center justify-between rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-emerald-100/60 sm:text-xs"
                              >
                                <span className="font-black text-emerald-950">
                                  {memberDisplayName(memberId, profiles)}
                                </span>
                                <span className="tabular-nums text-emerald-800">{fmt(v)}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <ExpenseReceiptUpload
                compact
                value={receiptPreview}
                onChange={setReceiptPreview}
                onOcrText={setReceiptOcrText}
              />
              {receiptOcrText.trim() ? (
                <details className="mt-2 rounded-lg border border-emerald-100/80 bg-white/80 px-2 py-1.5 text-[10px] font-bold text-slate-600 sm:text-xs">
                  <summary className="cursor-pointer font-black text-emerald-800">OCR text (tap to expand)</summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-slate-700">
                    {receiptOcrText}
                  </pre>
                </details>
              ) : null}
          </div>

          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={closeExpenseModal}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveExpense}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white"
            >
              {editingExpenseId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </ExpenseBottomSheet>

      <ExpenseBottomSheet
        open={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        title="Delete expense?"
      >
        <div className="px-4 pb-2">
          <p className="text-sm text-slate-500">
            Remove <span className="font-bold text-emerald-900">{expenseToDelete?.title}</span> and recalculate
            balances.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setExpenseToDelete(null)}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteExpense}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-black text-white"
            >
              Delete
            </button>
          </div>
        </div>
      </ExpenseBottomSheet>

      {selectedMember && selectedProfile && (
        <ProfileModal
          balance={balances[selectedMember] ?? 0}
          expenses={expenses.filter((expense) => expense.payerId === selectedMember)}
          fmt={fmt}
          krwPerNpr={krwPerNpr}
          memberId={selectedMember}
          profiles={profiles}
          onClose={() => setSelectedMember(null)}
          onSave={(updatedProfile) =>
            setProfiles((current) => ({
              ...current,
              [selectedMember]: updatedProfile,
            }))
          }
          onSaveExpenseAmount={saveExpenseAmount}
          paidTotal={paidByMember[selectedMember] ?? 0}
          profile={selectedProfile}
          transfers={transfers}
        />
      )}

      <SettlementShareModal
        open={settlementShareOpen}
        onOpenChange={setSettlementShareOpen}
        data={settlementShareData}
        downloadBaseName={`roommate-settlement-${selectedMonthKey}`}
      />

      <RoommateShareSummaryModal
        key={shareModal ? `share-${shareModalKey}` : "share-off"}
        open={shareModal !== null}
        onOpenChange={(next) => {
          if (!next) setShareModal(null);
        }}
        summaryText={shareModal?.text ?? ""}
        pageUrl={shareModal?.pageUrl ?? ""}
        downloadBaseName={`roommate-expense-summary-${selectedMonthKey}`}
      />
    </main>
  );
}

function ExpenseKpiCard({
  label,
  value,
  icon: Icon,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "default" | "receivable" | "payable";
}) {
  const styles = {
    default: { value: "text-emerald-950", icon: "text-emerald-600" },
    receivable: { value: "text-emerald-700", icon: "text-emerald-600" },
    payable: { value: "text-orange-600", icon: "text-orange-500" },
  }[accent];

  return (
    <motion.article
      whileTap={{ scale: 0.98 }}
      className="flex min-h-[76px] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-2.5"
    >
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[10px] font-semibold text-slate-500">{label}</p>
        <Icon size={14} className={`shrink-0 ${styles.icon}`} strokeWidth={2.25} />
      </div>
      <p className={`truncate text-xl font-black tabular-nums leading-tight tracking-tight ${styles.value}`}>{value}</p>
    </motion.article>
  );
}

function CompactGroupMembersRow({
  balances,
  members,
  profiles,
  onOpenProfile,
  onViewAll,
}: {
  balances: Record<string, number>;
  members: string[];
  profiles: Record<string, RoommateProfile>;
  onOpenProfile: (name: string) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 sm:gap-3">
      <div
        className="flex min-h-[3rem] min-w-0 flex-1 touch-pan-x items-center gap-2.5 overflow-x-auto overscroll-x-contain py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:gap-3 md:flex-wrap md:overflow-x-visible md:snap-none [&::-webkit-scrollbar]:hidden"
        aria-label="Group members"
      >
        {members.map((memberId) => {
          const balance = balances[memberId] ?? 0;
          const settled = Math.abs(balance) < 1;
          const displayName = profiles[memberId]?.name ?? memberId;
          return (
            <button
              key={memberId}
              type="button"
              onClick={() => onOpenProfile(memberId)}
              className="group relative shrink-0 snap-start"
              aria-label={`${displayName} profile`}
            >
              <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border-[2.5px] border-white bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-500 text-xs font-black text-white shadow-md shadow-emerald-900/15 ring-1 ring-slate-200/90 transition group-active:scale-95 sm:h-12 sm:w-12 sm:text-sm">
                {profiles[memberId]?.avatarUrl ? (
                  <Image
                    alt={`${displayName} avatar`}
                    className="h-full w-full object-cover"
                    height={48}
                    src={profiles[memberId]?.avatarUrl ?? ""}
                    unoptimized
                    width={48}
                  />
                ) : (
                  initials(displayName)
                )}
              </div>
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                  settled ? "bg-emerald-500" : balance > 0 ? "bg-emerald-400" : "bg-orange-500"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-emerald-300/90 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-900/5 ring-1 ring-white transition active:scale-95 hover:border-emerald-400 hover:bg-emerald-100/80 sm:h-12 sm:w-12"
        aria-label="Add or view members"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onViewAll}
        className="shrink-0 text-right leading-tight transition active:opacity-70"
        aria-label={`View all ${members.length} members`}
      >
        <p className="text-sm font-black tabular-nums text-emerald-950">{members.length}</p>
        <p className="text-[10px] font-bold text-slate-500">Members</p>
      </button>
    </section>
  );
}

function ExpenseFabSpeedDial({
  open,
  onToggle,
  onClose,
  onAddExpense,
  onAddIncome,
  onAddTransfer,
  onScanReceipt,
  raised = false,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddTransfer: () => void;
  onScanReceipt: () => void;
  raised?: boolean;
}) {
  const actions = [
    { label: "Add Expense", icon: ReceiptText, onClick: onAddExpense },
    { label: "Add Income", icon: Wallet, onClick: onAddIncome },
    { label: "Add Transfer", icon: ArrowRightLeft, onClick: onAddTransfer },
    { label: "Scan Receipt", icon: Camera, onClick: onScanReceipt },
  ];

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/25"
            aria-label="Close speed dial"
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>
      <div
        className={`fixed right-3 z-[60] flex flex-col items-end gap-2 ${
          raised
            ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
            : "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
        }`}
      >
        <AnimatePresence>
          {open
            ? actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  type="button"
                  initial={{ opacity: 0, y: 12, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ delay: index * 0.04, duration: 0.2, ease: motionEase }}
                  onClick={() => {
                    onClose();
                    action.onClick();
                  }}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-xs font-bold text-emerald-950 shadow-md"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <action.icon size={14} />
                  </span>
                  {action.label}
                </motion.button>
              ))
            : null}
        </AnimatePresence>
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Close actions" : "Open actions"}
          aria-expanded={open}
          whileTap={{ scale: 0.94 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-[0_10px_28px_rgba(5,150,105,0.4)]"
        >
          {open ? <X size={26} strokeWidth={2.5} /> : <Plus size={28} strokeWidth={2.5} />}
        </motion.button>
      </div>
    </>
  );
}

function ExpenseBottomNav({
  activeTab,
  onChange,
}: {
  activeTab: Tab;
  onChange: (tab: BottomTab) => void;
}) {
  const resolvedActive = bottomTabs.some((t) => t.id === activeTab) ? (activeTab as BottomTab) : "Dashboard";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-[#fbfbfb]/95 px-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom,0px))] pt-1.5"
      aria-label="Expense dashboard navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
        {bottomTabs.map((tab) => {
          const active = resolvedActive === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="relative flex min-h-[46px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1"
            >
              {active ? (
                <motion.span
                  layoutId="expense-tab-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] shadow-sm shadow-emerald-600/20"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <tab.icon
                size={16}
                strokeWidth={active ? 2.4 : 2}
                className={`relative z-10 ${active ? "text-white" : "text-slate-400"}`}
              />
              <span
                className={`relative z-10 line-clamp-1 w-full text-center text-[9px] font-bold ${
                  active ? "text-white" : "text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function GroupMembers({
  balances,
  fmt,
  members,
  newMember,
  paidByMember,
  profiles,
  setNewMember,
  addMember,
  onOpenProfile,
  removeMember,
  compact = false,
}: {
  balances: Record<string, number>;
  fmt: (amount: number, cur?: Currency) => string;
  members: string[];
  newMember: string;
  paidByMember: Record<string, number>;
  profiles: Record<string, RoommateProfile>;
  setNewMember: (value: string) => void;
  addMember: () => void;
  onOpenProfile: (name: string) => void;
  removeMember: (name: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`glass-card rounded-2xl ${compact ? "p-4" : "rounded-[1.7rem] p-6 sm:p-7"}`}>
      <div className={`flex items-center gap-2 ${compact ? "mb-3" : "mb-5 gap-3"}`}>
        <UsersRound className="shrink-0 text-emerald-700" size={compact ? 18 : 24} />
        <div className="min-w-0">
          <h2 className={`font-black leading-snug tracking-tight text-emerald-950 ${compact ? "text-base" : "font-nepali text-2xl sm:text-3xl"}`}>
            Group Members
          </h2>
          {!compact ? (
            <p className="text-sm font-bold leading-snug text-slate-500">Tap a card to view roommate profile</p>
          ) : (
            <p className="text-[11px] font-bold text-slate-500">Tap to view profile</p>
          )}
        </div>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "gap-3 sm:grid-cols-2"}`}>
        {members.map((member) => (
          <div
            key={member}
            onClick={() => onOpenProfile(member)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onOpenProfile(member);
            }}
            role="button"
            tabIndex={0}
            className={`group cursor-pointer rounded-xl border border-white/70 bg-white/75 shadow-sm backdrop-blur transition active:scale-[0.99] hover:border-emerald-200 hover:bg-white ${
              compact ? "flex items-center gap-3 p-2.5" : "rounded-2xl p-5 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(0,122,61,0.14)]"
            }`}
          >
            <div className={`flex shrink-0 items-center gap-2 ${compact ? "" : "mb-4 w-full items-start justify-between gap-3"}`}>
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-700 to-lime-500 font-black text-white ${
                    compact ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm shadow-lg shadow-emerald-950/15"
                  }`}
                >
                  {profiles[member]?.avatarUrl ? (
                    <Image
                      alt={`${profiles[member]?.name ?? member} avatar`}
                      className="h-full w-full object-cover"
                      height={compact ? 36 : 48}
                      src={profiles[member]?.avatarUrl}
                      unoptimized
                      width={compact ? 36 : 48}
                    />
                  ) : (
                    initials(profiles[member]?.name ?? member)
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`truncate font-black text-emerald-950 ${compact ? "text-sm" : ""}`}>{profiles[member]?.name ?? member}</p>
                  <p className={`truncate font-bold text-slate-500 ${compact ? "text-[10px]" : "text-sm"}`}>
                    {fmt(paidByMember[member] ?? 0)} paid ·{" "}
                    <span className={(balances[member] ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}>
                      {(balances[member] ?? 0) >= 0 ? "+" : "-"}
                      {fmt(Math.abs(balances[member] ?? 0))}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  removeMember(member);
                }}
                className="shrink-0 rounded-full bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100"
                aria-label={`Remove ${member}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            {!compact ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="font-bold text-slate-500">Contribution</p>
                    <p className="mt-1 font-black text-emerald-800">{fmt(paidByMember[member] ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Settlement</p>
                    <p className={`mt-1 font-black ${(balances[member] ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {(balances[member] ?? 0) >= 0 ? "+" : "-"}
                      {fmt(Math.abs(balances[member] ?? 0))}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-black text-emerald-700 opacity-0 transition group-hover:opacity-100">
                  Open premium profile →
                </p>
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className={`flex gap-2 ${compact ? "mt-3" : "mt-4"}`}>
        <input
          value={newMember}
          onChange={(event) => setNewMember(event.target.value)}
          className={`min-w-0 flex-1 rounded-xl border border-emerald-100 font-bold outline-none focus:border-emerald-600 ${
            compact ? "px-3 py-2 text-sm" : "rounded-2xl px-4 py-3 text-sm"
          }`}
          placeholder="Add roommate"
        />
        <button
          onClick={addMember}
          className={`rounded-xl bg-emerald-700 font-black text-white transition hover:bg-emerald-800 ${
            compact ? "px-4 py-2 text-sm" : "rounded-2xl px-5 py-3 text-sm"
          }`}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  isEditing,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      {isEditing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-28 w-full resize-none rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm font-bold text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        )
      ) : (
        <p className="font-bold text-emerald-950">{value}</p>
      )}
    </label>
  );
}

function ProfileModal({
  balance,
  expenses,
  fmt,
  krwPerNpr,
  memberId,
  profiles,
  onClose,
  onSave,
  onSaveExpenseAmount,
  paidTotal,
  profile,
  transfers,
}: {
  balance: number;
  expenses: Expense[];
  fmt: (amount: number, cur?: Currency) => string;
  krwPerNpr: number;
  memberId: string;
  profiles: Record<string, RoommateProfile>;
  onClose: () => void;
  onSave: (profile: RoommateProfile) => void;
  onSaveExpenseAmount: (id: number, amountNpr: number) => void;
  paidTotal: number;
  profile: RoommateProfile;
  transfers: Array<{ from: string; to: string; amount: number }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const isReceive = balance >= 0;
  const relatedTransfers = transfers.filter(
    (transfer) => transfer.from === memberId || transfer.to === memberId,
  );

  function copyAccount() {
    void navigator.clipboard.writeText(`${visibleProfile.bankName} ${visibleProfile.accountNumber}`);
  }

  function copyAccountNumber() {
    void navigator.clipboard.writeText(visibleProfile.accountNumber);
  }

  function cancelEdit() {
    setDraftProfile(profile);
    setIsEditing(false);
  }

  function saveProfile() {
    onSave(draftProfile);
    setIsEditing(false);
  }

  function updateDraft(field: keyof RoommateProfile, value: string) {
    setDraftProfile((current) => ({ ...current, [field]: value }));
  }

  function handleAvatarUpload(file?: File) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateDraft("avatarUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const visibleProfile = isEditing ? draftProfile : profile;

  useEffect(() => {
    if (!isEditing) setDraftProfile(profile);
  }, [profile, isEditing]);

  return (
    <ExpenseBottomSheet open onClose={onClose} title={visibleProfile.name} subtitle="Member profile">
      <div className="px-4 pb-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-sm font-black text-white">
              {visibleProfile.avatarUrl ? (
                <Image
                  alt={`${visibleProfile.name} avatar`}
                  className="h-full w-full object-cover"
                  height={64}
                  src={visibleProfile.avatarUrl}
                  unoptimized
                  width={64}
                />
              ) : (
                initials(visibleProfile.name)
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-emerald-800"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            {isEditing && (
              <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <h3 className="mb-4 font-black text-emerald-950">Avatar / Profile Image</h3>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-lime-500 text-xl font-black text-white shadow-xl shadow-emerald-950/20">
                    {draftProfile.avatarUrl ? (
                      <Image
                        alt={`${draftProfile.name} preview`}
                        className="h-full w-full object-cover"
                        height={80}
                        src={draftProfile.avatarUrl}
                        unoptimized
                        width={80}
                      />
                    ) : (
                      initials(draftProfile.name)
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50">
                    Upload image preview
                    <input
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                    />
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                      Local preview only. Works instantly without changing settlement data.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <h3 className="mb-4 font-black text-emerald-950">Contact & Identity</h3>
              {isEditing && (
                <div className="mb-3">
                  <ProfileField
                    isEditing={isEditing}
                    label="Full name"
                    value={draftProfile.name}
                    onChange={(value) => updateDraft("name", value)}
                  />
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex gap-3 rounded-2xl bg-emerald-50/70 p-3">
                  <Phone className="mt-5 shrink-0 text-emerald-700" size={17} />
                  <div className="flex-1">
                    <ProfileField
                      isEditing={isEditing}
                      label="Phone"
                      value={visibleProfile.phone}
                      onChange={(value) => updateDraft("phone", value)}
                    />
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-emerald-50/70 p-3">
                  <MessageCircle className="mt-5 shrink-0 text-emerald-700" size={17} />
                  <div className="flex-1">
                    <ProfileField
                      isEditing={isEditing}
                      label="KakaoTalk ID"
                      value={visibleProfile.kakaoId}
                      onChange={(value) => updateDraft("kakaoId", value)}
                    />
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl bg-emerald-50/70 p-3">
                  <UsersRound className="mt-5 shrink-0 text-emerald-700" size={17} />
                  <div className="flex-1">
                    <ProfileField
                      isEditing={isEditing}
                      label="Emergency contact"
                      value={visibleProfile.emergencyContact}
                      onChange={(value) => updateDraft("emergencyContact", value)}
                    />
                  </div>
                </div>
              </div>
              <a
                href={`tel:${visibleProfile.phone}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-1 hover:bg-emerald-800"
              >
                <Phone size={16} /> One-click call
              </a>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="text-emerald-700" size={18} />
                <h3 className="font-black text-emerald-950">Korean Bank Details</h3>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <ProfileField
                  isEditing={isEditing}
                  label="Korean bank name"
                  value={visibleProfile.bankName}
                  onChange={(value) => updateDraft("bankName", value)}
                />
                <div className="mt-3">
                  <ProfileField
                    isEditing={isEditing}
                    label="Account number"
                    value={visibleProfile.accountNumber}
                    onChange={(value) => updateDraft("accountNumber", value)}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={copyAccount}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:-translate-y-1 hover:bg-emerald-50"
                >
                  <Copy size={16} /> Copy bank info
                </button>
                <button
                  onClick={copyAccountNumber}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:-translate-y-1 hover:bg-emerald-50"
                >
                  <Copy size={16} /> Copy account
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-black text-slate-500">Total contribution</p>
                <p className="mt-2 text-xl font-black text-emerald-800">{fmt(paidTotal)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-black text-slate-500">Payments</p>
                <p className="mt-2 text-xl font-black text-emerald-800">{expenses.length}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-black text-slate-500">Settlement</p>
                <p className={`mt-2 text-xl font-black ${isReceive ? "text-emerald-700" : "text-red-600"}`}>
                  {isReceive ? "+" : "-"}
                  {fmt(Math.abs(balance))}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center gap-2">
                <History className="text-emerald-700" size={18} />
                <h3 className="font-black text-emerald-950">Monthly Payment History</h3>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {expenses.length ? (
                  expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-col gap-3 rounded-2xl border border-emerald-50/80 bg-white p-3 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-emerald-950">{expense.title}</p>
                        <p className="text-xs font-bold text-slate-500">
                          {expense.category} · {expense.date}
                        </p>
                      </div>
                      <ExpenseInlineAmountEditor
                        expense={expense}
                        krwPerNpr={krwPerNpr}
                        fmt={fmt}
                        onSave={onSaveExpenseAmount}
                      />
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">No payments recorded this month.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <h3 className="mb-3 font-black text-emerald-950">Settlement Summary</h3>
              <p className={`text-sm font-black ${isReceive ? "text-emerald-700" : "text-red-600"}`}>
                {isReceive ? "लिनु / receive" : "दिनु / pay"} {fmt(Math.abs(balance))}
              </p>
              <div className="mt-3 space-y-2">
                {relatedTransfers.length ? (
                  relatedTransfers.map((transfer) => (
                    <p key={`${transfer.from}-${transfer.to}`} className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-slate-700">
                      {memberDisplayName(transfer.from, profiles)} → {memberDisplayName(transfer.to, profiles)}:{" "}
                      {fmt(transfer.amount)}
                    </p>
                  ))
                ) : (
                  <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                    No direct transfer needed right now.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <h3 className="mb-2 font-black text-emerald-950">Notes</h3>
              <ProfileField
                isEditing={isEditing}
                label="Notes"
                multiline
                value={visibleProfile.notes}
                onChange={(value) => updateDraft("notes", value)}
              />
            </div>
          </section>
        </div>
      </div>
    </ExpenseBottomSheet>
  );
}

function SettlementPanel({
  balances,
  equalSplitAmount,
  memberExpectedShare,
  paidByMember,
  rawTransfers,
  displayTransfers,
  fmt,
  krwPerNpr,
  profiles,
  monthOverrideMap,
  onSaveTransfer,
  onResetTransfer,
  onMarkComplete,
  settlementMarkedComplete,
  onShareSettlement,
  onDownloadPng,
  onDownloadPdf,
}: {
  balances: Record<string, number>;
  equalSplitAmount: number;
  memberExpectedShare: Record<string, number>;
  paidByMember: Record<string, number>;
  rawTransfers: Array<{ from: string; to: string; amount: number }>;
  displayTransfers: Array<{ from: string; to: string; amount: number }>;
  fmt: (amount: number, cur?: Currency) => string;
  krwPerNpr: number;
  profiles: Record<string, RoommateProfile>;
  monthOverrideMap: Record<string, number>;
  onSaveTransfer: (from: string, to: string, npr: number) => void;
  onResetTransfer: (from: string, to: string) => void;
  onMarkComplete: () => void;
  settlementMarkedComplete: boolean;
  onShareSettlement: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
}) {
  const [logicOpen, setLogicOpen] = useState(false);
  const totalTransferAmount = displayTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  return (
    <div className="glass-card rounded-2xl p-3 lg:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-emerald-50/90 px-3 py-2">
        <p className="text-xs font-black text-emerald-900">
          Total Transfers: <span className="tabular-nums">{displayTransfers.length}</span>
        </p>
        <p className="text-xs font-black text-emerald-900">
          Total Amount: <span className="tabular-nums">{fmt(totalTransferAmount)}</span>
        </p>
      </div>

      <h2 className="mb-2 text-sm font-black text-emerald-950 lg:text-base">Settlement: लिनु / दिनु</h2>
      <p className="mb-2 text-[11px] font-bold text-slate-500">
        Avg {fmt(equalSplitAmount)} per member
      </p>

      <div className="space-y-2">
        {Object.entries(balances).map(([memberId, amount]) => {
          const isReceive = amount >= 0;
          const sign = isReceive ? "+" : "-";
          const displayName = memberDisplayName(memberId, profiles);

          return (
            <div
              key={memberId}
              className="rounded-lg border border-emerald-50/80 bg-white px-3 py-2 shadow-sm"
            >
              <p className="truncate text-sm font-black text-emerald-950">{displayName}</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                Paid: {fmt(paidByMember[memberId] ?? 0)} | Share: {fmt(memberExpectedShare[memberId] ?? 0)}
              </p>
              <p
                className={`mt-0.5 text-xs font-black tabular-nums ${isReceive ? "text-emerald-700" : "text-red-600"}`}
              >
                Balance: {sign}
                {fmt(Math.abs(amount))}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-3">
        <p className="mb-2 text-xs font-black text-emerald-900">Transfers</p>
        <div className="space-y-1.5">
          {displayTransfers.length ? (
            rawTransfers.map((raw, index) => {
              const display = displayTransfers[index];
              if (!display) return null;
              const key = transferOverrideKey(raw.from, raw.to);
              const hasOverride = monthOverrideMap[key] !== undefined;
              return (
                <SettlementTransferRowEditor
                  key={key}
                  compact
                  from={raw.from}
                  to={raw.to}
                  fromLabel={memberDisplayName(raw.from, profiles)}
                  toLabel={memberDisplayName(raw.to, profiles)}
                  amountNpr={display.amount}
                  baseAmountNpr={raw.amount}
                  hasOverride={hasOverride}
                  krwPerNpr={krwPerNpr}
                  fmt={fmt}
                  onSave={onSaveTransfer}
                  onReset={onResetTransfer}
                />
              );
            })
          ) : (
            <p className="text-xs font-bold text-emerald-700">No transfers needed — all settled.</p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setLogicOpen((open) => !open)}
          className="flex w-full items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-left transition active:bg-emerald-50"
          aria-expanded={logicOpen}
        >
          <Info size={14} className="shrink-0 text-emerald-700" />
          <span className="text-xs font-black text-emerald-900">Settlement Logic</span>
          <ChevronDown
            size={14}
            className={`ml-auto shrink-0 text-emerald-600 transition ${logicOpen ? "rotate-180" : ""}`}
          />
        </button>
        {logicOpen ? (
          <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-5 text-emerald-900">
            Each expense is split among the members you pick (equal NPR per person, or custom % weights).
            Settlement balances use <span className="font-black">paid − attributed share</span> for the month.
            Tap a transfer row to edit amounts in NPR or KRW.
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mt-3 space-y-2 touch-manipulation pb-2">
        <button
          type="button"
          onClick={() => {
            console.log("[settlement-complete] button click");
            onMarkComplete();
          }}
          disabled={settlementMarkedComplete}
          aria-disabled={settlementMarkedComplete}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black text-white transition touch-manipulation ${
            settlementMarkedComplete
              ? "cursor-default bg-emerald-500/80"
              : "bg-emerald-700 active:bg-emerald-800"
          }`}
        >
          <CheckCircle2 size={15} />
          {settlementMarkedComplete ? "Settlement complete" : "Mark settlement complete"}
        </button>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onShareSettlement}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-[0.98] touch-manipulation sm:col-span-3"
          >
            <Share2 size={14} /> Share Result
          </button>
          <button
            type="button"
            onClick={onDownloadPng}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition active:bg-emerald-50 touch-manipulation"
          >
            <Download size={13} /> PNG
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition active:bg-emerald-50 touch-manipulation sm:col-span-2"
          >
            <Download size={13} /> PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function categoryPieOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 10, font: { size: 10 } },
      },
    },
  };
}

function chartOptions(currency: Currency, krwPerNpr: number) {
  const meta = getCurrencyMeta(krwPerNpr);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) =>
            formatMoney((context.parsed.y ?? 0) / meta[currency].rate, currency, krwPerNpr),
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        border: { display: false },
        grid: { color: "rgba(0, 63, 47, 0.08)" },
        ticks: {
          callback: (value: string | number) =>
            `${meta[currency].symbol} ${Number(value).toLocaleString("en-US")}`,
        },
      },
    },
  };
}
