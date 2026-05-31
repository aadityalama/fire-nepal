"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BellRing,
  Calculator,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Copy,
  FileText,
  FileLock2,
  Fingerprint,
  Gauge,
  IdCard,
  Landmark,
  LineChart,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { SmartLoanReminderLog } from "@/lib/smart-loan/reminders";
import { shouldSendSmartLoanReminder } from "@/lib/smart-loan/reminders";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CurrencyCode = "NPR" | "KRW" | "USD";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type RelationshipTag = "Family" | "Friend" | "Employee" | "Business" | "Other";
type LoanDirection = "lent" | "borrowed";
type LoanMethod = "Simple" | "Compound" | "Daily" | "Monthly" | "EMI" | "Reducing Balance";
type EditableMetric = "lentMoney" | "borrowedMoney" | "interestIncome";
type LoanNumberField = "principal" | "paid" | "annualRate" | "months" | "installmentsLeft";
type LoanNumberDrafts = Record<LoanNumberField, string>;
type BorrowerDocumentKind = "ID Card" | "Passport" | "Contract" | "Receipt";

type BorrowerDocument = {
  id: string;
  name: string;
  uploadedAt: string;
};

type PaymentHistoryItem = {
  id: string;
  date: string;
  label: string;
  amount: number;
  status: "Paid" | "Scheduled" | "Overdue";
};

type LoanProfile = {
  id: string;
  direction: LoanDirection;
  avatar: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  messaging: string;
  citizenship: string;
  passport: string;
  koreaId: string;
  bank: string;
  account: string;
  qrWallet: string;
  address: string;
  emergencyContact: string;
  lenderName: string;
  lenderEmail: string;
  notes: string;
  risk: RiskLevel;
  relationship: RelationshipTag;
  method: LoanMethod;
  currency: CurrencyCode;
  principal: number;
  paid: number;
  annualRate: number;
  months: number;
  agreementDate: string;
  nextDue: string;
  overdueDays: number;
  installmentsLeft: number;
  score: number;
  relationshipStarted: string;
  documents: Record<BorrowerDocumentKind, BorrowerDocument[]>;
  paymentHistory: PaymentHistoryItem[];
  reminderLogs: SmartLoanReminderLog[];
};

type VaultDocument = {
  id: string;
  name: string;
  folder: string;
  type: string;
  owner: string;
  status: "Encrypted" | "OCR Ready" | "Needs Review";
};

const KRW_TO_NPR = 0.103;
const USD_TO_NPR = 133.6;
const editableMetricLabels: Record<EditableMetric, string> = {
  lentMoney: "Total money lent",
  borrowedMoney: "Total money borrowed",
  interestIncome: "Monthly interest income",
};

const editableMetricStorageKeys: Record<EditableMetric, string> = {
  lentMoney: "lentMoney",
  borrowedMoney: "borrowedMoney",
  interestIncome: "interestIncome",
};

const correctPin = "1234";
const loanProfilesStorageKey = "smartLoan.profiles";
const loanDocumentsStorageKey = "smartLoan.documents";
const loanReminderDispatchStoragePrefix = "smartLoan.reminderDispatch";
const chartColors = ["#10b981", "#22c55e", "#84cc16", "#f59e0b", "#ef4444"];

const baseProfiles: Partial<LoanProfile>[] = [
  {
    id: "laxmi",
    direction: "lent",
    fullName: "Laxmi Gurung",
    phone: "+977 984-1122334",
    messaging: "WhatsApp + Viber",
    citizenship: "46-01-77-03421",
    passport: "PA1149021",
    koreaId: "KOR-8842-20",
    bank: "Nabil Bank",
    account: "021001778844",
    qrWallet: "eSewa QR saved",
    address: "Pokhara-13, Kaski",
    notes: "Family house repair bridge loan. Sends receipts monthly.",
    risk: "Low",
    relationship: "Family",
    method: "Simple",
    currency: "NPR",
    principal: 650_000,
    paid: 210_000,
    annualRate: 12,
    months: 18,
    nextDue: "2026-06-03",
    overdueDays: 0,
    installmentsLeft: 8,
    score: 88,
  },
  {
    id: "min",
    direction: "lent",
    fullName: "Min Bahadur Tamang",
    phone: "+82 10-4421-9088",
    messaging: "Kakao + WhatsApp",
    citizenship: "27-02-74-99218",
    passport: "PA7765128",
    koreaId: "KOR-1188-73",
    bank: "KB Kookmin",
    account: "846-23-001482",
    qrWallet: "KakaoPay QR saved",
    address: "Ansan, Gyeonggi-do",
    notes: "Korea roommate advance. Needs stricter reminders.",
    risk: "High",
    relationship: "Other",
    method: "Daily",
    currency: "KRW",
    principal: 4_800_000,
    paid: 1_050_000,
    annualRate: 18,
    months: 10,
    nextDue: "2026-05-24",
    overdueDays: 3,
    installmentsLeft: 6,
    score: 61,
  },
  {
    id: "aarav",
    direction: "borrowed",
    fullName: "Aarav Shrestha",
    phone: "+977 981-2221190",
    messaging: "WhatsApp",
    citizenship: "03-07-78-45219",
    passport: "PB8812047",
    koreaId: "N/A",
    bank: "NIC Asia",
    account: "1199550021",
    qrWallet: "Khalti QR saved",
    address: "Birtamode, Jhapa",
    notes: "Business stock loan borrowed from cousin.",
    risk: "Medium",
    relationship: "Business",
    method: "EMI",
    currency: "NPR",
    principal: 900_000,
    paid: 325_000,
    annualRate: 15,
    months: 24,
    nextDue: "2026-06-01",
    overdueDays: 0,
    installmentsLeft: 14,
    score: 74,
  },
  {
    id: "sita",
    direction: "lent",
    fullName: "Sita Magar",
    phone: "+977 986-4401188",
    messaging: "Viber",
    citizenship: "61-01-80-00731",
    passport: "PC9911274",
    koreaId: "KOR-4419-66",
    bank: "Global IME",
    account: "00450019812",
    qrWallet: "IME Pay QR saved",
    address: "Butwal-9, Rupandehi",
    notes: "Education fee support. Contract signed and scanned.",
    risk: "Critical",
    relationship: "Friend",
    method: "Compound",
    currency: "NPR",
    principal: 420_000,
    paid: 80_000,
    annualRate: 20,
    months: 12,
    nextDue: "2026-05-18",
    overdueDays: 9,
    installmentsLeft: 5,
    score: 42,
  },
];

const profiles = baseProfiles.map(normalizeLoanProfile);

const baseDocuments: VaultDocument[] = [
  { id: "doc-1", name: "Laxmi Citizenship Scan", folder: "Citizenship", type: "Image", owner: "Laxmi Gurung", status: "Encrypted" },
  { id: "doc-2", name: "Min Daily Loan Agreement", folder: "Contracts", type: "PDF", owner: "Min Bahadur Tamang", status: "OCR Ready" },
  { id: "doc-3", name: "Sita Payment Screenshot", folder: "Receipts", type: "Image", owner: "Sita Magar", status: "Needs Review" },
  { id: "doc-4", name: "Aarav Signed Contract", folder: "Signed Contracts", type: "PDF", owner: "Aarav Shrestha", status: "Encrypted" },
];

const repaymentData = [
  { month: "Jan", collected: 220000, due: 280000, overdue: 45000 },
  { month: "Feb", collected: 260000, due: 305000, overdue: 38000 },
  { month: "Mar", collected: 310000, due: 325000, overdue: 25000 },
  { month: "Apr", collected: 295000, due: 345000, overdue: 52000 },
  { month: "May", collected: 352000, due: 390000, overdue: 81000 },
  { month: "Jun", collected: 0, due: 420000, overdue: 0 },
];

const interestGrowthData = [
  { month: "M1", simple: 24000, compound: 24700, emi: 19000 },
  { month: "M2", simple: 48000, compound: 50200, emi: 38000 },
  { month: "M3", simple: 72000, compound: 76500, emi: 57000 },
  { month: "M4", simple: 96000, compound: 103800, emi: 76000 },
  { month: "M5", simple: 120000, compound: 132200, emi: 95000 },
  { month: "M6", simple: 144000, compound: 161700, emi: 114000 },
];

const heatmapDays = Array.from({ length: 35 }, (_, index) => {
  const pressure = [18, 34, 72, 45, 88, 28, 14][index % 7] + (index % 5) * 3;
  return { day: index + 1, pressure: Math.min(100, pressure) };
});

const reminders = [
  { title: "Payment due reminder", detail: "Laxmi Didi installment due in 7 days", status: "Scheduled", icon: CalendarClock },
  { title: "Overdue warning", detail: "Sita Magar is 9 days overdue", status: "High priority", icon: AlertTriangle },
  { title: "Interest maturity", detail: "Min Dai daily interest matures Friday", status: "WhatsApp ready", icon: MessageCircle },
  { title: "Family-shared reminder", detail: "Aarav EMI alert shared to family ledger", status: "Synced", icon: BellRing },
];

const fireImpact = [
  { label: "Debt pressure", value: 68, fill: "#f59e0b" },
  { label: "Recovery health", value: 74, fill: "#10b981" },
  { label: "Return readiness", value: 82, fill: "#22c55e" },
];

function toNpr(value: number, currency: CurrencyCode) {
  if (currency === "KRW") return value * KRW_TO_NPR;
  if (currency === "USD") return value * USD_TO_NPR;
  return value;
}

function formatNpr(value: number) {
  return `रु ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

function formatCurrency(value: number, currency: CurrencyCode) {
  if (currency === "KRW") return `₩${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
  if (currency === "USD") return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
  return formatNpr(value);
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function getLocalDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function daysBetweenDateKeys(targetDate: string, todayKey: string) {
  const target = new Date(`${targetDate}T00:00:00`).getTime();
  const today = new Date(`${todayKey}T00:00:00`).getTime();
  if (!Number.isFinite(target) || !Number.isFinite(today)) return 0;
  return Math.round((target - today) / 86_400_000);
}

function formatDaysRemaining(days: number) {
  if (days > 0) return `${days} Days Remaining`;
  if (days === 0) return "Due Today";
  return `${Math.abs(days)} Days Overdue`;
}

function dueReminderLabel(days: number) {
  if (days < 0) return "Daily overdue email";
  if (days === 0) return "Due date email";
  if (days === 3) return "3-day reminder email";
  if (days === 7) return "7-day reminder email";
  return "No email scheduled today";
}

function automaticRiskLevel(daysOverdue: number, fallback: RiskLevel): RiskLevel {
  if (daysOverdue >= 30) return "Critical";
  if (daysOverdue >= 8) return "High";
  if (daysOverdue >= 1) return "Medium";
  return fallback;
}

function daysRemainingCardClass(days: number) {
  if (days < 0) {
    return "animate-pulse border border-rose-400/70 bg-gradient-to-br from-rose-950/95 via-red-950/85 to-zinc-950 p-3 shadow-[0_0_34px_-10px_rgba(248,113,113,0.95)]";
  }
  if (days === 0) return "border border-orange-300/40 bg-orange-400/10 p-3";
  return "bg-emerald-400/10 p-3";
}

function daysRemainingTextClass(days: number) {
  if (days < 0) return "text-rose-200";
  if (days === 0) return "text-orange-200";
  return "text-emerald-100";
}

function relationshipDuration(startedAt: string) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return "Not set";
  const months = Math.max(0, Math.round((Date.now() - started) / 2_592_000_000));
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years} yr ${remainder} mo` : `${years} yr`;
}

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(key);
  const parsed = saved ? Number(saved) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStoredJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function loanInterest(profile: LoanProfile) {
  const principalNpr = toNpr(profile.principal, profile.currency);
  const monthlyRate = profile.annualRate / 12 / 100;
  if (profile.method === "Compound") return principalNpr * (Math.pow(1 + monthlyRate, profile.months) - 1);
  if (profile.method === "Daily") return principalNpr * (profile.annualRate / 365 / 100) * profile.months * 30;
  if (profile.method === "EMI" || profile.method === "Reducing Balance") return principalNpr * monthlyRate * profile.months * 0.62;
  return principalNpr * (profile.annualRate / 100) * (profile.months / 12);
}

function riskClasses(risk: RiskLevel) {
  if (risk === "Critical") return "border-rose-300/70 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200";
  if (risk === "High") return "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200";
  if (risk === "Medium") return "border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200";
  return "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200";
}

function MotionCard({
  children,
  className = "",
  delay = 0,
  id,
}: Readonly<{ children: ReactNode; className?: string; delay?: number; id?: string }>) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-[1.7rem] border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_90px_-40px_rgba(16,185,129,0.35)] backdrop-blur-xl sm:p-5 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function Button({
  children,
  className = "",
  size = "md",
  variant = "solid",
  type = "button",
  onClick,
}: Readonly<{
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
  variant?: "solid" | "outline" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
}>) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variantClass = {
    solid: "border-emerald-400/40 bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
    outline: "border-white/15 bg-white/[0.06] text-emerald-50 hover:bg-white/[0.12]",
    ghost: "border-transparent bg-transparent text-emerald-100 hover:bg-white/[0.08]",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-black shadow-sm transition hover:-translate-y-0.5 ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "emerald",
  onEdit,
}: Readonly<{ label: string; value: string; hint: string; icon: LucideIcon; accent?: "emerald" | "amber" | "rose" | "sky"; onEdit?: () => void }>) {
  const accentClass = {
    emerald: "from-emerald-400 to-lime-300 text-emerald-100",
    amber: "from-amber-300 to-yellow-200 text-amber-100",
    rose: "from-rose-400 to-orange-300 text-rose-100",
    sky: "from-sky-300 to-cyan-200 text-sky-100",
  }[accent];

  return (
    <motion.article
      whileHover={{ y: -5, scale: 1.01 }}
      className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-4 shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/65">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accentClass}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold leading-relaxed text-emerald-50/65">{hint}</p>
      {onEdit ? (
        <Button size="sm" variant="outline" className="mt-4" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
    </motion.article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
}: Readonly<{ eyebrow: string; title: string; subtitle?: string; icon: LucideIcon }>) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
          <Icon size={14} />
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-emerald-50/65">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function ChartShell({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-emerald-950/45 p-4">
      <p className="mb-3 text-sm font-black text-emerald-50">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

function ChartFallback() {
  return (
    <div className="flex h-full items-end gap-2">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="flex-1 animate-pulse rounded-t-xl bg-emerald-400/20"
          style={{ height: `${30 + ((index * 17) % 58)}%`, animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}

function makeBorrowerDocuments(documents?: Partial<Record<BorrowerDocumentKind, BorrowerDocument[]>>) {
  return {
    "ID Card": documents?.["ID Card"] ?? [],
    Passport: documents?.Passport ?? [],
    Contract: documents?.Contract ?? [],
    Receipt: documents?.Receipt ?? [],
  };
}

function makePaymentHistory(profile: Partial<LoanProfile>): PaymentHistoryItem[] {
  if (profile.paymentHistory?.length) return profile.paymentHistory;
  const paid = Number(profile.paid ?? 0);
  const nextDue = profile.nextDue || new Date().toISOString().slice(0, 10);
  if (paid <= 0) {
    return [{ id: `${profile.id ?? "loan"}-scheduled`, date: nextDue, label: "First repayment scheduled", amount: 0, status: "Scheduled" }];
  }

  return [
    { id: `${profile.id ?? "loan"}-advance`, date: "2026-03-10", label: "Opening repayment", amount: Math.round(paid * 0.35), status: "Paid" },
    { id: `${profile.id ?? "loan"}-repayment`, date: "2026-04-12", label: "Installment received", amount: Math.round(paid * 0.4), status: "Paid" },
    { id: `${profile.id ?? "loan"}-latest`, date: "2026-05-18", label: profile.overdueDays ? "Overdue installment" : "Latest installment", amount: Math.round(paid * 0.25), status: profile.overdueDays ? "Overdue" : "Paid" },
  ];
}

function completedLoansFromRepaymentHistory(paymentHistory: PaymentHistoryItem[]) {
  return paymentHistory.filter((payment) => payment.status === "Paid").length;
}

function makeBlankProfile(): LoanProfile {
  return {
    id: `loan-${Date.now()}`,
    direction: "lent",
    avatar: "",
    fullName: "",
    phone: "",
    whatsapp: "",
    email: "",
    messaging: "WhatsApp",
    citizenship: "",
    passport: "",
    koreaId: "",
    bank: "",
    account: "",
    qrWallet: "",
    address: "",
    emergencyContact: "",
    lenderName: "FIRE Nepal lender",
    lenderEmail: "",
    notes: "",
    risk: "Medium",
    relationship: "Friend",
    method: "EMI",
    currency: "NPR",
    principal: 0,
    paid: 0,
    annualRate: 12,
    months: 12,
    agreementDate: new Date().toISOString().slice(0, 10),
    nextDue: new Date().toISOString().slice(0, 10),
    overdueDays: 0,
    installmentsLeft: 12,
    score: 70,
    relationshipStarted: new Date().toISOString().slice(0, 10),
    documents: makeBorrowerDocuments(),
    paymentHistory: [],
    reminderLogs: [],
  };
}

function normalizeLoanProfile(profile: Partial<LoanProfile>): LoanProfile {
  return {
    id: profile.id ?? `loan-${Date.now()}`,
    direction: profile.direction ?? "lent",
    avatar: profile.avatar ?? "",
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    whatsapp: profile.whatsapp ?? profile.phone ?? "",
    email: profile.email ?? "",
    messaging: profile.messaging ?? "WhatsApp",
    citizenship: profile.citizenship ?? "",
    passport: profile.passport ?? "",
    koreaId: profile.koreaId ?? "",
    bank: profile.bank ?? "",
    account: profile.account ?? "",
    qrWallet: profile.qrWallet ?? "",
    address: profile.address ?? "",
    emergencyContact: profile.emergencyContact ?? "",
    lenderName: profile.lenderName ?? "FIRE Nepal lender",
    lenderEmail: profile.lenderEmail ?? "",
    notes: profile.notes ?? "",
    risk: profile.risk ?? "Medium",
    relationship: profile.relationship ?? "Friend",
    method: profile.method ?? "EMI",
    currency: profile.currency ?? "NPR",
    principal: profile.principal ?? 0,
    paid: profile.paid ?? 0,
    annualRate: profile.annualRate ?? 12,
    months: profile.months ?? 12,
    agreementDate: profile.agreementDate ?? profile.relationshipStarted ?? new Date().toISOString().slice(0, 10),
    nextDue: profile.nextDue ?? new Date().toISOString().slice(0, 10),
    overdueDays: profile.overdueDays ?? 0,
    installmentsLeft: profile.installmentsLeft ?? 12,
    score: profile.score ?? 70,
    relationshipStarted: profile.relationshipStarted ?? "2024-01-01",
    documents: makeBorrowerDocuments(profile.documents),
    paymentHistory: makePaymentHistory(profile),
    reminderLogs: profile.reminderLogs ?? [],
  };
}

function makeNumberDrafts(profile: LoanProfile, useBlankDefaults = false): LoanNumberDrafts {
  return {
    principal: useBlankDefaults ? "" : String(profile.principal),
    paid: useBlankDefaults ? "" : String(profile.paid),
    annualRate: useBlankDefaults ? "" : String(profile.annualRate),
    months: useBlankDefaults ? "" : String(profile.months),
    installmentsLeft: useBlankDefaults ? "" : String(profile.installmentsLeft),
  };
}

function parseDraftNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function SmartLoanDashboard() {
  const [chartsReady, setChartsReady] = useState(false);
  const [locked, setLocked] = useState(true);
  const [pinDraft, setPinDraft] = useState("");
  const [pinError, setPinError] = useState("");
  const [vaultMode, setVaultMode] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [krwAmount, setKrwAmount] = useState("1000000");
  const [savingsDraft, setSavingsDraft] = useState("2500000");
  const [monthlyEmiDraft, setMonthlyEmiDraft] = useState("85000");
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");
  const [loanProfiles, setLoanProfiles] = useState<LoanProfile[]>(() => readStoredJson(loanProfilesStorageKey, profiles).map(normalizeLoanProfile));
  const [documents, setDocuments] = useState<VaultDocument[]>(() => readStoredJson(loanDocumentsStorageKey, baseDocuments));
  const [lentMoney, setLentMoney] = useState(() => readStoredNumber(editableMetricStorageKeys.lentMoney, 1_564_400));
  const [borrowedMoney, setBorrowedMoney] = useState(() => readStoredNumber(editableMetricStorageKeys.borrowedMoney, 900_000));
  const [interestIncome, setInterestIncome] = useState(() => readStoredNumber(editableMetricStorageKeys.interestIncome, 21_493));
  const [editingMetric, setEditingMetric] = useState<EditableMetric | null>(null);
  const [metricDraftValue, setMetricDraftValue] = useState(0);
  const [editingProfile, setEditingProfile] = useState<LoanProfile | null>(null);
  const [profileNumberDrafts, setProfileNumberDrafts] = useState<LoanNumberDrafts>(() => makeNumberDrafts(makeBlankProfile(), true));
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    const timer = window.setTimeout(() => setChartsReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const refreshToday = () => setTodayKey(getLocalDateKey());
    refreshToday();
    const interval = window.setInterval(refreshToday, 3_600_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(editableMetricStorageKeys.lentMoney, String(lentMoney));
  }, [lentMoney]);

  useEffect(() => {
    window.localStorage.setItem(editableMetricStorageKeys.borrowedMoney, String(borrowedMoney));
  }, [borrowedMoney]);

  useEffect(() => {
    window.localStorage.setItem(editableMetricStorageKeys.interestIncome, String(interestIncome));
  }, [interestIncome]);

  useEffect(() => {
    window.localStorage.setItem(loanProfilesStorageKey, JSON.stringify(loanProfiles));
  }, [loanProfiles]);

  useEffect(() => {
    window.localStorage.setItem(loanDocumentsStorageKey, JSON.stringify(documents));
  }, [documents]);

  const enrichedProfiles = useMemo(() => {
    return loanProfiles.map((profile) => {
      const principalNpr = toNpr(profile.principal, profile.currency);
      const paidNpr = toNpr(profile.paid, profile.currency);
      const interestNpr = loanInterest(profile);
      const totalPayable = principalNpr + interestNpr;
      const remainingNpr = Math.max(0, totalPayable - paidNpr);
      const nextDueDays = daysBetweenDateKeys(profile.nextDue, todayKey);
      const isPaid = remainingNpr <= 0;
      const isOverdue = nextDueDays < 0 && !isPaid;
      const daysOverdue = isOverdue ? Math.abs(nextDueDays) : 0;
      const completedLoansTotal = completedLoansFromRepaymentHistory(profile.paymentHistory);
      const effectiveRisk = automaticRiskLevel(daysOverdue, profile.risk);
      return {
        ...profile,
        risk: effectiveRisk,
        originalRisk: profile.risk,
        principalNpr,
        paidNpr,
        interestNpr,
        totalPayable,
        remainingNpr,
        nextDueDays,
        daysOverdue,
        isPaid,
        isOverdue,
        daysRemainingLabel: formatDaysRemaining(nextDueDays),
        totalLoansGivenNpr: profile.direction === "lent" ? principalNpr : 0,
        totalLoansTakenNpr: profile.direction === "borrowed" ? principalNpr : 0,
        activeLoans: isPaid ? 0 : 1,
        completedLoansTotal,
        repaymentRate: Math.min(100, Math.round((paidNpr / Math.max(1, totalPayable)) * 100)),
        relationshipDuration: relationshipDuration(profile.relationshipStarted),
      };
    });
  }, [loanProfiles, todayKey]);

  const overview = useMemo(() => {
    const borrowed = enrichedProfiles.filter((profile) => profile.direction === "borrowed");
    const pendingDue = enrichedProfiles.reduce((sum, profile) => sum + Math.max(0, profile.remainingNpr / Math.max(1, profile.installmentsLeft)), 0);
    const outgoingDebt = borrowed.reduce((sum, profile) => sum + profile.remainingNpr / Math.max(1, profile.installmentsLeft), 0);
    return {
      lent: lentMoney,
      borrowed: borrowedMoney,
      interestIncome,
      pendingDue,
      upcoming: enrichedProfiles.filter((profile) => profile.nextDueDays >= 0 && profile.nextDueDays <= 10).length,
      overdue: enrichedProfiles.filter((profile) => profile.isOverdue).length,
      activeClients: enrichedProfiles.length,
      cashflowImpact: interestIncome - outgoingDebt,
    };
  }, [borrowedMoney, enrichedProfiles, interestIncome, lentMoney]);

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return enrichedProfiles
      .filter((profile) => {
        if (riskFilter !== "All" && profile.risk !== riskFilter) return false;
        if (!query) return true;
        return `${profile.fullName} ${profile.phone} ${profile.relationship} ${profile.bank}`.toLowerCase().includes(query);
      })
      .sort((a, b) => a.score - b.score);
  }, [enrichedProfiles, riskFilter, searchTerm]);

  const riskData = useMemo(() => {
    return ["Low", "Medium", "High", "Critical"].map((risk) => ({
      name: risk,
      value: enrichedProfiles.filter((profile) => profile.risk === risk).length,
    }));
  }, [enrichedProfiles]);

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((document) => `${document.name} ${document.folder} ${document.type} ${document.owner}`.toLowerCase().includes(query));
  }, [documentSearch, documents]);

  const krwConvertedToNpr = useMemo(() => {
    const amount = Number(krwAmount);
    return Number.isFinite(amount) ? amount * KRW_TO_NPR : 0;
  }, [krwAmount]);

  const fireImpactScore = useMemo(() => {
    const savings = parseDraftNumber(savingsDraft);
    const monthlyEmi = parseDraftNumber(monthlyEmiDraft);
    const fireScore = savings - overview.borrowed - monthlyEmi;
    return Math.max(0, Math.min(100, Math.round((fireScore / Math.max(1, savings)) * 100)));
  }, [monthlyEmiDraft, overview.borrowed, savingsDraft]);

  const debtStressScore = useMemo(() => {
    const monthlyEmi = parseDraftNumber(monthlyEmiDraft);
    return Math.max(0, Math.min(100, Math.round(((overview.borrowed + monthlyEmi * 12) / Math.max(1, overview.lent + parseDraftNumber(savingsDraft))) * 100)));
  }, [monthlyEmiDraft, overview.borrowed, overview.lent, savingsDraft]);

  const overdueProfiles = useMemo(() => enrichedProfiles.filter((profile) => profile.isOverdue), [enrichedProfiles]);

  const serializeLoanForReminder = useCallback((profile: (typeof enrichedProfiles)[number]) => {
    return {
      id: profile.id,
      borrowerName: profile.fullName,
      borrowerEmail: profile.email,
      borrowerPhone: profile.phone,
      lenderName: profile.lenderName,
      lenderEmail: profile.lenderEmail,
      loanAmount: profile.principal,
      remainingAmount: profile.remainingNpr,
      agreementDate: profile.agreementDate,
      dueDate: profile.nextDue,
      interestRate: profile.annualRate,
      currency: profile.currency,
      daysUntilDue: profile.nextDueDays,
      daysOverdue: profile.daysOverdue,
    };
  }, []);

  const appendReminderLogs = useCallback((logs: SmartLoanReminderLog[]) => {
    if (!logs.length) return;
    setLoanProfiles((currentProfiles) =>
      currentProfiles.map((profile) => {
        const profileLogs = logs.filter((log) => log.loanId === profile.id);
        if (!profileLogs.length) return profile;
        const existingIds = new Set(profile.reminderLogs.map((log) => log.id));
        const nextLogs = profileLogs.filter((log) => !existingIds.has(log.id));
        return { ...profile, reminderLogs: [...nextLogs, ...profile.reminderLogs].slice(0, 20) };
      }),
    );
  }, []);

  const reminderTimeline = useMemo(() => {
    const automaticReminders = enrichedProfiles
      .filter((profile) => shouldSendSmartLoanReminder(profile.nextDueDays))
      .slice(0, 4)
      .map((profile) => ({
        title: dueReminderLabel(profile.nextDueDays),
        detail: `${profile.fullName} · ${formatNpr(profile.remainingNpr)} · due ${formatDate(profile.nextDue)}`,
        status: profile.isOverdue ? `${profile.daysOverdue} days overdue` : profile.daysRemainingLabel,
        icon: profile.isOverdue ? AlertTriangle : CalendarClock,
      }));
    return automaticReminders.length ? automaticReminders : reminders;
  }, [enrichedProfiles]);

  useEffect(() => {
    let cancelled = false;

    async function dispatchDailyReminders() {
      const now = new Date();
      if (now.getHours() < 9) return;

      const dispatchKey = `${loanReminderDispatchStoragePrefix}.${todayKey}`;
      const dispatchState = window.localStorage.getItem(dispatchKey);
      if (dispatchState === "sent" || dispatchState === "pending") return;

      const loansDueToday = enrichedProfiles.filter(
        (profile) => profile.remainingNpr > 0 && shouldSendSmartLoanReminder(profile.nextDueDays) && (profile.email || profile.lenderEmail),
      );
      if (!loansDueToday.length) return;

      window.localStorage.setItem(dispatchKey, "pending");
      try {
        const response = await fetch("/api/smart-loan/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "dashboard-auto-9am",
            loans: loansDueToday.map(serializeLoanForReminder),
          }),
        });
        const result = (await response.json()) as { logs?: SmartLoanReminderLog[] };
        if (!cancelled) appendReminderLogs(result.logs ?? []);
        window.localStorage.setItem(dispatchKey, "sent");
      } catch {
        window.localStorage.removeItem(dispatchKey);
      }
    }

    void dispatchDailyReminders();
    const interval = window.setInterval(dispatchDailyReminders, 3_600_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [appendReminderLogs, enrichedProfiles, serializeLoanForReminder, todayKey]);

  function openMetricEditor(metric: EditableMetric) {
    const value = {
      lentMoney,
      borrowedMoney,
      interestIncome,
    }[metric];
    setMetricDraftValue(value);
    setEditingMetric(metric);
  }

  function saveMetricEdit() {
    if (!editingMetric) return;
    const safeValue = Number.isFinite(metricDraftValue) ? metricDraftValue : 0;
    if (editingMetric === "lentMoney") setLentMoney(safeValue);
    if (editingMetric === "borrowedMoney") setBorrowedMoney(safeValue);
    if (editingMetric === "interestIncome") setInterestIncome(safeValue);
    setEditingMetric(null);
  }

  function openProfileEditor(profile: LoanProfile) {
    setEditingProfile({ ...profile });
    setProfileNumberDrafts(makeNumberDrafts(profile));
    setIsAddingLoan(false);
  }

  function openNewLoanEditor() {
    const blankProfile = makeBlankProfile();
    setEditingProfile(blankProfile);
    setProfileNumberDrafts(makeNumberDrafts(blankProfile, true));
    setIsAddingLoan(true);
  }

  function updateProfileDraft<Key extends keyof LoanProfile>(key: Key, value: LoanProfile[Key]) {
    setEditingProfile((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateProfileNumberDraft(field: LoanNumberField, value: string) {
    setProfileNumberDrafts((current) => ({ ...current, [field]: value }));
  }

  function clearZeroProfileNumberDraft(field: LoanNumberField) {
    setProfileNumberDrafts((current) => {
      if (current[field] !== "0") return current;
      return { ...current, [field]: "" };
    });
  }

  function saveProfileEdit() {
    if (!editingProfile) return;
    const nextProfile = normalizeLoanProfile({
      ...editingProfile,
      fullName: editingProfile.fullName.trim() || "New borrower",
      phone: editingProfile.phone.trim(),
      whatsapp: editingProfile.whatsapp.trim(),
      email: editingProfile.email.trim(),
      lenderName: editingProfile.lenderName.trim() || "FIRE Nepal lender",
      lenderEmail: editingProfile.lenderEmail.trim(),
      principal: parseDraftNumber(profileNumberDrafts.principal),
      paid: parseDraftNumber(profileNumberDrafts.paid),
      annualRate: parseDraftNumber(profileNumberDrafts.annualRate),
      months: parseDraftNumber(profileNumberDrafts.months),
      installmentsLeft: parseDraftNumber(profileNumberDrafts.installmentsLeft),
    });

    setLoanProfiles((current) => {
      if (isAddingLoan) return [nextProfile, ...current];
      return current.map((profile) => (profile.id === nextProfile.id ? nextProfile : profile));
    });
    setEditingProfile(null);
    setIsAddingLoan(false);
  }

  function exportBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      metrics: { lentMoney, borrowedMoney, interestIncome },
      loans: loanProfiles,
      documents,
    };
    downloadTextFile("fire-nepal-backup.json", JSON.stringify(backup, null, 2), "application/json");
  }

  async function exportPdfReport() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    pdf.text("FIRE Nepal Loan Report", 20, 20);
    pdf.text(`Money lent: ${formatNpr(overview.lent)}`, 20, 34);
    pdf.text(`Money borrowed: ${formatNpr(overview.borrowed)}`, 20, 44);
    pdf.text(`Monthly interest income: ${formatNpr(overview.interestIncome)}`, 20, 54);
    pdf.text(`FIRE readiness: ${fireImpactScore}%`, 20, 64);
    loanProfiles.slice(0, 8).forEach((profile, index) => {
      pdf.text(`${index + 1}. ${profile.fullName} - ${formatCurrency(profile.principal, profile.currency)} @ ${profile.annualRate}%`, 20, 82 + index * 10);
    });
    pdf.save("fire-nepal-loan-report.pdf");
  }

  function sendReminder(phone: string, name: string, amount: number, daysOverdue = 0) {
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) return;
    const text =
      daysOverdue > 0
        ? `Hello ${name}, your payment is overdue by ${daysOverdue} days. Please pay immediately.`
        : `Hello ${name}, your due amount is NPR ${Math.round(amount).toLocaleString("en-IN")}.`;
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function openWhatsApp(phone: string, name: string) {
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) return;
    window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Hello ${name},`)}`, "_blank", "noopener,noreferrer");
  }

  function callPhone(phone: string) {
    const normalizedPhone = normalizeWhatsAppPhone(phone);
    if (!normalizedPhone) return;
    window.location.href = `tel:${normalizedPhone}`;
  }

  async function copyPhone(phone: string) {
    if (!phone) return;
    await navigator.clipboard.writeText(phone);
  }

  function handleAvatarUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      updateProfileDraft("avatar", reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleProfileDocumentUpload(kind: BorrowerDocumentKind, files: FileList | null) {
    if (!files?.length) return;
    const uploadedAt = new Date().toISOString();
    const uploadedDocuments = Array.from(files).map((file, index) => ({
      id: `${kind}-${file.name}-${Date.now()}-${index}`,
      name: file.name,
      uploadedAt,
    }));
    setEditingProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        documents: {
          ...current.documents,
          [kind]: [...uploadedDocuments, ...current.documents[kind]],
        },
      };
    });
  }

  async function extractOcrText(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setOcrStatus("Reading document...");
    setOcrText("");
    try {
      const Tesseract = await import("tesseract.js");
      const {
        data: { text },
      } = await Tesseract.recognize(file, "eng");
      setOcrText(text.trim() || "No readable text found.");
      setOcrStatus("OCR extraction complete");
    } catch {
      setOcrStatus("OCR extraction failed. Try a clearer image.");
    }
  }

  function handleVaultUpload(files: FileList | null) {
    if (!files?.length) return;
    const nextDocuments = Array.from(files).map((file, index) => ({
      id: `${file.name}-${Date.now()}-${index}`,
      name: file.name,
      folder: file.type.includes("audio") ? "Audio Notes" : file.type.includes("pdf") ? "Contracts" : "Receipts",
      type: file.type || "Secure file",
      owner: "Unassigned",
      status: "OCR Ready" as const,
    }));
    setDocuments((current) => [...nextDocuments, ...current].slice(0, 10));
  }

  function handlePinChange(value: string) {
    const nextPin = value.replace(/\D/g, "").slice(0, 4);
    setPinDraft(nextPin);
    setPinError("");
    if (nextPin.length !== 4) return;
    if (nextPin === correctPin) {
      setLocked(false);
      setPinDraft("");
      return;
    }
    setPinError("Incorrect PIN. Try 1234 for this demo.");
  }

  if (locked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#0f5132_0%,#031710_42%,#020907_100%)] px-4 py-8 text-white">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 text-center shadow-[0_30px_120px_-45px_rgba(16,185,129,0.55)] backdrop-blur-2xl"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-400/10 text-emerald-200">
            <Fingerprint size={30} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Secure loan vault</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Enter PIN</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/65">
            Demo PIN is 1234. Mobile builds can connect this screen to Capacitor Face ID or fingerprint unlock.
          </p>
          <div className="mt-6 flex justify-center">
            <input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              type="password"
              value={pinDraft}
              onChange={(event) => handlePinChange(event.target.value)}
              placeholder="1234"
              className="h-14 w-44 rounded-2xl border border-white/15 bg-zinc-900 text-center text-2xl font-black tracking-[0.6em] text-white outline-none transition placeholder:text-emerald-50/25 focus:border-emerald-300/70"
            />
          </div>
          {pinError ? <p className="mt-4 text-sm font-bold text-rose-200">{pinError}</p> : null}
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#0f5132_0%,#031710_38%,#020907_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-emerald-50 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.07] p-5 shadow-[0_30px_120px_-50px_rgba(16,185,129,0.45)] backdrop-blur-2xl sm:p-7 lg:p-8">
          <div className="absolute -left-24 top-4 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Sparkles size={14} />
                FIRE Nepal Credit OS
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.94] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Smart Loan & Due Management Dashboard
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-emerald-50/75 sm:text-lg">
                One premium command center for lending, borrowing, EMI planning, document vaults, reminders, and Korea-Nepal debt readiness.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["KRW ↔ NPR", "Live-ready multi-currency loans"],
                  ["Offline-first", "Device vault and backup export"],
                  ["Recovery AI", "Risk score, notes, reminders"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-black text-emerald-100">{label}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-50/65">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-emerald-950/45 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Debt Pressure Score</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-50/60">FIRE impact, overdue load, and recovery velocity</p>
                </div>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                  Watch
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
                <div
                  className="mx-auto grid h-40 w-40 place-items-center rounded-full"
                  style={{ background: "conic-gradient(#f59e0b 244deg, rgba(255,255,255,0.12) 0deg)" }}
                >
                  <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#052116] text-center">
                    <span className="text-4xl font-black">68</span>
                    <span className="-mt-4 text-[10px] font-black uppercase tracking-widest text-amber-100">Pressure</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {fireImpact.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-xs font-black text-emerald-50/80">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.fill }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="overview" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total money lent" value={`₨${lentMoney.toLocaleString()}`} hint="Principal you have deployed to family, friends, and business borrowers." icon={WalletCards} onEdit={() => openMetricEditor("lentMoney")} />
          <KpiCard label="Total money borrowed" value={`₨${borrowedMoney.toLocaleString()}`} hint="Liability you owe, converted to NPR for FIRE planning." icon={Landmark} accent="sky" onEdit={() => openMetricEditor("borrowedMoney")} />
          <KpiCard label="Monthly interest income" value={`₨${interestIncome.toLocaleString()}`} hint="Projected monthly profit from active lending profiles." icon={TrendingUp} onEdit={() => openMetricEditor("interestIncome")} />
          <KpiCard label="Pending due amount" value={formatNpr(overview.pendingDue)} hint="Next-cycle due amount across active accounts." icon={CalendarClock} accent="amber" />
          <KpiCard label="Upcoming payments" value={`${overview.upcoming}`} hint="Due within the next 10 days." icon={BellRing} accent="sky" />
          <KpiCard label="Overdue accounts" value={`${overview.overdue}`} hint="Needs recovery actions and stronger reminders." icon={AlertTriangle} accent="rose" />
          <KpiCard label="Active clients" value={`${overview.activeClients}`} hint="Borrowers and lenders with open ledgers." icon={UsersRound} />
          <KpiCard label="Monthly cashflow impact" value={formatNpr(overview.cashflowImpact)} hint="Interest income minus your outgoing debt installments." icon={CircleDollarSign} />
        </div>

        {overdueProfiles.length ? (
          <MotionCard className="mt-6 border-rose-400/45 bg-gradient-to-r from-rose-950/90 via-red-950/55 to-zinc-950 shadow-[0_0_70px_-30px_rgba(248,113,113,0.95)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 animate-pulse items-center justify-center rounded-2xl bg-rose-500/20 text-rose-100">
                <AlertTriangle size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-100">🔴 OVERDUE ACCOUNT</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {overdueProfiles.slice(0, 4).map((profile) => (
                    <div key={profile.id} className="rounded-2xl border border-rose-300/35 bg-rose-500/10 p-3 text-sm font-bold text-rose-50">
                      <p>Borrower: {profile.fullName}</p>
                      <p>Amount: {formatNpr(profile.remainingNpr)}</p>
                      <p>Due Date: {formatDate(profile.nextDue)}</p>
                      <p>Days Overdue: {profile.daysOverdue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MotionCard>
        ) : null}

        <MotionCard className="mt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Advanced premium upgrade</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Editable loan operating system</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-emerald-50/65">
                Edit borrower profiles, EMI dates, interest %, repayment schedule, notes, and documents now; the architecture is ready for Zustand, Supabase/Firebase sync, ShadCN dialogs, Framer Motion, and Recharts analytics.
              </p>
            </div>
            <Button onClick={openNewLoanEditor}>
              <Plus size={17} />
              Add New Loan
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Edit loan profile",
              "Edit EMI date",
              "Edit interest %",
              "Edit borrower name",
              "Edit repayment schedule",
              "Add notes",
              "Upload documents",
              "Track repayments and reminders",
            ].map((feature) => (
              <div key={feature} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm font-black text-emerald-50/80">
                {feature}
              </div>
            ))}
          </div>
        </MotionCard>

        <section id="analytics" className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <MotionCard>
            <SectionHeader
              eyebrow="Premium analytics"
              title="Repayment, interest, risk, and recovery intelligence"
              subtitle="Rich charts for monthly repayments, interest growth, risk analysis, due heatmap, and cashflow pressure."
              icon={LineChart}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartShell title="Monthly repayment graph">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={repaymentData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#a7f3d0" fontSize={12} />
                      <YAxis stroke="#a7f3d0" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                      <Tooltip contentStyle={{ background: "#052116", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                      <Bar dataKey="collected" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="due" fill="#84cc16" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="overdue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartFallback />
                )}
              </ChartShell>
              <ChartShell title="Interest growth chart">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={interestGrowthData}>
                      <defs>
                        <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.75} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#a7f3d0" fontSize={12} />
                      <YAxis stroke="#a7f3d0" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                      <Tooltip contentStyle={{ background: "#052116", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                      <Area type="monotone" dataKey="compound" stroke="#10b981" fill="url(#interestGradient)" strokeWidth={3} />
                      <Line type="monotone" dataKey="simple" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartFallback />
                )}
              </ChartShell>
              <ChartShell title="Risk analysis">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} innerRadius={62} outerRadius={92} paddingAngle={4} dataKey="value">
                        {riskData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#052116", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartFallback />
                )}
              </ChartShell>
              <ChartShell title="Cashflow impact">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={repaymentData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="month" stroke="#a7f3d0" fontSize={12} />
                      <YAxis stroke="#a7f3d0" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                      <Tooltip contentStyle={{ background: "#052116", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                      <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={3} />
                      <Line type="monotone" dataKey="due" stroke="#f59e0b" strokeWidth={3} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartFallback />
                )}
              </ChartShell>
            </div>
          </MotionCard>

          <MotionCard>
            <SectionHeader eyebrow="Due calendar" title="Heatmap and recovery timeline" icon={CalendarClock} />
            <div className="grid grid-cols-7 gap-2">
              {heatmapDays.map((day) => (
                <div
                  key={day.day}
                  className="grid aspect-square place-items-center rounded-xl border border-white/10 text-[11px] font-black"
                  style={{ backgroundColor: `rgba(16,185,129,${0.12 + day.pressure / 160})` }}
                  title={`Day ${day.day}: ${day.pressure}% due pressure`}
                >
                  {day.day}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {reminderTimeline.map((reminder) => {
                const Icon = reminder.icon;
                return (
                  <div key={reminder.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                    <Icon className="mt-0.5 shrink-0 text-emerald-300" size={18} />
                    <div>
                      <p className="text-sm font-black text-white">{reminder.title}</p>
                      <p className="text-xs font-semibold leading-relaxed text-emerald-50/60">{reminder.detail}</p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-300">{reminder.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </MotionCard>
        </section>

        <section id="clients" className={`mt-6 grid gap-4 transition duration-300 xl:grid-cols-[1.15fr_0.85fr] ${vaultMode ? "pointer-events-none select-none blur-xl" : ""}`}>
          <MotionCard>
            <SectionHeader
              eyebrow="Smart client management"
              title="Profiles, ledgers, risk scores, and notes timeline"
              subtitle="Search by name, phone, relationship, or bank. Filter overdue and sort by lowest client score."
              icon={UsersRound}
            />
            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2">
                <Search size={17} className="text-emerald-300" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search clients, banks, phone, relationship"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-emerald-50/35"
                />
              </label>
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value as "All" | RiskLevel)}
                className="rounded-2xl border border-white/10 bg-emerald-950 px-3 py-2 text-sm font-black text-emerald-50 outline-none"
              >
                <option value="All">All risk levels</option>
                <option value="Low">Low risk</option>
                <option value="Medium">Medium risk</option>
                <option value="High">High risk</option>
                <option value="Critical">Critical risk</option>
              </select>
            </div>
            <div className="space-y-3">
              {filteredProfiles.map((profile) => (
                <motion.article
                  key={profile.id}
                  layout
                  className={`rounded-[1.35rem] border p-4 transition hover:bg-white/[0.08] ${
                    profile.isOverdue
                      ? "border-rose-400/45 bg-rose-950/[0.18] shadow-[0_0_55px_-28px_rgba(248,113,113,0.95)]"
                      : "border-white/10 bg-white/[0.055]"
                  }`}
                >
                  {profile.isOverdue ? (
                    <div className="mb-4 rounded-2xl border border-rose-400/50 bg-gradient-to-r from-rose-950/95 via-red-950/70 to-rose-900/30 p-4 shadow-[0_0_42px_-18px_rgba(248,113,113,0.9)]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-rose-500/20 text-rose-200">
                            <AlertTriangle size={18} />
                          </span>
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-100">🔴 OVERDUE ACCOUNT</p>
                            <p className="mt-1 text-sm font-bold text-rose-100/80">
                              Borrower: {profile.fullName} · Amount: {formatNpr(profile.remainingNpr)} · Due Date: {formatDate(profile.nextDue)} · Days Overdue: {profile.daysOverdue}
                            </p>
                          </div>
                        </div>
                        <span className="w-fit rounded-full border border-rose-300/50 bg-rose-400/15 px-3 py-1 text-xs font-black text-rose-100">
                          {profile.daysRemainingLabel}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
                      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-inner">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={`${profile.fullName} profile`} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound size={34} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-white">{profile.fullName}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${riskClasses(profile.risk)}`}>{profile.risk} risk</span>
                            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-black text-emerald-100">
                              {profile.relationship}
                            </span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openProfileEditor(profile)}>
                            Edit Profile
                          </Button>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-emerald-50/65">
                          {profile.phone || "No phone"} · WhatsApp {profile.whatsapp || profile.phone || "Not added"} · {profile.messaging}
                        </p>
                        <div className="mt-4 grid gap-2 text-xs font-semibold text-emerald-50/70 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            { label: "📧 Email Address", value: profile.email || "Not added", icon: Mail },
                            { label: "📱 Phone", value: profile.phone || "Not added", icon: Phone },
                            { label: "🪪 Citizenship", value: profile.citizenship || "Not added", icon: IdCard },
                            { label: "🛂 Passport", value: profile.passport || "Optional", icon: FileText },
                            { label: "🏦 Bank Details", value: `${profile.bank || "Bank not added"} · ${profile.account || "Account not added"}`, icon: Landmark },
                            { label: "📍 Address", value: profile.address || "Not added", icon: UsersRound },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-sm">
                                <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">
                                  <Icon size={13} />
                                  {item.label}
                                </p>
                                <p className="mt-1 break-words font-black text-white">{item.value}</p>
                              </div>
                            );
                          })}
                          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">Emergency Contact</p>
                            <p className="mt-1 break-words font-black text-white">{profile.emergencyContact || "Not added"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">Korea ID / ARC</p>
                            <p className="mt-1 break-words font-black text-white">{profile.koreaId || "Optional"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">QR Wallet</p>
                            <p className="mt-1 break-words font-black text-white">{profile.qrWallet || "Not added"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-[210px] rounded-2xl border border-white/10 bg-emerald-950/45 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Internal credit score</p>
                      <p className="mt-1 text-3xl font-black text-white">{profile.score}</p>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300" style={{ width: `${profile.score}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-emerald-50/60">Repayment rate {profile.repaymentRate}%</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Total exposure</p>
                      <p className="mt-1 font-black text-white">{formatNpr(profile.remainingNpr)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Risk level</p>
                      <p className="mt-1 font-black text-white">{profile.risk}</p>
                    </div>
                    <div className={`rounded-2xl ${daysRemainingCardClass(profile.nextDueDays)}`}>
                      <p className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] ${profile.isOverdue ? "text-rose-200" : "text-emerald-100/60"}`}>
                        {profile.isOverdue ? <AlertTriangle size={14} className="animate-pulse text-rose-300" /> : null}
                        Days Remaining
                      </p>
                      <p className={`mt-1 font-black ${daysRemainingTextClass(profile.nextDueDays)}`}>{profile.daysRemainingLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Total interest</p>
                      <p className="mt-1 font-black text-white">{formatNpr(profile.interestNpr)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white/[0.045] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Loans given</p>
                      <p className="mt-1 font-black text-white">{formatNpr(profile.totalLoansGivenNpr)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.045] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Loans taken</p>
                      <p className="mt-1 font-black text-white">{formatNpr(profile.totalLoansTakenNpr)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.045] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Active / completed</p>
                      <p className="mt-1 font-black text-white">{profile.activeLoans} / {profile.completedLoansTotal}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.045] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/60">Relationship duration</p>
                      <p className="mt-1 font-black text-white">{profile.relationshipDuration}</p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold leading-relaxed text-emerald-50/70">
                    {profile.notes}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => callPhone(profile.phone)}>
                      <Phone size={14} />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openWhatsApp(profile.whatsapp || profile.phone, profile.fullName)}>
                      <MessageCircle size={14} />
                      WhatsApp Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyPhone(profile.phone)}>
                      <Copy size={14} />
                      Copy Phone
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendReminder(profile.whatsapp || profile.phone, profile.fullName, profile.remainingNpr / Math.max(1, profile.installmentsLeft), profile.daysOverdue)}>
                      <BellRing size={14} />
                      Due Reminder
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_0.85fr]">
                    <div className="rounded-2xl border border-white/10 bg-emerald-950/30 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Loan history and payment timeline</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Current loan: {formatCurrency(profile.principal, profile.currency)}</p>
                        <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Outstanding: {formatNpr(profile.remainingNpr)}</p>
                        <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">
                          Interest {profile.direction === "lent" ? "earned" : "paid"}: {formatNpr(profile.interestNpr)}
                        </p>
                        <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Engine: {profile.method} · {profile.annualRate}%</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {profile.isOverdue ? (
                          <div className="flex gap-3 rounded-xl border border-rose-400/35 bg-rose-500/10 p-2 shadow-[0_0_28px_-18px_rgba(248,113,113,0.9)]">
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-400" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-black text-rose-100">Automatic overdue detection</p>
                                <span className="rounded-full border border-rose-300/45 bg-rose-400/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-rose-100">
                                  Overdue
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-rose-100/70">
                                Due {formatDate(profile.nextDue)} · {profile.daysOverdue} days overdue · {`Your payment is overdue by ${profile.daysOverdue} days. Please pay immediately.`}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        {profile.paymentHistory.map((payment) => (
                          <div
                            key={payment.id}
                            className={`flex gap-3 rounded-xl p-2 ${
                              payment.status === "Overdue"
                                ? "border border-rose-400/35 bg-rose-500/10"
                                : "bg-white/[0.04]"
                            }`}
                          >
                            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${payment.status === "Overdue" ? "bg-rose-400" : "bg-emerald-300"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-xs font-black ${payment.status === "Overdue" ? "text-rose-100" : "text-white"}`}>{payment.label}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                                  payment.status === "Overdue" ? "border border-rose-300/45 bg-rose-400/15 text-rose-100" : "bg-emerald-400/10 text-emerald-200"
                                }`}>
                                  {payment.status}
                                </span>
                              </div>
                              <p className={`text-[11px] font-semibold ${payment.status === "Overdue" ? "text-rose-100/65" : "text-emerald-50/55"}`}>
                                {formatDate(payment.date)} · {payment.amount ? formatCurrency(payment.amount, profile.currency) : "Pending"}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-2">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Reminder history</p>
                          <div className="mt-2 space-y-2">
                            {profile.reminderLogs.length ? (
                              profile.reminderLogs.slice(0, 4).map((log) => (
                                <div key={log.id} className="rounded-lg bg-white/[0.045] p-2 text-[11px] font-semibold text-emerald-50/65">
                                  <p className="font-black text-white">
                                    {formatDate(log.date)} · {log.recipientKind} · {log.emailSent ? "Email sent" : "Email not sent"}
                                  </p>
                                  <p>
                                    Recipient: {log.recipient} · Status: {log.status}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[11px] font-semibold text-emerald-50/55">No reminder logs yet. Automatic checks run daily at 9:00 AM.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-emerald-950/30 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Borrower documents</p>
                      <div className="mt-3 grid gap-2">
                        {(["ID Card", "Passport", "Contract", "Receipt"] as BorrowerDocumentKind[]).map((kind) => {
                          const latestDocument = profile.documents[kind][0];
                          return (
                            <div key={kind} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] p-2 text-xs font-bold text-emerald-50/75">
                              <span className="inline-flex items-center gap-2">
                                <FileText size={14} className="text-emerald-300" />
                                {kind}
                              </span>
                              <span className="truncate text-emerald-50/55">{latestDocument ? latestDocument.name : "Not uploaded"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </MotionCard>

          <MotionCard id="interest-calculator">
            <SectionHeader eyebrow="Smart interest engine" title="Auto-calculated payoff and profit summary" icon={Calculator} />
            <div className="space-y-3">
              {enrichedProfiles.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{profile.fullName}</p>
                      <p className="text-xs font-semibold text-emerald-50/60">
                        {profile.method} · {profile.annualRate}% APR · {profile.installmentsLeft} installments left
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-200">
                      {profile.direction === "lent" ? "Income" : "Liability"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Total: {formatNpr(profile.totalPayable)}</p>
                    <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Interest: {formatNpr(profile.interestNpr)}</p>
                    <p className="rounded-xl bg-white/[0.05] p-2 font-bold text-emerald-50/75">Next: {formatNpr(profile.remainingNpr / Math.max(1, profile.installmentsLeft))}</p>
                  </div>
                </div>
              ))}
            </div>
          </MotionCard>
        </section>

        <section id="vault" className={`mt-6 grid gap-4 transition duration-300 xl:grid-cols-[0.9fr_1.1fr] ${vaultMode ? "pointer-events-none select-none blur-xl" : ""}`}>
          <MotionCard>
            <SectionHeader
              eyebrow="Document vault"
              title="Secure local file organization"
              subtitle="Upload citizenship, passport, agreements, screenshots, audio notes, signed contracts, QR codes, and bank receipts."
              icon={FileLock2}
            />
            <label className="flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-emerald-300/35 bg-emerald-400/10 p-6 text-center transition hover:bg-emerald-400/15">
              <UploadCloud className="text-emerald-200" size={42} />
              <span className="mt-3 text-lg font-black text-white">Drop files into encrypted vault</span>
              <span className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-emerald-50/60">
                OCR text extraction, folder tagging, encrypted local storage, secure backup export, and PDF export architecture are built into the vault workflow.
              </span>
              <input
                multiple
                type="file"
                className="sr-only"
                accept="image/*,application/pdf,audio/*"
                onChange={(event) => handleVaultUpload(event.target.files)}
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {["OCR extraction", "Search documents", "Folder organization", "Export PDF"].map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-2xl bg-white/[0.055] p-3 text-sm font-black text-emerald-50/80">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  {feature}
                </div>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/15 bg-white/[0.045] p-4 text-center transition hover:bg-white/[0.07]">
              <span className="text-sm font-black text-white">Run OCR on receipt or contract image</span>
              <span className="mt-1 text-xs font-semibold text-emerald-50/55">{ocrStatus || "Reads receipts, signed contracts, and payment screenshots."}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => extractOcrText(event.target.files)} />
            </label>
            {ocrText ? (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950/70 p-3 text-xs font-semibold leading-relaxed text-emerald-50/75">
                {ocrText}
              </pre>
            ) : null}
          </MotionCard>

          <MotionCard>
            <SectionHeader eyebrow="Vault ledger" title="Documents and proof timeline" icon={ClipboardList} />
            <label className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2">
              <Search size={17} className="text-emerald-300" />
              <input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Search documents, owners, folders"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-emerald-50/35"
              />
            </label>
            <div className="space-y-3">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                      <ReceiptText size={20} />
                    </div>
                    <div>
                      <p className="font-black text-white">{document.name}</p>
                      <p className="text-xs font-semibold text-emerald-50/60">
                        {document.folder} · {document.type} · {document.owner}
                      </p>
                    </div>
                  </div>
                  <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black text-emerald-100">
                    {document.status}
                  </span>
                </div>
              ))}
            </div>
          </MotionCard>
        </section>

        <section id="security" className="mt-6 grid gap-4 lg:grid-cols-3">
          <MotionCard className="min-h-[230px]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-200">
              <LockKeyhole size={22} />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">Security controls</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/65">
              PIN lock, hidden vault blur, and JSON backup export are active on this dashboard.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setLocked(true)}>
                <Fingerprint size={14} />
                Lock
              </Button>
              <Button size="sm" variant={vaultMode ? "solid" : "outline"} onClick={() => setVaultMode(!vaultMode)}>
                Hidden Vault
              </Button>
              <Button size="sm" variant="outline" onClick={exportBackup}>
                <ShieldCheck size={14} />
                Export backup
              </Button>
            </div>
          </MotionCard>

          <MotionCard className="min-h-[230px]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-200">
              <Banknote size={22} />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">KRW ↔ NPR analytics</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/65">Live-ready conversion with the current dashboard rate.</p>
            <input
              type="number"
              value={krwAmount}
              onChange={(event) => setKrwAmount(event.target.value)}
              placeholder="KRW amount"
              className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
            />
            <p className="mt-3 text-lg font-black text-white">{formatNpr(krwConvertedToNpr)}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-50/55">Advanced path: live forex API, fluctuation chart, and Korea salary impact analysis.</p>
          </MotionCard>

          <MotionCard className="min-h-[230px]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-200">
              <Gauge size={22} />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">FIRE impact calculator</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                value={savingsDraft}
                onChange={(event) => setSavingsDraft(event.target.value)}
                placeholder="Savings"
                className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
              />
              <input
                type="number"
                value={monthlyEmiDraft}
                onChange={(event) => setMonthlyEmiDraft(event.target.value)}
                placeholder="Monthly EMI"
                className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
              />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-black text-emerald-50/80">
                <span>FIRE readiness</span>
                <span>{fireImpactScore}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300" style={{ width: `${fireImpactScore}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-emerald-50/60">Debt stress meter: {debtStressScore}% · Return-to-Nepal readiness uses savings - liabilities - EMI.</p>
            </div>
          </MotionCard>

          <MotionCard className="min-h-[210px] lg:col-span-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">World-class upgrade roadmap</p>
                <h3 className="mt-2 text-xl font-black text-white">Cloud sync, AI repayment prediction, notifications, and QR tracking</h3>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-emerald-50/65">
                  Supabase is already in the stack for backend login/cloud sync. The next production layer can add encrypted storage, AI repayment prediction, auto EMI reminders, notification delivery, and QR payment tracking.
                </p>
              </div>
              <Button variant="outline" onClick={exportPdfReport}>
                <ReceiptText size={16} />
                Export PDF report
              </Button>
            </div>
          </MotionCard>
        </section>
      </section>

      <button
        type="button"
        onClick={openNewLoanEditor}
        className="fixed bottom-6 right-5 z-40 inline-flex items-center gap-3 rounded-full border border-emerald-300/40 bg-emerald-400 px-5 py-4 text-sm font-black text-emerald-950 shadow-[0_20px_70px_-20px_rgba(16,185,129,0.75)] transition hover:-translate-y-1 hover:bg-emerald-300"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-950 text-white">
          <Plus size={20} />
        </span>
        Add New Loan
      </button>

      {editingMetric ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Edit card</p>
                <h2 className="mt-2 text-2xl font-black text-white">{editableMetricLabels[editingMetric]}</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditingMetric(null)}>
                <X size={16} />
              </Button>
            </div>
            <input
              type="number"
              value={metricDraftValue}
              onChange={(event) => setMetricDraftValue(Number(event.target.value))}
              className="mt-5 w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-lg font-black text-white outline-none focus:border-emerald-300/60"
            />
            <Button className="mt-4 w-full" onClick={saveMetricEdit}>
              <Save size={16} />
              Save
            </Button>
          </motion.div>
        </div>
      ) : null}

      {editingProfile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="my-8 w-full max-w-4xl rounded-[1.75rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  {isAddingLoan ? "Create new loan" : "Edit loan profile"}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {isAddingLoan ? "Add New Loan" : editingProfile.fullName}
                </h2>
                <p className="mt-1 text-sm font-semibold text-emerald-50/60">
                  Track repayments, add reminders, attach agreement files, and keep notes with the loan.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingProfile(null);
                  setIsAddingLoan(false);
                }}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
                {editingProfile.avatar ? (
                  <img src={editingProfile.avatar} alt={`${editingProfile.fullName} profile`} className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={38} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">Profile avatar</p>
                <p className="mt-1 text-sm font-semibold text-emerald-50/60">Upload a borrower photo, or keep the secure default avatar.</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-black text-emerald-50 transition hover:-translate-y-0.5 hover:bg-white/[0.12]">
                  <UploadCloud size={16} />
                  Upload profile photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleAvatarUpload(event.target.files)} />
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Borrower name</span>
                <input
                  value={editingProfile.fullName}
                  onChange={(event) => updateProfileDraft("fullName", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Phone number</span>
                <input
                  value={editingProfile.phone}
                  onChange={(event) => updateProfileDraft("phone", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">WhatsApp number</span>
                <input
                  value={editingProfile.whatsapp}
                  onChange={(event) => updateProfileDraft("whatsapp", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Email address</span>
                <input
                  type="email"
                  value={editingProfile.email}
                  onChange={(event) => updateProfileDraft("email", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Emergency contact</span>
                <input
                  value={editingProfile.emergencyContact}
                  onChange={(event) => updateProfileDraft("emergencyContact", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Relationship type</span>
                <select
                  value={editingProfile.relationship}
                  onChange={(event) => updateProfileDraft("relationship", event.target.value as RelationshipTag)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                >
                  {(["Friend", "Family", "Employee", "Business", "Other"] as RelationshipTag[]).map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {relationship}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Citizenship</span>
                <input
                  value={editingProfile.citizenship}
                  onChange={(event) => updateProfileDraft("citizenship", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Korea ID (optional)</span>
                <input
                  value={editingProfile.koreaId}
                  onChange={(event) => updateProfileDraft("koreaId", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Passport number (optional)</span>
                <input
                  value={editingProfile.passport}
                  onChange={(event) => updateProfileDraft("passport", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Address</span>
                <input
                  value={editingProfile.address}
                  onChange={(event) => updateProfileDraft("address", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Bank name</span>
                <input
                  value={editingProfile.bank}
                  onChange={(event) => updateProfileDraft("bank", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Bank account number</span>
                <input
                  value={editingProfile.account}
                  onChange={(event) => updateProfileDraft("account", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">QR wallet</span>
                <input
                  value={editingProfile.qrWallet}
                  onChange={(event) => updateProfileDraft("qrWallet", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Lender name</span>
                <input
                  value={editingProfile.lenderName}
                  onChange={(event) => updateProfileDraft("lenderName", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Lender email</span>
                <input
                  type="email"
                  value={editingProfile.lenderEmail}
                  onChange={(event) => updateProfileDraft("lenderEmail", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Risk level</span>
                <select
                  value={editingProfile.risk}
                  onChange={(event) => updateProfileDraft("risk", event.target.value as RiskLevel)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                >
                  {(["Low", "Medium", "High", "Critical"] as RiskLevel[]).map((risk) => (
                    <option key={risk} value={risk}>
                      {risk}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Relationship since</span>
                <input
                  type="date"
                  value={editingProfile.relationshipStarted}
                  onChange={(event) => updateProfileDraft("relationshipStarted", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Completed loans</span>
                <div className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-emerald-50/75">
                  {completedLoansFromRepaymentHistory(editingProfile.paymentHistory)} completed from repayment history
                </div>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Credit score (internal)</span>
                <input
                  type="number"
                  value={editingProfile.score}
                  onChange={(event) => updateProfileDraft("score", Math.max(0, Math.min(100, Number(event.target.value))))}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Loan direction</span>
                <select
                  value={editingProfile.direction}
                  onChange={(event) => updateProfileDraft("direction", event.target.value as LoanDirection)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                >
                  <option value="lent">Money lent</option>
                  <option value="borrowed">Money borrowed</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Loan amount</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={profileNumberDrafts.principal}
                  onChange={(event) => updateProfileNumberDraft("principal", event.target.value)}
                  onFocus={() => clearZeroProfileNumberDraft("principal")}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Agreement date</span>
                <input
                  type="date"
                  value={editingProfile.agreementDate}
                  onChange={(event) => updateProfileDraft("agreementDate", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Paid / repaid</span>
                <input
                  type="number"
                  placeholder="Enter repaid amount"
                  value={profileNumberDrafts.paid}
                  onChange={(event) => updateProfileNumberDraft("paid", event.target.value)}
                  onFocus={() => clearZeroProfileNumberDraft("paid")}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Interest %</span>
                <input
                  type="number"
                  placeholder="Enter interest %"
                  value={profileNumberDrafts.annualRate}
                  onChange={(event) => updateProfileNumberDraft("annualRate", event.target.value)}
                  onFocus={() => clearZeroProfileNumberDraft("annualRate")}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Due date</span>
                <input
                  type="date"
                  value={editingProfile.nextDue}
                  onChange={(event) => updateProfileDraft("nextDue", event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Repayment schedule</span>
                <input
                  type="number"
                  placeholder="Installments left"
                  value={profileNumberDrafts.installmentsLeft}
                  onChange={(event) => updateProfileNumberDraft("installmentsLeft", event.target.value)}
                  onFocus={() => clearZeroProfileNumberDraft("installmentsLeft")}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Loan term / EMI months</span>
                <input
                  type="number"
                  placeholder="Enter months"
                  value={profileNumberDrafts.months}
                  onChange={(event) => updateProfileNumberDraft("months", event.target.value)}
                  onFocus={() => clearZeroProfileNumberDraft("months")}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Interest engine</span>
                <select
                  value={editingProfile.method}
                  onChange={(event) => updateProfileDraft("method", event.target.value as LoanMethod)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                >
                  {["Simple", "Compound", "Daily", "Monthly", "EMI", "Reducing Balance"].map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Currency</span>
                <select
                  value={editingProfile.currency}
                  onChange={(event) => updateProfileDraft("currency", event.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                >
                  <option value="NPR">NPR</option>
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/70">Notes</span>
                <textarea
                  value={editingProfile.notes}
                  onChange={(event) => updateProfileDraft("notes", event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm font-bold text-white outline-none focus:border-emerald-300/60"
                />
              </label>
              <div className="grid gap-3 md:col-span-2 sm:grid-cols-2 xl:grid-cols-4">
                {(["ID Card", "Passport", "Contract", "Receipt"] as BorrowerDocumentKind[]).map((kind) => (
                  <label
                    key={kind}
                    className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-emerald-300/35 bg-emerald-400/10 p-4 text-sm font-black text-emerald-50 transition hover:bg-emerald-400/15"
                  >
                    <span className="inline-flex items-center gap-2">
                      {kind === "ID Card" ? <IdCard size={18} /> : <UploadCloud size={18} />}
                      Upload {kind}
                    </span>
                    <span className="mt-2 truncate text-xs font-semibold text-emerald-50/55">
                      {editingProfile.documents[kind][0]?.name ?? "No file selected"}
                    </span>
                    <input
                      multiple
                      type="file"
                      className="sr-only"
                      accept="image/*,application/pdf"
                      onChange={(event) => handleProfileDocumentUpload(kind, event.target.files)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingProfile(null);
                  setIsAddingLoan(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveProfileEdit}>
                <Save size={16} />
                Save loan
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
