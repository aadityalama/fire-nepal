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
  ArrowLeft,
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  History,
  Home,
  MessageCircle,
  Pencil,
  Phone,
  PieChart,
  Plus,
  Crown,
  ReceiptText,
  Send,
  Share2,
  ShoppingBasket,
  Sparkles,
  Trash2,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { toast } from "sonner";
import { CurrencyConverterBar } from "@/components/CurrencyConverterBar";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import { ExpenseAiInsightsPanel } from "@/components/ExpenseAiInsightsPanel";
import { ExpenseHistoryPanel } from "@/components/ExpenseHistoryPanel";
import { ExpenseMonthPicker } from "@/components/ExpenseMonthPicker";
import { ExpenseReceiptUpload } from "@/components/ExpenseReceiptUpload";
import { ExpenseTimeline } from "@/components/ExpenseTimeline";
import { sanitizeDecimalTyping } from "@/components/NumericMoneyInput";
import { RoommateShareSummaryModal } from "@/components/RoommateShareSummaryModal";
import { SettlementCelebration } from "@/components/SettlementCelebration";
import {
  formatExpenseAmountForInput,
  krwToNpr,
  nprToKrw,
  parseExpenseAmountInput,
} from "@/lib/exchange-rate";
import { generateAiInsights } from "@/lib/expense-ai-insights";
import { monthlyComparisonData, normalizeCategory } from "@/lib/expense-analytics";
import {
  FALLBACK_KRW_PER_NPR,
  fallbackExchangeRate,
  type ExchangeRateSnapshot,
} from "@/lib/exchange-rate";
import {
  createActivity,
  filterExpensesByMonth,
  listMonthKeys,
  loadDashboardState,
  saveDashboardState,
  type TimelineActivity,
} from "@/lib/expense-storage";
import { buildRoommateExpenseSummaryText, isDesktopShareUi } from "@/lib/roommate-expense-share";
import {
  currentMonthKey,
  expenseAttributedShares,
  expenseMonthKey,
  getSettlement,
  type Expense,
} from "@/lib/expense-utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Currency = "NPR" | "KRW" | "USD";
type Tab = "Dashboard" | "Expenses" | "Settlement" | "Analytics" | "AI Insights" | "History";

type ExpenseForm = {
  title: string;
  amount: string;
  amountInputCurrency: "NPR" | "KRW";
  payer: string;
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
const tabs: Tab[] = ["Dashboard", "Expenses", "Settlement", "Analytics", "AI Insights", "History"];

function getCurrencyMeta(krwPerNpr: number) {
  return {
    NPR: { symbol: "रु", rate: 1 },
    KRW: { symbol: "₩", rate: krwPerNpr },
    USD: { symbol: "$", rate: 0.0075 },
  };
}

function emptyExpenseForm(payer = "", memberList: string[] = []): ExpenseForm {
  return {
    title: "",
    amount: "",
    amountInputCurrency: "NPR",
    payer,
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
  amountNpr,
  baseAmountNpr,
  hasOverride,
  krwPerNpr,
  fmt,
  onSave,
  onReset,
}: {
  from: string;
  to: string;
  amountNpr: number;
  baseAmountNpr: number;
  hasOverride: boolean;
  krwPerNpr: number;
  fmt: (amount: number, cur?: Currency) => string;
  onSave: (fromMember: string, toMember: string, npr: number) => void;
  onReset: (fromMember: string, toMember: string) => void;
}) {
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

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-emerald-950">
          {from} <span className="text-emerald-400">→</span> {to}
        </p>
        {hasOverride ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
            Custom
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
            Auto
          </span>
        )}
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
            aria-label={`Transfer amount ${from} to ${to}`}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!dirty || parsedNpr === null}
            onClick={() => parsedNpr !== null && onSave(from, to, parsedNpr)}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition enabled:hover:bg-emerald-800 disabled:opacity-40"
          >
            Save
          </button>
          {hasOverride ? (
            <button
              type="button"
              onClick={() => onReset(from, to)}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
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
  const skipNextSave = useRef(true);
  const prevTransferCount = useRef(0);

  const krwPerNpr = exchangeRate.krwPerNpr;
  const fmt = (amount: number, cur: Currency = currency) => formatMoney(amount, cur, krwPerNpr);

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
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDashboardState({
      version: 2,
      expenses,
      members,
      profiles,
      activities,
      exchangeRate,
      settlementTransferOverrides: settlementOverrides,
    });
  }, [hydrated, expenses, members, profiles, activities, exchangeRate, settlementOverrides]);

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
    const amount = parseExpenseAmountInput(form.amount, form.amountInputCurrency, krwPerNpr);
    if (amount === null || amount <= 0) return null;
    const splitAmong = resolveSplitAmong(form.splitAmong, members);
    const splitPercentages = resolveSplitPercentages(form.splitEqually, splitAmong, form.splitPercentStr);
    return expenseAttributedShares(
      {
        id: 0,
        title: "",
        amount,
        payer: form.payer,
        category: form.category,
        splitEqually: form.splitEqually,
        date: form.date,
        splitAmong: splitAmong.length === members.length ? undefined : splitAmong,
        splitPercentages: form.splitEqually ? undefined : splitPercentages,
      },
      members,
    );
  }, [form, members, krwPerNpr]);

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
  const settlementPending = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const settledPercent = transfers.length === 0 ? 100 : Math.max(12, 100 - transfers.length * 18);

  useEffect(() => {
    if (prevTransferCount.current > 0 && transfers.length === 0 && monthExpenses.length > 0) {
      setShowCelebration(true);
    }
    prevTransferCount.current = transfers.length;
  }, [transfers.length, monthExpenses.length]);

  const aiInsightsPreview = useMemo(
    () => generateAiInsights(expenses, members, selectedMonthKey, currency).slice(0, 3),
    [expenses, members, selectedMonthKey, currency],
  );
  const contributorTotals = members.map((member) => ({
    name: member,
    total: paidByMember[member] ?? 0,
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
    title: string;
    subtitle: string;
    value: string;
    meta: string;
    Icon: LucideIcon;
  }> = [
    {
      title: "Total Group Expense",
      subtitle: "महिनाभरको जम्मा खर्च",
      value: fmt(totalExpense),
      meta: `Group avg: ${fmt(equalSplitAmount)} · Split-aware balances`,
      Icon: ReceiptText,
    },
    {
      title: "कसले बढी pay गर्यो",
      subtitle: "Highest contributor this month",
      value: highestContributor.name,
      meta: fmt(highestContributor.total),
      Icon: Crown,
    },
    {
      title: "Settlement Pending",
      subtitle: "लिनु / दिनु बाँकी",
      value: fmt(settlementPending),
      meta: `${transfers.length} transfer${transfers.length === 1 ? "" : "s"} needed`,
      Icon: Calculator,
    },
  ];
  const categoryCards: Array<[string, number, LucideIcon]> = [
    ["Food/Mart", categoryTotals[categories.indexOf("Food/Mart")], ShoppingBasket],
    ["Room rent", categoryTotals[categories.indexOf("Rent")], Home],
    ["Electricity + Internet", categoryTotals[categories.indexOf("Electricity")] + categoryTotals[categories.indexOf("Internet")], Zap],
    ["Remittance", categoryTotals[categories.indexOf("Remittance")], Send],
  ];

  function addMember() {
    const name = newMember.trim();
    if (!name || members.includes(name)) return;
    setMembers((current) => [...current, name]);
    setProfiles((current) => ({
      ...current,
      [name]: current[name] ?? createProfile(name),
    }));
    appendActivity({
      type: "member_added",
      monthKey: selectedMonthKey,
      member: name,
      message: `${name} joined the expense group`,
    });
    setNewMember("");
  }

  function removeMember(name: string) {
    if (members.length <= 2) return;
    const remaining = members.filter((member) => member !== name);
    setMembers((current) => current.filter((member) => member !== name));
    setExpenses((current) =>
      current
        .filter((expense) => expense.payer !== name)
        .map((expense) => {
          if (!expense.splitAmong?.includes(name)) return expense;
          const nextAmong = expense.splitAmong.filter((m) => m !== name);
          const nextPct =
            expense.splitPercentages &&
            Object.fromEntries(Object.entries(expense.splitPercentages).filter(([k]) => k !== name));
          return {
            ...expense,
            splitAmong: nextAmong.length > 0 ? nextAmong : undefined,
            splitPercentages: nextPct && Object.keys(nextPct).length > 0 ? nextPct : undefined,
          };
        }),
    );
    setSelectedMember((current) => (current === name ? null : current));
    setForm((current) => {
      const payerNext = current.payer === name ? remaining[0] ?? current.payer : current.payer;
      const filteredAmong = current.splitAmong.filter((m) => m !== name);
      const splitAmongNext =
        filteredAmong.length > 0 ? filteredAmong : remaining.length > 0 ? remaining : current.splitAmong;
      return { ...current, payer: payerNext, splitAmong: splitAmongNext };
    });
  }

  function openAddExpenseModal() {
    setEditingExpenseId(null);
    setReceiptPreview(undefined);
    setReceiptOcrText("");
    setForm({
      ...emptyExpenseForm(members[0], members),
      amountInputCurrency: currency === "KRW" ? "KRW" : "NPR",
    });
    setIsModalOpen(true);
  }

  function openEditExpenseModal(expense: Expense) {
    setEditingExpenseId(expense.id);
    const defaultInputCur: "NPR" | "KRW" = currency === "KRW" ? "KRW" : "NPR";
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
      amount: formatExpenseAmountForInput(expense.amount, defaultInputCur, krwPerNpr),
      amountInputCurrency: defaultInputCur,
      payer: expense.payer,
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
        member: snapshot.payer,
        title: snapshot.title,
        amount: amountNpr,
        category: normalizeCategory(snapshot.category),
        message: `${snapshot.payer} updated amount for ${snapshot.title}`,
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
    const amount = parseExpenseAmountInput(form.amount, form.amountInputCurrency, krwPerNpr);
    if (!form.title.trim() || amount === null || !form.payer) return;
    const splitAmong = resolveSplitAmong(form.splitAmong, members);
    if (splitAmong.length === 0) return;
    const splitPercentages = resolveSplitPercentages(form.splitEqually, splitAmong, form.splitPercentStr);
    const nextExpense: Expense = {
      id: editingExpenseId ?? Date.now(),
      title: form.title.trim(),
      amount,
      payer: form.payer,
      category: form.category,
      splitEqually: form.splitEqually,
      date: form.date,
      receiptImage: receiptPreview,
      splitAmong: splitAmong.length === members.length ? undefined : splitAmong,
      splitPercentages: form.splitEqually ? undefined : splitPercentages,
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
        member: nextExpense.payer,
        title: nextExpense.title,
        amount: nextExpense.amount,
        category: normalizeCategory(nextExpense.category),
        message: `${nextExpense.payer} updated ${nextExpense.title}`,
      });
    } else {
      setExpenses((current) => [nextExpense, ...current]);
      appendActivity({
        type: "expense_added",
        monthKey,
        member: nextExpense.payer,
        title: nextExpense.title,
        amount: nextExpense.amount,
        category: normalizeCategory(nextExpense.category),
        message: `${nextExpense.payer} added ${nextExpense.title}`,
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
      member: expenseToDelete.payer,
      title: expenseToDelete.title,
      category: normalizeCategory(expenseToDelete.category),
      message: `${expenseToDelete.payer} removed ${expenseToDelete.title}`,
    });
    setExpenseToDelete(null);
  }

  function markSettlementComplete() {
    appendActivity({
      type: "settlement",
      monthKey: selectedMonthKey,
      message: `Settlement completed for ${selectedMonthKey}`,
    });
  }

  const buildShareSummaryText = useCallback(() => {
    return buildRoommateExpenseSummaryText({
      monthKey: selectedMonthKey,
      members,
      memberExpectedShare,
      totalExpenseNpr: totalExpense,
      equalSplitNpr: equalSplitAmount,
      transfers: transfers.map((t) => ({ from: t.from, to: t.to, amountNpr: t.amount })),
      formatAmount: (n) => formatMoney(n, currency, krwPerNpr),
    });
  }, [
    selectedMonthKey,
    members,
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
    <main className="min-h-screen bg-[#f4fbf6] px-4 pb-28 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} /> Back to FIRE Nepal
          </Link>
          <div className="flex gap-2 overflow-x-auto rounded-full border border-emerald-100 bg-white p-1 shadow-sm">
            {(["NPR", "KRW", "USD"] as Currency[]).map((item) => (
              <button
                key={item}
                onClick={() => setCurrency(item)}
                className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                  currency === item ? "bg-emerald-700 text-white" : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <section className="dark-glass-card relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-emerald-100">
                <Calculator size={18} /> खर्च हिसाब खाता
              </div>
              <h1 className="font-nepali text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl md:text-6xl">
                रुममेट खर्च, हिसाब र सेटलमेन्ट एउटै ठाउँमा।
              </h1>
              <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-emerald-50/85 sm:text-lg sm:leading-relaxed">
                Premium roommate finance system for Nepalis abroad to split mart expenses, rent,
                electricity, internet, rice/gas, and remittance costs with clear लिनु / दिनु tracking.
              </p>
              <div className="mt-8 sm:mt-10 flex flex-wrap gap-3">
                <button
                  onClick={openAddExpenseModal}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-1 hover:bg-emerald-400"
                >
                  <Plus size={17} /> Add Expense
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <Download size={17} /> Download monthly PDF
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareSummary()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <Share2 size={17} /> Share summary
                </button>
              </div>
            </div>
            <div className="glass-card rounded-[1.7rem] p-6 text-emerald-950">
              <p className="text-sm font-black text-slate-500">Total group expense</p>
              <DualCurrencyAmount amountNpr={totalExpense} krwPerNpr={krwPerNpr} currency={currency} size="lg" />
              <div className="mt-5 h-3 rounded-full bg-emerald-100">
                <div className="h-3 rounded-full bg-emerald-700" style={{ width: `${settledPercent}%` }} />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600">
                Group average: {fmt(equalSplitAmount)} · Your attributed share uses each expense&apos;s split rules
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <CurrencyConverterBar rate={exchangeRate} onRateUpdate={setExchangeRate} />
        </div>

        <div className="sticky top-3 z-30 mt-5 overflow-x-auto rounded-[1.4rem] border border-emerald-100 bg-white/85 p-2 shadow-lg shadow-emerald-950/5 backdrop-blur">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  activeTab === tab ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/15" : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {tab === "History" ? <History size={15} /> : null}
                {tab === "AI Insights" ? <Sparkles size={15} /> : null}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab !== "History" && activeTab !== "AI Insights" && (
          <div className="mt-4">
            <ExpenseMonthPicker
              monthKeys={monthKeys}
              selectedMonthKey={selectedMonthKey}
              onChange={setSelectedMonthKey}
            />
          </div>
        )}

        {activeTab === "Dashboard" && (
          <>
            <section className="mt-8 sm:mt-10 grid gap-5 md:grid-cols-3">
              {dashboardStats.map(({ title, subtitle, value, meta, Icon }) => (
                <article
                  key={title}
                  className="glass-card group relative overflow-hidden rounded-[1.6rem] p-6 transition duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_22px_55px_rgba(0,122,61,0.17)]"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl transition group-hover:bg-emerald-400/20" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="font-nepali text-sm font-black text-emerald-800">{title}</p>
                      <p className="mt-1 text-sm font-bold leading-snug text-slate-500">{subtitle}</p>
                    </div>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                      <Icon size={22} />
                    </div>
                  </div>
                  <p className="relative mt-5 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
                    {value}
                  </p>
                  <p className="relative mt-2 text-sm font-bold text-slate-500">{meta}</p>
                </article>
              ))}
            </section>

            <section className="mt-8 sm:mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {categoryCards.map(([title, amount, Icon]) => (
                <article
                  key={title}
                  className="glass-card rounded-[1.5rem] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,122,61,0.16)]"
                >
                  <Icon className="mb-4 text-emerald-700" size={24} />
                  <p className="text-sm font-black text-slate-500">{title}</p>
                  <DualCurrencyAmount amountNpr={amount} krwPerNpr={krwPerNpr} currency={currency} />
                </article>
              ))}
            </section>

            <section className="mt-8 sm:mt-10 grid gap-3 md:grid-cols-3">
              {aiInsightsPreview.map((insight) => (
                <article
                  key={insight.id}
                  className="premium-hover glass-card rounded-2xl border border-emerald-100 p-5"
                >
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-700">{insight.title}</p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{insight.message}</p>
                </article>
              ))}
            </section>

            <section className="mt-8 sm:mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
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
              <SettlementPanel
                balances={balances}
                equalSplitAmount={equalSplitAmount}
                memberExpectedShare={memberExpectedShare}
                paidByMember={paidByMember}
                rawTransfers={rawTransfers}
                displayTransfers={transfers}
                fmt={fmt}
                krwPerNpr={krwPerNpr}
                monthOverrideMap={settlementOverrides[selectedMonthKey] ?? {}}
                onSaveTransfer={saveTransferOverride}
                onResetTransfer={resetTransferOverride}
              />
            </section>

            <section className="mt-8 sm:mt-10 glass-card rounded-[1.7rem] p-6 sm:p-7">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-nepali text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
                    गतिविधि समयरेखा
                  </p>
                  <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Transaction timeline</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("History")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
                >
                  <History size={14} /> View full history
                </button>
              </div>
              <ExpenseTimeline
                activities={activities.filter((activity) => activity.monthKey === selectedMonthKey)}
                limit={6}
              />
            </section>
          </>
        )}

        {activeTab === "Expenses" && (
          <section className="mt-8 sm:mt-10 glass-card rounded-[1.7rem] p-5 sm:p-7">
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
                        {expense.category} · Paid by {expense.payer} · {expense.date}
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
          <section className="mt-8 sm:mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <SettlementPanel
              balances={balances}
              equalSplitAmount={equalSplitAmount}
              memberExpectedShare={memberExpectedShare}
              paidByMember={paidByMember}
              rawTransfers={rawTransfers}
              displayTransfers={transfers}
              fmt={fmt}
              krwPerNpr={krwPerNpr}
              monthOverrideMap={settlementOverrides[selectedMonthKey] ?? {}}
              onSaveTransfer={saveTransferOverride}
              onResetTransfer={resetTransferOverride}
            />
            <div className="glass-card rounded-[1.7rem] p-6">
              <h2 className="mb-6 text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Auto Settlement Logic</h2>
              <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
                Each expense is split among the members you pick (equal NPR per person, or custom % weights).
                Settlement balances use <span className="font-black">paid − attributed share</span> for the month.
              </div>
              <div className="space-y-3">
                {transfers.length ? (
                  transfers.map((transfer) => (
                    <div key={`${transfer.from}-${transfer.to}`} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                      <CheckCircle2 className="shrink-0 text-emerald-700" size={19} />
                      <p className="font-bold text-slate-700">
                        {transfer.from} pays {transfer.to} {fmt(transfer.amount)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-emerald-50 p-4 font-black text-emerald-800">All settled.</div>
                )}
              </div>
              <button
                type="button"
                onClick={markSettlementComplete}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                <CheckCircle2 size={16} /> Mark settlement complete
              </button>
            </div>
          </section>
        )}

        {activeTab === "Analytics" && (
          <section className="mt-8 sm:mt-10 grid gap-6 lg:grid-cols-2">
            <div className="glass-card rounded-[1.7rem] p-6">
              <div className="mb-5 flex items-center gap-2">
                <BarChart3 className="text-emerald-700" />
                <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Monthly Expense Chart</h2>
              </div>
              <div className="h-80">
                <Bar data={monthlyData} options={chartOptions(currency, krwPerNpr)} />
              </div>
            </div>
            <div className="glass-card rounded-[1.7rem] p-6">
              <div className="mb-5 flex items-center gap-2">
                <PieChart className="text-emerald-700" />
                <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Category Breakdown</h2>
              </div>
              <div className="mx-auto h-80 max-w-md">
                <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
              </div>
            </div>
          </section>
        )}

        {activeTab === "AI Insights" && (
          <ExpenseAiInsightsPanel
            expenses={expenses}
            members={members}
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
            currency={currency}
            activities={activities}
            krwPerNpr={krwPerNpr}
          />
        )}
      </div>

      <SettlementCelebration show={showCelebration} onComplete={() => setShowCelebration(false)} />

      <button
        onClick={openAddExpenseModal}
        className="fixed bottom-4 left-4 right-4 z-40 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-emerald-950/25 transition hover:-translate-y-1 hover:bg-emerald-800 sm:hidden"
      >
        <Plus size={18} /> Add Expense
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex min-h-0 items-end justify-center bg-emerald-950/45 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
            className="fintech-form-sheet flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-emerald-100/70 px-3 py-2 sm:px-4">
              <div className="min-w-0 pr-1">
                <h2 id="expense-modal-title" className="text-base font-black leading-tight text-emerald-950 sm:text-lg">
                  {editingExpenseId ? "Edit Expense" : "Add Expense"}
                </h2>
                <p className="text-[11px] font-bold leading-snug text-slate-500 sm:text-xs">
                  NPR base · NPR or KRW input
                </p>
              </div>
              <button
                type="button"
                onClick={closeExpenseModal}
                className="shrink-0 rounded-full bg-emerald-50 p-1.5 text-emerald-800 transition hover:bg-emerald-100 sm:p-2"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 sm:px-4">
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
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-emerald-800 sm:text-xs">
                  Amount
                </span>
                <div className="mb-2 flex rounded-lg bg-white/90 p-0.5 shadow-sm ring-1 ring-emerald-100/80">
                  {(["NPR", "KRW"] as const).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        const n = Number(String(form.amount).replace(/,/g, ""));
                        if (Number.isFinite(n) && n > 0) {
                          if (form.amountInputCurrency === "NPR" && cur === "KRW") {
                            setForm((c) => ({
                              ...c,
                              amountInputCurrency: "KRW",
                              amount: String(Math.round(nprToKrw(n, krwPerNpr))),
                            }));
                            return;
                          }
                          if (form.amountInputCurrency === "KRW" && cur === "NPR") {
                            setForm((c) => ({
                              ...c,
                              amountInputCurrency: "NPR",
                              amount: String(Math.round(krwToNpr(n, krwPerNpr) * 100) / 100),
                            }));
                            return;
                          }
                        }
                        setForm((c) => ({ ...c, amountInputCurrency: cur }));
                      }}
                      className={`flex-1 rounded-md py-1.5 text-[11px] font-black transition sm:py-2 sm:text-xs ${
                        form.amountInputCurrency === cur
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      {cur === "NPR" ? "रु NPR" : "₩ KRW"}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: sanitizeDecimalTyping(event.target.value) }))
                  }
                  className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-base font-black text-emerald-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:text-lg"
                  placeholder="Enter amount"
                  aria-label="Expense amount"
                />
                {(() => {
                  const preview = parseExpenseAmountInput(form.amount, form.amountInputCurrency, krwPerNpr);
                  if (preview === null || !form.amount) return null;
                  return (
                    <p className="mt-1.5 text-center text-[10px] font-bold leading-snug text-emerald-800 sm:text-left sm:text-xs">
                      ≈ {fmt(preview, "NPR")} NPR · ₩{Math.round(nprToKrw(preview, krwPerNpr)).toLocaleString()} ·{" "}
                      {fmt(preview, currency)}
                    </p>
                  );
                })()}
              </div>
              <label>
                <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  Payer
                </span>
                <select
                  value={form.payer}
                  onChange={(event) => setForm((current) => ({ ...current, payer: event.target.value }))}
                  className="w-full rounded-xl border border-emerald-100 bg-white px-2.5 py-2 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {members.map((member) => (
                    <option key={member}>{member}</option>
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
                    {resolveSplitAmong(form.splitAmong, members).map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-black text-emerald-900 shadow-sm sm:px-2.5 sm:text-xs"
                      >
                        {m}
                        <button
                          type="button"
                          aria-label={`Remove ${m} from split`}
                          disabled={resolveSplitAmong(form.splitAmong, members).length <= 1}
                          onClick={() => {
                            setForm((c) => {
                              const cur = resolveSplitAmong(c.splitAmong, members);
                              if (cur.length <= 1) return c;
                              return { ...c, splitAmong: cur.filter((x) => x !== m) };
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
                    {members.map((member) => {
                      const activeSplit = resolveSplitAmong(form.splitAmong, members);
                      const checked = activeSplit.includes(member);
                      return (
                        <label
                          key={member}
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
                                if (cur.includes(member)) {
                                  if (cur.length <= 1) return c;
                                  return { ...c, splitAmong: cur.filter((x) => x !== member) };
                                }
                                return { ...c, splitAmong: [...cur, member] };
                              });
                            }}
                            className="h-3.5 w-3.5 shrink-0 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600 sm:h-4 sm:w-4"
                          />
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-white text-[10px] font-black text-emerald-900 ring-1 ring-emerald-100 sm:h-8 sm:w-8 sm:text-[11px]">
                            {initials(member)}
                          </span>
                          <span className="min-w-0 flex-1 text-xs font-bold text-emerald-950 sm:text-sm">{member}</span>
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
                        {resolveSplitAmong(form.splitAmong, members).map((m) => (
                          <label key={m} className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-500">{m}</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="%"
                              value={form.splitPercentStr[m] ?? ""}
                              onChange={(e) =>
                                setForm((c) => ({
                                  ...c,
                                  splitPercentStr: {
                                    ...c.splitPercentStr,
                                    [m]: sanitizeDecimalTyping(e.target.value),
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
                          return members.map((m) => {
                            const v = splitPreviewShares[m] ?? 0;
                            if (v <= 0 && !active.includes(m)) return null;
                            return (
                              <div
                                key={m}
                                className="flex items-center justify-between rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-emerald-100/60 sm:text-xs"
                              >
                                <span className="font-black text-emerald-950">{m}</span>
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
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-emerald-100/90 bg-white/95 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 sm:flex-row-reverse sm:px-4 sm:py-2.5">
              <button
                type="button"
                onClick={saveExpense}
                className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800 sm:py-3 sm:text-sm"
              >
                {editingExpenseId ? "Update expense" : "Save expense"}
              </button>
              <button
                type="button"
                onClick={closeExpenseModal}
                className="flex-1 rounded-xl border border-emerald-200 bg-white py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 sm:py-3 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.7rem] bg-white p-6 shadow-2xl">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Delete this expense?</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              This will remove <span className="text-emerald-900">{expenseToDelete.title}</span> and
              instantly recalculate total group expense, settlement, highest contributor, and expense count.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMember && selectedProfile && (
        <ProfileModal
          balance={balances[selectedMember] ?? 0}
          expenses={expenses.filter((expense) => expense.payer === selectedMember)}
          fmt={fmt}
          krwPerNpr={krwPerNpr}
          memberName={selectedMember}
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
}) {
  return (
    <div className="glass-card rounded-[1.7rem] p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <UsersRound className="text-emerald-700" />
        <div>
          <h2 className="font-nepali text-2xl font-black leading-snug tracking-tight sm:text-3xl">Group Members</h2>
          <p className="text-sm font-bold leading-snug text-slate-500">Tap a card to view roommate profile</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => (
          <div
            key={member}
            onClick={() => onOpenProfile(member)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onOpenProfile(member);
            }}
            role="button"
            tabIndex={0}
            className="group cursor-pointer rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-[0_16px_38px_rgba(0,122,61,0.14)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-700 to-lime-500 text-sm font-black text-white shadow-lg shadow-emerald-950/15">
                  {profiles[member]?.avatarUrl ? (
                    <Image
                      alt={`${profiles[member]?.name ?? member} avatar`}
                      className="h-full w-full object-cover"
                      height={48}
                      src={profiles[member]?.avatarUrl}
                      unoptimized
                      width={48}
                    />
                  ) : (
                    initials(profiles[member]?.name ?? member)
                  )}
                </div>
                <div>
                  <p className="font-black text-emerald-950">{profiles[member]?.name ?? member}</p>
                  <p className="text-sm font-bold text-slate-500">{profiles[member]?.bankName ?? "Korean Bank"}</p>
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  removeMember(member);
                }}
                className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                aria-label={`Remove ${member}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
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
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={newMember}
          onChange={(event) => setNewMember(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-emerald-100 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600"
          placeholder="Add roommate"
        />
        <button onClick={addMember} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800">
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
  memberName,
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
  memberName: string;
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
    (transfer) => transfer.from === memberName || transfer.to === memberName,
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-emerald-950/45 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="glass-card max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-5 shadow-2xl duration-300 animate-in sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-lime-500 text-xl font-black text-white shadow-xl shadow-emerald-950/20">
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
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Roommate Profile</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-emerald-950">{visibleProfile.name}</h2>
              <p className="text-sm font-bold text-slate-500">
                {isEditing ? "Edit Korean fintech profile details" : "Korea roommate finance identity"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                <Pencil size={14} /> Edit Profile
              </button>
            )}
            <button onClick={onClose} className="rounded-full bg-emerald-50 p-2 text-emerald-800 transition hover:bg-emerald-100">
              <X size={18} />
            </button>
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
                      {transfer.from} → {transfer.to}: {fmt(transfer.amount)}
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
    </div>
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
  monthOverrideMap,
  onSaveTransfer,
  onResetTransfer,
}: {
  balances: Record<string, number>;
  equalSplitAmount: number;
  memberExpectedShare: Record<string, number>;
  paidByMember: Record<string, number>;
  rawTransfers: Array<{ from: string; to: string; amount: number }>;
  displayTransfers: Array<{ from: string; to: string; amount: number }>;
  fmt: (amount: number, cur?: Currency) => string;
  krwPerNpr: number;
  monthOverrideMap: Record<string, number>;
  onSaveTransfer: (from: string, to: string, npr: number) => void;
  onResetTransfer: (from: string, to: string) => void;
}) {
  return (
    <div className="glass-card rounded-[1.7rem] p-6 sm:p-7">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black leading-snug tracking-tight text-emerald-950 sm:text-3xl">Settlement: लिनु / दिनु</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Group average: {fmt(equalSplitAmount)} · Attributed share varies by expense split rules
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(balances).map(([member, amount]) => {
          const isReceive = amount >= 0;
          const sign = isReceive ? "+" : "-";
          const share = memberExpectedShare[member] ?? 0;

          return (
            <div key={member} className="rounded-2xl border border-emerald-50/80 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-sm font-black text-emerald-800">
                  {initials(member)}
                </div>
                <p className="font-black text-emerald-950">{member}</p>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm font-bold text-slate-500">
                <span>Paid: {fmt(paidByMember[member] ?? 0)}</span>
                <span>Share: {fmt(share)}</span>
              </div>
              <p className={`text-sm font-black ${isReceive ? "text-emerald-700" : "text-red-600"}`}>
                {isReceive ? "लिनु / receive" : "दिनु / pay"}
              </p>
              <p className={`mt-1 text-2xl font-black ${isReceive ? "text-emerald-800" : "text-red-600"}`}>
                {sign}
                {fmt(Math.abs(amount))}
              </p>
              <p className="mt-2 text-[11px] font-bold text-slate-400">
                ≈ ₩{Math.round(nprToKrw(Math.abs(amount), krwPerNpr)).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-4">
        <p className="mb-1 text-sm font-black text-emerald-900">Roommate transfer amounts</p>
        <p className="mb-4 text-sm font-bold leading-relaxed text-slate-600">
          Edit in NPR or KRW, then Save. Reset restores the auto-calculated split.
        </p>
        <div className="space-y-3">
          {displayTransfers.length ? (
            rawTransfers.map((raw, index) => {
              const display = displayTransfers[index];
              if (!display) return null;
              const key = transferOverrideKey(raw.from, raw.to);
              const hasOverride = monthOverrideMap[key] !== undefined;
              return (
                <SettlementTransferRowEditor
                  key={key}
                  from={raw.from}
                  to={raw.to}
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
            <p className="text-sm font-bold text-emerald-700">No transfers needed.</p>
          )}
        </div>
      </div>
    </div>
  );
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
