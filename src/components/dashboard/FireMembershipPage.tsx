"use client";

import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Brain,
  Building2,
  Calculator,
  Check,
  CreditCard,
  Crown,
  FileText,
  Gem,
  HandCoins,
  Home,
  Info,
  Landmark,
  LayoutGrid,
  LineChart,
  PiggyBank,
  Plane,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { MembershipPaymentModal } from "@/components/membership/MembershipPaymentModal";
import { MembershipPaymentSuccessDialog } from "@/components/membership/MembershipPaymentSuccessDialog";
import { MainAppCard, type LauncherItem, type MainAppCardState } from "@/components/product/hub/MainAppCard";
import { assertDisplayedPlanMatchesCanonical } from "@/lib/membership/canonical";
import {
  ELITE_FAMILY_WEALTH_DETAILS,
  ELITE_FAMILY_WEALTH_FEATURE_LABEL,
  hasActivePaidMembership,
  isMembershipUpgrade,
  TIER_CATALOG,
  TIER_DISPLAY,
  USAGE_LIMITS,
  type FireMembershipTier,
} from "@/lib/fire-membership";
import {
  PAYMENT_METHOD_LABEL,
  type MembershipPaymentSuccessPayload,
  type MembershipPaymentMethod,
  type MembershipRequestPlan,
} from "@/lib/membership-payment";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type CompareCell = boolean | "limited";

/** Founder cohort cap (copy + footers). */
const FOUNDER_MEMBER_CAP = 500;

function formatNpr(amount: number): string {
  const rounded = Math.round(amount);
  return `NPR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rounded)}`;
}

type BillingInterval = "monthly" | "yearly";

const PRICING = {
  yearly: {
    premium: {
      current: 500,
      original: 556,
      save: 56,
      discountPct: 10,
      discountLabel: "10% Early Adopter Discount",
    },
    elite: {
      current: 800,
      original: 1000,
      save: 200,
      discountPct: 20,
      discountLabel: "20% Early Adopter Discount",
    },
  },
  monthly: {
    premium: {
      /** Monthly equivalent of NPR 556/year list (rounded) */
      listMonthly: Math.round(556 / 12),
    },
    elite: {
      listMonthly: Math.round(1000 / 12),
    },
  },
} as const;

type MembershipAppPlan = FireMembershipTier;

type MembershipPlanAppSection = {
  plan: MembershipAppPlan;
  header: string;
  badge: string;
  subtitle: string;
  topLabel?: string;
  appCount: string;
  footerLines: string[];
  apps: LauncherItem[];
};

const MEMBERSHIP_APP_SHOWCASE: MembershipPlanAppSection[] = [
  {
    plan: "free",
    header: "🪄 Free",
    badge: "FREE",
    subtitle: "Everything you need to start your FIRE journey.",
    appCount: "9+ Apps Included",
    footerLines: ["9+ Apps Included", "Perfect for getting started"],
    apps: [
      {
        href: "/finance",
        title: "Finance",
        body: "Cashflow, expenses, budget & savings",
        icon: Banknote,
        accent: "from-emerald-600/30 to-cyan-400/10",
      },
      {
        href: "/budget",
        title: "Budget",
        body: "Plan spending, income & monthly targets",
        icon: Banknote,
        accent: "from-cyan-500/15 to-emerald-500/10",
      },
      {
        href: "/savings-tracker",
        title: "Savings",
        body: "Monthly KRW/NPR savings growth",
        icon: PiggyBank,
        accent: "from-lime-400/20 to-emerald-500/10",
      },
      {
        href: "/expense-dashboard?finance=personal",
        title: "Expense",
        body: "Track personal daily expenses",
        icon: ReceiptText,
        accent: "from-amber-500/15 to-emerald-500/10",
      },
      {
        href: "/group-expenses",
        title: "Group Expenses",
        body: "Shared bills, roommates & settlements",
        icon: HandCoins,
        accent: "from-emerald-500/35 to-lime-300/15",
        badge: "NEW",
      },
      {
        href: "/loan-calculator",
        title: "Loan EMI Calculator",
        body: "EMI for Nepal return",
        icon: Landmark,
        accent: "from-sky-500/15 to-emerald-500/10",
      },
      {
        href: "/inflation-calculator",
        title: "Inflation Calculator",
        body: "Future value in NPR",
        icon: TrendingUp,
        accent: "from-orange-500/15 to-emerald-500/10",
      },
      {
        href: "/remittance-calculator",
        title: "Remittance Calculator",
        body: "Compare fees and timing",
        icon: CreditCard,
        accent: "from-emerald-500/20 to-cyan-400/10",
      },
      {
        href: "/cost-of-living",
        title: "Cost of Living Calculator",
        body: "Nepal monthly expense planning",
        icon: Home,
        accent: "from-violet-500/15 to-teal-400/10",
      },
    ],
  },
  {
    plan: "premium",
    header: "💎 Premium",
    badge: "MOST POPULAR",
    subtitle: "Everything in Free plus powerful investment and planning tools.",
    topLabel: "Everything in Free +",
    appCount: "25+ Apps Included",
    footerLines: ["25+ Apps Included"],
    apps: [
      {
        href: "/investment",
        title: "Investment",
        body: "Portfolio, NEPSE, SIP, SWP & assets",
        icon: TrendingUp,
        accent: "from-teal-500/30 to-emerald-400/10",
      },
      {
        href: "/portfolio",
        title: "Portfolio",
        body: "Net worth, assets & wealth analytics",
        icon: Target,
        accent: "from-teal-500/30 to-emerald-400/10",
      },
      {
        href: "/market",
        title: "NEPSE",
        body: "Market data, watchlists & investing context",
        icon: BarChart3,
        accent: "from-blue-500/15 to-emerald-500/10",
      },
      {
        href: "/sip-calculator",
        title: "SIP",
        body: "Monthly investing growth calculator",
        icon: BarChart3,
        accent: "from-emerald-500/20 to-lime-400/10",
      },
      {
        href: "/swp-calculator",
        title: "SWP",
        body: "Inflation-aware withdrawal & runway",
        icon: LineChart,
        accent: "from-teal-500/20 to-cyan-400/10",
      },
      {
        href: "/fire-planning",
        title: "FIRE Calculator",
        body: "Retirement projection & FI timeline",
        icon: Calculator,
        accent: "from-lime-400/25 to-emerald-600/15",
      },
      {
        href: "/fire-ai",
        title: "FIRE AI",
        body: "AI chat, guidance & smart finance tools",
        icon: Sparkles,
        accent: "from-emerald-500/25 to-lime-400/15",
      },
      {
        href: "/cashflow-dashboard",
        title: "OCR Payslip",
        body: "Salary slip import & cashflow sync",
        icon: FileText,
        accent: "from-emerald-500/20 to-cyan-400/10",
      },
      {
        href: "/fire-ai/wealth-summary",
        title: "AI Reports",
        body: "Wealth summary and AI financial reports",
        icon: Brain,
        accent: "from-emerald-500/25 to-lime-400/15",
      },
      {
        href: "/fire-summary",
        title: "FIRE Journey",
        body: "Unified net worth, runway & FIRE progress",
        icon: TrendingUp,
        accent: "from-lime-400/20 to-emerald-500/10",
      },
      {
        href: "/goals",
        title: "Goals",
        body: "Plan and track major money goals",
        icon: Target,
        accent: "from-teal-500/20 to-cyan-400/10",
      },
      {
        href: "/fire-ai/expense-insights",
        title: "AI Advisor",
        body: "Personal finance insights and next steps",
        icon: Sparkles,
        accent: "from-emerald-500/25 to-lime-400/15",
      },
      {
        href: "/emergency-fund",
        title: "Emergency Fund",
        body: "Safety fund progress tracker",
        icon: ShieldCheck,
        accent: "from-sky-500/15 to-emerald-500/10",
      },
      {
        href: "/insurance",
        title: "Insurance Planner",
        body: "Protection planning and coverage tracking",
        icon: ShieldCheck,
        accent: "from-emerald-500/20 to-sky-400/10",
      },
      {
        href: "/return-to-nepal",
        title: "Nepal Return Planner",
        body: "Return readiness & Nepal life planning",
        icon: Plane,
        accent: "from-violet-500/15 to-teal-400/10",
      },
      {
        href: "/korea-pension-dashboard",
        title: "Korea Finance",
        body: "Pension, severance & KRW planning",
        icon: Building2,
        accent: "from-indigo-500/15 to-emerald-500/10",
      },
    ],
  },
  {
    plan: "elite",
    header: "👑 Elite",
    badge: "ELITE",
    subtitle: "Everything in Premium plus advanced wealth intelligence.",
    topLabel: "Everything in Premium +",
    appCount: "40+ Apps Included",
    footerLines: ["40+ Apps Included"],
    apps: [
      {
        href: "/fire-biz",
        title: "FIRE Biz",
        body: "Sales, stock, customers & receivables",
        icon: LayoutGrid,
        accent: "from-emerald-500/35 to-lime-300/15",
        testId: "hub-fire-biz-card",
      },
      {
        href: "/portfolio/real-estate",
        title: "Real Estate",
        body: "Property assets & real estate analytics",
        icon: Home,
        accent: "from-orange-500/15 to-emerald-500/10",
      },
      {
        href: "/portfolio/gold",
        title: "Gold",
        body: "Gold allocation & wealth tracking",
        icon: Gem,
        accent: "from-yellow-500/15 to-emerald-500/10",
      },
      {
        href: "/fire-biz/reports",
        title: "Business Finance",
        body: "Profit, tax, purchases and business reports",
        icon: LayoutGrid,
        accent: "from-emerald-500/35 to-lime-300/15",
      },
      {
        href: "/portfolio/ai-insights",
        title: "Wealth Dashboard",
        body: "Elite wealth intelligence dashboard",
        icon: Wallet,
        accent: "from-emerald-500/25 to-lime-400/15",
      },
      {
        href: "/family",
        title: "Family Wealth Planning",
        body: "Family assets, planning and records",
        icon: Users,
        accent: "from-sky-500/15 to-emerald-500/10",
      },
      {
        href: "/family",
        title: "Child Education Planner",
        body: "Education fund tracking and timeline",
        icon: PiggyBank,
        accent: "from-cyan-500/15 to-emerald-500/10",
      },
      {
        href: "/portfolio/ai-insights",
        title: "AI Portfolio Allocation",
        body: "Allocation intelligence and risk signals",
        icon: Brain,
        accent: "from-emerald-500/25 to-lime-400/15",
      },
      {
        href: "/dashboard/membership",
        title: "Private Advisory",
        body: "Elite advisory workflow and strategic tools",
        icon: Crown,
        accent: "from-amber-500/20 to-yellow-300/10",
      },
      {
        href: "/fire-ai/wealth-summary",
        title: "Advanced Reports",
        body: "Deeper wealth reports and exports",
        icon: FileText,
        accent: "from-amber-500/20 to-emerald-500/10",
      },
      {
        href: "/fire-ai",
        title: "Strategy Lab",
        body: "Scenario planning and AI strategy",
        icon: Sparkles,
        accent: "from-amber-500/20 to-yellow-300/10",
      },
    ],
  },
];

function useFounderWindowCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
    const ms = Math.max(0, end.getTime() - now);
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }, [now]);
}

const COMPARE_ROWS: { key: string; free: CompareCell; premium: CompareCell; elite: CompareCell; label: string }[] = [
  { key: "dash", label: "Advanced FIRE dashboard", free: false, premium: true, elite: true },
  { key: "calc", label: "FIRE calculator (full)", free: true, premium: true, elite: true },
  { key: "ocr", label: "OCR payslip import", free: false, premium: true, elite: true },
  { key: "coach", label: "AI financial coach", free: false, premium: true, elite: true },
  { key: "aipage", label: "AI coach dashboard (/ai-coach)", free: "limited", premium: true, elite: true },
  { key: "intel", label: "AI wealth intelligence", free: "limited", premium: true, elite: true },
  { key: "cagr", label: "CAGR & advanced analytics", free: false, premium: true, elite: true },
  { key: "mc", label: "Multi-currency intelligence", free: false, premium: true, elite: true },
  { key: "sim", label: "Advanced simulations", free: false, premium: true, elite: true },
  { key: "sync", label: "Cloud sync", free: false, premium: true, elite: true },
  { key: "pdf", label: "PDF reports", free: false, premium: true, elite: true },
  { key: "elite_ai_dash", label: "AI Wealth Dashboard", free: false, premium: false, elite: true },
  { key: "elite_family", label: ELITE_FAMILY_WEALTH_FEATURE_LABEL, free: false, premium: false, elite: true },
  { key: "elite_nepal", label: "Nepal Return Simulator", free: false, premium: false, elite: true },
  { key: "elite_rei", label: "Real Estate Intelligence", free: false, premium: false, elite: true },
  { key: "elite_alloc", label: "AI Portfolio Allocation", free: false, premium: false, elite: true },
  { key: "elite_advisory", label: "Private Advisory Tools", free: false, premium: false, elite: true },
  { key: "elite_biz", label: "Business Finance Suite", free: false, premium: false, elite: true },
];

function EliteFamilyWealthBullet({ checkClass }: { checkClass: string }) {
  const popoverId = `elite-family-scope-${useId().replace(/:/g, "")}`;

  return (
    <li className="relative flex min-h-[2.25rem] items-start gap-2.5 rounded-lg border-l border-amber-400/35 bg-amber-500/[0.04] py-2 pl-3 pr-1 sm:min-h-0">
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkClass}`} size={16} strokeWidth={3} aria-hidden />
      <span
        className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug tracking-tight text-amber-50/95 sm:text-sm"
        title={ELITE_FAMILY_WEALTH_FEATURE_LABEL}
      >
        {ELITE_FAMILY_WEALTH_FEATURE_LABEL}
      </span>
      <button
        type="button"
        popoverTarget={popoverId}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-amber-400/30 bg-amber-500/[0.08] text-amber-200/95 shadow-sm transition hover:border-amber-300/50 hover:bg-amber-500/18 hover:text-amber-50"
        aria-label="View family & education planning scope"
      >
        <Info size={14} strokeWidth={2.5} aria-hidden />
      </button>
      <div
        id={popoverId}
        popover="auto"
        className="z-[120] m-4 max-h-[min(70vh,22rem)] w-[min(18.5rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-amber-500/35 bg-[#060d0a]/95 p-4 text-left text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/85">Inside this suite</p>
        <ul className="mt-3 space-y-2 border-t border-amber-500/15 pt-3">
          {ELITE_FAMILY_WEALTH_DETAILS.map((line) => (
            <li key={line} className="flex gap-2 text-[11px] font-semibold leading-snug text-zinc-200 sm:text-xs">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] font-medium leading-relaxed text-zinc-500">
          Included in Elite — see feature list above for scope.
        </p>
      </div>
    </li>
  );
}

function CellIcon({ on, tone = "emerald" }: { on: CompareCell; tone?: "emerald" | "amber" }) {
  if (on === "limited")
    return (
      <span className="text-[10px] font-black uppercase text-amber-200/90" title="Limited on Free">
        Limited
      </span>
    );
  if (on)
    return (
      <Check
        className={tone === "amber" ? "mx-auto text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]" : "mx-auto text-emerald-400"}
        size={18}
        strokeWidth={3}
        aria-label="Included"
      />
    );
  return <span className="text-zinc-600">—</span>;
}

const TIER_ORDER: Record<FireMembershipTier, number> = {
  free: 0,
  premium: 1,
  elite: 2,
};

function tierIncludes(current: FireMembershipTier, required: FireMembershipTier) {
  return TIER_ORDER[current] >= TIER_ORDER[required];
}

function planCardState(currentTier: FireMembershipTier, plan: FireMembershipTier): MainAppCardState {
  if (tierIncludes(currentTier, plan)) return "included";
  return plan === "elite" ? "eliteLocked" : "premiumLocked";
}

function MembershipAppPlanSection({
  section,
  tier,
  onSelectTier,
}: {
  section: MembershipPlanAppSection;
  tier: FireMembershipTier;
  onSelectTier: (tier: FireMembershipTier) => void;
}) {
  const isFree = section.plan === "free";
  const isPremium = section.plan === "premium";
  const isElite = section.plan === "elite";
  const current = tier === section.plan;
  const included = tierIncludes(tier, section.plan);
  const cardState = planCardState(tier, section.plan);
  const lockBadge = cardState === "eliteLocked" ? "Elite" : cardState === "premiumLocked" ? "Premium" : undefined;
  const ctaLabel = current
    ? "Current Plan"
    : section.plan === "free"
      ? "Use Free"
      : section.plan === "premium"
        ? "Upgrade to Premium"
        : "Upgrade to Elite";
  const sectionChrome = isElite
    ? "border-amber-400/35 bg-gradient-to-br from-amber-500/[0.14] via-[#08140f] to-[#030806] shadow-[0_0_46px_rgba(245,158,11,0.13),0_28px_90px_rgba(0,0,0,0.55)] ring-1 ring-amber-400/20"
    : isPremium
      ? "border-emerald-400/35 bg-gradient-to-br from-emerald-500/[0.14] via-[#04140f] to-[#020807] shadow-[0_28px_90px_rgba(16,185,129,0.12)]"
      : "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-[#04140f] to-[#020807]";
  const badgeChrome = isElite
    ? "border-amber-400/45 bg-amber-500/18 text-amber-100"
    : isPremium
      ? "border-lime-400/45 bg-lime-400/15 text-lime-100"
      : "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  const ctaChrome = isElite
    ? current
      ? "border-amber-400/45 bg-amber-500/20 text-amber-50"
      : "border-amber-500/35 bg-gradient-to-r from-amber-400 to-yellow-300 text-emerald-950 shadow-[0_18px_42px_rgba(245,158,11,0.22)] hover:brightness-110"
    : current
      ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-50"
      : "border-emerald-400/30 bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg hover:brightness-110";

  return (
    <section
      className={`animate-fade-up relative isolate overflow-hidden rounded-[1.75rem] border p-5 transition-all duration-300 sm:p-6 lg:p-7 ${sectionChrome}`}
      aria-labelledby={`membership-${section.plan}-apps`}
    >
      {isPremium ? (
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(105deg,transparent_0%,rgba(190,242,100,0.08)_45%,rgba(52,211,153,0.11)_55%,transparent_100%)] animate-[ai-wi-shimmer_7.5s_ease-in-out_infinite]"
          aria-hidden
        />
      ) : null}
      {isElite ? (
        <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-amber-300/20" aria-hidden />
      ) : null}
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id={`membership-${section.plan}-apps`} className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {section.header}
            </h2>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeChrome}`}>
              {section.badge}
            </span>
          </div>
          <p className={`mt-2 max-w-2xl text-sm font-semibold leading-relaxed ${isElite ? "text-amber-50/78" : "text-emerald-100/70"}`}>
            {section.subtitle}
          </p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-right ${isElite ? "border-amber-400/25 bg-amber-500/[0.08]" : "border-emerald-400/20 bg-black/25"}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isElite ? "text-amber-200/75" : "text-emerald-200/70"}`}>
            Included Apps
          </p>
          <p className={`mt-1 text-lg font-black ${isElite ? "text-amber-50" : "text-white"}`}>{section.appCount}</p>
        </div>
      </div>

      {section.topLabel ? (
        <div className="relative z-10 my-5 flex items-center gap-3">
          <span className={`h-px flex-1 ${isElite ? "bg-gradient-to-r from-amber-400/45 to-transparent" : "bg-gradient-to-r from-emerald-400/45 to-transparent"}`} />
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeChrome}`}>
            {section.topLabel}
          </span>
          <span className={`h-px flex-1 ${isElite ? "bg-gradient-to-l from-amber-400/45 to-transparent" : "bg-gradient-to-l from-emerald-400/45 to-transparent"}`} />
        </div>
      ) : (
        <div className={`relative z-10 my-5 h-px ${isElite ? "bg-gradient-to-r from-amber-400/45 via-amber-300/10 to-transparent" : "bg-gradient-to-r from-emerald-400/45 via-lime-300/10 to-transparent"}`} />
      )}

      <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {section.apps.map((item) => (
          <MainAppCard
            key={`${section.plan}-${item.title}-${item.href}`}
            item={item}
            light={false}
            locked={!included}
            lockBadge={lockBadge}
            state={cardState}
          />
        ))}
      </div>

      <div className="relative z-10 mt-5 flex flex-col gap-4 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {section.footerLines.map((line) => (
            <span
              key={line}
              className={`inline-flex items-center gap-2 text-sm font-black ${isElite ? "text-amber-100" : "text-emerald-100"}`}
            >
              <Check size={16} strokeWidth={3} className={isElite ? "text-amber-300" : "text-lime-300"} aria-hidden />
              {line}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onSelectTier(section.plan)}
          className={`inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-xl border px-5 py-3 text-sm font-black transition active:scale-[0.98] ${ctaChrome}`}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}

type MyRequestRow = {
  id: string;
  plan_type: MembershipRequestPlan;
  payment_method: MembershipPaymentMethod;
  reference: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
};

function MembershipMyRequestsPanel() {
  const { user } = useProductAuth();
  const [rows, setRows] = useState<MyRequestRow[] | null>(null);

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      const r = await fetch("/api/membership-requests", { credentials: "include", cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { requests?: MyRequestRow[] };
      if (r.ok) setRows(j.requests ?? []);
    } catch {
      setRows([]);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const on = () => void load();
    window.addEventListener("fn-membership-requests-reload", on);
    return () => window.removeEventListener("fn-membership-requests-reload", on);
  }, [load]);

  if (!user || !isSupabaseConfigured()) return null;

  if (rows === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="text-sm font-medium text-zinc-500">Loading your payment requests…</p>
      </div>
    );
  }

  if (rows.length === 0) return null;

  const preview = async (id: string) => {
    const r = await fetch(`/api/membership-requests/${id}/proof-url`, { credentials: "include", cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as { signedUrl?: string };
    if (r.ok && j.signedUrl) window.open(j.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Your payment requests</h3>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-bold text-white">
                {row.plan_type === "elite" ? "Elite" : "Premium"} · {PAYMENT_METHOD_LABEL[row.payment_method]}
              </p>
              <p className="text-xs text-zinc-500">{new Date(row.created_at).toLocaleString()}</p>
              {row.reference ? (
                <p className="mt-1 text-xs font-medium text-zinc-400">
                  Ref: <span className="font-mono text-zinc-300">{row.reference}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  row.status === "approved"
                    ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                    : row.status === "rejected"
                      ? "border border-rose-400/35 bg-rose-500/15 text-rose-200"
                      : "border border-amber-400/35 bg-amber-500/15 text-amber-100"
                }`}
              >
                {row.status}
              </span>
              <button
                type="button"
                onClick={() => void preview(row.id)}
                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-white/10"
              >
                Preview proof
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FireMembershipPage() {
  const { user } = useProductAuth();
  const { membership, record, setTierDemo, syncServerEntitlement, pendingMembershipRequest } =
    useFireMembership();
  const { profile } = useCurrentUserProfile();
  const [confirmDowngrade, setConfirmDowngrade] = useState<FireMembershipTier | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
  const [paymentPlan, setPaymentPlan] = useState<MembershipRequestPlan | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<MembershipPaymentSuccessPayload | null>(null);
  const founderCountdown = useFounderWindowCountdown();

  // Display plan = stored user_profiles.membership_plan (matches Admin). Gates use accessPlan (`tier`).
  const displayPlan = membership.plan;
  const accessPlan = membership.accessPlan;

  useEffect(() => {
    void syncServerEntitlement();
  }, [syncServerEntitlement]);

  useEffect(() => {
    if (!profile) return;
    assertDisplayedPlanMatchesCanonical("FireMembershipPage", displayPlan, membership);
    assertDisplayedPlanMatchesCanonical("FireMembershipPage/profileRow", profile.membershipPlan, membership);
  }, [displayPlan, membership, profile]);

  const onSelectTier = useCallback(
    (next: FireMembershipTier) => {
      if (next === accessPlan && next === displayPlan) return;
      if (next === "free" && displayPlan !== "free") {
        setConfirmDowngrade(next);
        return;
      }
      if (next === "premium" || next === "elite") {
        if (isSupabaseConfigured()) {
          if (isMembershipUpgrade(accessPlan, next)) {
            setPaymentPlan(next);
            setConfirmDowngrade(null);
            return;
          }
          toast.info(
            "Paid plan changes require admin approval. Choose a higher plan and submit payment proof, or wait for your pending request to be reviewed.",
            { duration: 7000 },
          );
          setConfirmDowngrade(null);
          return;
        }
        setTierDemo(next);
        setConfirmDowngrade(null);
        return;
      }
      if (next === "free") {
        setTierDemo("free");
        setConfirmDowngrade(null);
      }
    },
    [accessPlan, displayPlan, setTierDemo],
  );

  const fnId = profile?.fireNepalId || "Not assigned";
  const verified = user?.emailVerified === true;

  const renewalLabel = useMemo(() => {
    if (displayPlan === "free") return "Upgrade to start a paid period.";
    if (membership.membershipExpiry) return new Date(membership.membershipExpiry).toLocaleDateString();
    if (record.currentPeriodEnd) return new Date(record.currentPeriodEnd).toLocaleDateString();
    return "Not set";
  }, [displayPlan, membership.membershipExpiry, record.currentPeriodEnd]);

  const limits = USAGE_LIMITS[accessPlan];
  const aiLimit = limits.aiCoachQueries;
  const ocrLimit = limits.ocrImports;
  const aiLabel = Number.isFinite(aiLimit)
    ? `${record.aiCoachQueries} / ${aiLimit}`
    : "Unlimited";
  const ocrLabel = Number.isFinite(ocrLimit) ? `${record.ocrImports} / ${ocrLimit}` : "Unlimited";

  if (!user) {
    return <div className="py-20 text-center text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-28 lg:pb-12">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Membership</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-emerald-100/55">
          Annual founder pricing for early members. Pay with Khalti, eSewa, or Global IME QR — upload proof and we
          activate Premium or Elite after a quick admin review.
        </p>
      </div>

      {isSupabaseConfigured() && pendingMembershipRequest && !hasActivePaidMembership(record) ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-[#1a1204]/80 to-[#04140f]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6"
        >
          <p className="text-sm font-black uppercase tracking-[0.12em] text-amber-200/90">Membership Pending Review</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-amber-50/90">
            Your {pendingMembershipRequest.plan === "elite" ? "Elite" : "Premium"} payment proof was received and is
            pending admin review. Premium and Elite features stay locked until your membership is approved.
          </p>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-[#04140f]/95 to-[#020807] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">Current Plan</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black text-white shadow-lg ring-1 ring-white/10 bg-gradient-to-r ${TIER_DISPLAY[displayPlan].accent}`}
              >
                {displayPlan === "elite" ? <Crown size={18} className="text-amber-200" /> : null}
                {displayPlan === "premium" ? <Gem size={18} className="text-emerald-100" /> : null}
                {displayPlan === "free" ? <Sparkles size={18} className="text-zinc-200" /> : null}
                {TIER_DISPLAY[displayPlan].label}
              </span>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-200">
                  <BadgeCheck size={14} />
                  Verified
                </span>
              ) : null}
              {membership.status === "suspended" ? (
                <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-rose-100">
                  Suspended
                </span>
              ) : null}
              {membership.status === "expired" ? (
                <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-red-100">
                  Expired
                </span>
              ) : null}
              {displayPlan === "premium" && membership.status === "active" ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                  Premium active
                </span>
              ) : null}
              {displayPlan === "elite" && (membership.status === "active" || membership.status === "expiring_soon") ? (
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
                  Elite active
                </span>
              ) : null}
            </div>
            <p className="mt-4 font-mono text-lg font-black text-emerald-100/90 sm:text-xl">{fnId}</p>
            <p className="mt-1 text-xs text-zinc-500">FIRE Nepal member ID · stable for this account</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Link
              href="/portfolio"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/5"
            >
              Open wealth dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-lg transition hover:-translate-y-0.5"
            >
              My Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">Renewal / period end</p>
          <p className="mt-2 text-lg font-bold text-white">{renewalLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {isSupabaseConfigured()
              ? "After approval, your plan syncs from your account profile."
              : "Your paid period end date will appear here after checkout."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">AI coach quota (mo)</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">{aiLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">Counters reset at the start of each calendar month.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase text-zinc-500">OCR imports (mo)</p>
          <p className="mt-2 text-lg font-bold text-emerald-200">{ocrLabel}</p>
          <p className="mt-1 text-xs text-zinc-500">Included with Premium and Elite.</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">Choose your plan</h2>
            <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-zinc-500 sm:text-sm">
              {isSupabaseConfigured()
                ? "Choose Premium or Elite to open the payment modal, scan a QR in NPR, and submit proof. Without cloud auth, tier changes stay on this device only."
                : "Lock founder annual rates while seats last. Without Supabase, tier selection stays in this browser only."}
            </p>
          </div>
          <div
            className="flex shrink-0 rounded-2xl border border-white/10 bg-black/40 p-1 shadow-inner shadow-black/40"
            role="tablist"
            aria-label="Billing period"
          >
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === "monthly"}
              onClick={() => setBillingInterval("monthly")}
              className={`min-h-[44px] min-w-[6.5rem] rounded-xl px-4 text-xs font-black uppercase tracking-wide transition sm:min-w-[7.5rem] sm:text-[11px] ${
                billingInterval === "monthly"
                  ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={billingInterval === "yearly"}
              onClick={() => setBillingInterval("yearly")}
              className={`min-h-[44px] min-w-[6.5rem] rounded-xl px-4 text-xs font-black uppercase tracking-wide transition sm:min-w-[7.5rem] sm:text-[11px] ${
                billingInterval === "yearly"
                  ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/[0.08] via-[#04140f] to-[#020807] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Limited Founder Pricing</p>
            <p className="mt-1 text-sm font-bold text-white">Founder window resets monthly · lock annual pricing early.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-black/30 px-3 py-2 font-mono text-sm font-black tabular-nums text-lime-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">Ends in</span>
            {founderCountdown}
          </div>
        </div>

        <div className="relative isolate rounded-[1.75rem] border border-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          {/* Solid fill layer only — avoids clipping the corner ribbon (was overflow-hidden on outer). */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[#030806]/80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-[-5.5rem] top-2 z-20 flex w-[21rem] min-w-[21rem] rotate-45 items-center justify-center bg-gradient-to-r from-lime-400 via-emerald-400 to-emerald-600 px-16 py-3 text-center text-[9px] font-black uppercase leading-snug tracking-[0.08em] text-emerald-950 shadow-lg sm:right-[-4.5rem] sm:top-4 sm:w-[24rem] sm:min-w-[24rem] sm:px-20 sm:py-3.5 sm:text-[10px] sm:tracking-[0.1em] md:right-[-3.75rem] md:top-5 md:w-[26rem] md:min-w-[26rem] md:px-24 md:text-[11px] md:tracking-[0.12em]"
            aria-hidden
          >
            <span className="block max-w-none whitespace-nowrap px-2">Founding Member Offer</span>
          </div>

          <div className="relative z-10 grid gap-5 overflow-hidden rounded-[1.75rem] p-5 pt-14 sm:p-6 sm:pt-16 lg:grid-cols-[1fr_1.12fr_1fr] lg:items-stretch lg:gap-5 lg:p-7 lg:pt-[4.25rem]">
            {(["free", "premium", "elite"] as const).map((t, i) => {
              const cat = TIER_CATALOG[t];
              const activeCard = displayPlan === t;
              const delay = i * 80;
              const isElite = t === "elite";
              const isPremium = t === "premium";
              const isFree = t === "free";
              const baseCard =
                "animate-fade-up relative flex h-full min-h-0 flex-col rounded-[1.5rem] border p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out sm:p-7";
              const sizing = isPremium ? "lg:z-10 lg:-my-1 lg:scale-[1.02] lg:px-7 lg:py-8 lg:shadow-[0_32px_80px_rgba(16,185,129,0.18)]" : "";
              const eliteCard = isElite
                ? activeCard
                  ? "border-amber-400/45 bg-gradient-to-b from-amber-500/[0.14] via-[#0a1610] to-[#04140f] ring-1 ring-amber-400/30 hover:-translate-y-0.5"
                  : "border-amber-500/25 bg-gradient-to-b from-amber-950/40 via-[#07140f] to-[#04140f]/95 hover:-translate-y-0.5 hover:border-amber-400/40"
                : isPremium
                  ? activeCard
                    ? "border-emerald-400/55 bg-gradient-to-b from-emerald-500/22 to-[#04140f]/95 ring-2 ring-emerald-400/35 hover:-translate-y-0.5"
                    : "border-emerald-400/35 bg-gradient-to-b from-emerald-500/12 to-[#04140f]/95 hover:-translate-y-0.5 hover:border-emerald-400/50"
                  : activeCard
                    ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-[#04140f]/95 ring-1 ring-emerald-400/25"
                    : "border-white/10 bg-[#061912]/90 hover:-translate-y-0.5 hover:border-emerald-500/25";
              return (
                <div key={t} style={{ animationDelay: `${delay}ms` }} className={`${baseCard} ${eliteCard} ${sizing}`}>
                  {isElite ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
                  ) : null}
                  {isPremium ? (
                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-lime-400/45 bg-gradient-to-r from-lime-400/25 to-emerald-500/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-lime-100 shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
                      Most Popular
                    </div>
                  ) : null}
                  {isElite ? (
                    <div className="absolute -top-3 right-4 rounded-full border border-amber-400/45 bg-gradient-to-r from-amber-500/30 to-amber-600/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      Elite desk
                    </div>
                  ) : null}

                  <div className="flex min-w-0 items-center gap-2">
                    {isElite ? <Crown className="shrink-0 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]" size={22} /> : null}
                    {isPremium ? <Gem className="shrink-0 text-emerald-300" size={22} /> : null}
                    {isFree ? <Sparkles className="shrink-0 text-zinc-400" size={22} /> : null}
                    <h3 className="min-w-0 truncate text-xl font-black tracking-tight text-white">{TIER_DISPLAY[t].label}</h3>
                  </div>
                  <p className="mt-3 min-h-[2.75rem] text-sm font-semibold leading-snug text-zinc-400 sm:min-h-[2.5rem]">{cat.tagline}</p>

                  {isFree ? (
                    <div className="mt-4">
                      <p className="text-3xl font-black tracking-tight text-white tabular-nums">{formatNpr(0)}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">Core access · upgrade anytime</p>
                    </div>
                  ) : null}

                  {isPremium && billingInterval === "yearly" ? (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-sm font-bold text-zinc-500 line-through decoration-zinc-500/90">
                        {formatNpr(PRICING.yearly.premium.original)}/year
                      </p>
                      <p className="text-xl font-black tabular-nums tracking-tight text-white sm:text-2xl">
                        {formatNpr(PRICING.yearly.premium.original)} → {formatNpr(PRICING.yearly.premium.current)}/year
                      </p>
                      <p className="text-sm font-bold text-lime-200">
                        Save {formatNpr(PRICING.yearly.premium.save)}/year
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-lg border border-lime-400/40 bg-lime-400/15 px-2 py-0.5 text-[11px] font-black text-lime-100">
                          {PRICING.yearly.premium.discountPct}% off
                        </span>
                        <span className="text-xs font-semibold text-emerald-100/85">{PRICING.yearly.premium.discountLabel}</span>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-100">
                        Only for first {FOUNDER_MEMBER_CAP} users
                      </span>
                    </div>
                  ) : null}

                  {isPremium && billingInterval === "monthly" ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-3xl font-black tabular-nums tracking-tight text-white">
                        {formatNpr(PRICING.monthly.premium.listMonthly)}/month
                      </p>
                      <p className="text-xs font-medium leading-relaxed text-zinc-500">
                        List rate equivalent to {formatNpr(PRICING.yearly.premium.original)}/year when paid monthly. Switch
                        to yearly for {formatNpr(PRICING.yearly.premium.current)}/year founder pricing (
                        {formatNpr(PRICING.yearly.premium.save)} saved).
                      </p>
                    </div>
                  ) : null}

                  {isElite && billingInterval === "yearly" ? (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-sm font-bold text-zinc-500 line-through decoration-zinc-500/90">
                        {formatNpr(PRICING.yearly.elite.original)}/year
                      </p>
                      <p className="text-xl font-black tabular-nums tracking-tight text-amber-50 sm:text-2xl">
                        {formatNpr(PRICING.yearly.elite.original)} → {formatNpr(PRICING.yearly.elite.current)}/year
                      </p>
                      <p className="text-sm font-bold text-amber-200">
                        Save {formatNpr(PRICING.yearly.elite.save)}/year
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-lg border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[11px] font-black text-amber-50">
                          {PRICING.yearly.elite.discountPct}% off
                        </span>
                        <span className="text-xs font-semibold text-amber-100/90">{PRICING.yearly.elite.discountLabel}</span>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                        Only for first {FOUNDER_MEMBER_CAP} users
                      </span>
                    </div>
                  ) : null}

                  {isElite && billingInterval === "monthly" ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-3xl font-black tabular-nums tracking-tight text-amber-50">
                        {formatNpr(PRICING.monthly.elite.listMonthly)}/month
                      </p>
                      <p className="text-xs font-medium leading-relaxed text-zinc-500">
                        List rate equivalent to {formatNpr(PRICING.yearly.elite.original)}/year when paid monthly. Switch to
                        yearly for {formatNpr(PRICING.yearly.elite.current)}/year founder pricing (
                        {formatNpr(PRICING.yearly.elite.save)} saved).
                      </p>
                    </div>
                  ) : null}

                  <ul className="mt-6 flex flex-1 flex-col gap-3">
                    {cat.bullets.map((b) =>
                      b === ELITE_FAMILY_WEALTH_FEATURE_LABEL && isElite ? (
                        <EliteFamilyWealthBullet key={b} checkClass="text-amber-400" />
                      ) : (
                        <li
                          key={b}
                          className={`flex min-h-[2.25rem] items-start gap-2.5 rounded-lg sm:min-h-0 ${
                            isElite ? "border-l border-amber-400/35 bg-amber-500/[0.04] py-2 pl-3 pr-1" : ""
                          }`}
                        >
                          <Check
                            className={`mt-0.5 h-4 w-4 shrink-0 ${isElite ? "text-amber-400" : "text-emerald-400"}`}
                            size={16}
                            strokeWidth={3}
                            aria-hidden
                          />
                          <span
                            className={`min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug tracking-tight sm:text-sm ${
                              isElite ? "text-amber-50/95" : "text-emerald-100/85"
                            }`}
                            title={b}
                          >
                            {b}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onSelectTier(t)}
                    className={`mt-auto flex w-full items-center justify-center rounded-xl border px-4 pb-3.5 pt-8 text-sm font-black transition ${
                      isElite
                        ? activeCard
                          ? "border border-amber-400/45 bg-amber-500/20 text-amber-50 hover:bg-amber-500/28"
                          : "border border-amber-500/30 bg-gradient-to-r from-amber-500/25 to-amber-600/15 text-amber-50 shadow-[0_12px_32px_rgba(0,0,0,0.35)] hover:border-amber-400/45 hover:brightness-110"
                        : activeCard
                          ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-50"
                          : "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg hover:brightness-110"
                    }`}
                  >
                    {activeCard
                      ? "Current Plan"
                      : t === "free"
                        ? "Use Free"
                        : `Select ${TIER_DISPLAY[t].label}`}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="border-t border-white/[0.06] px-5 py-4 text-center text-xs font-semibold text-zinc-500 sm:px-7">
            Prices may increase after first {FOUNDER_MEMBER_CAP} members.
          </p>
        </div>
      </div>

      <section className="space-y-5" aria-labelledby="membership-apps-by-plan">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">Main Apps</p>
          <h2 id="membership-apps-by-plan" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Pick the plan that unlocks your next workspace
          </h2>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-emerald-100/55">
            The same FIRE Nepal app cards from your Home hub, grouped by Free, Premium, and Elite access.
          </p>
        </div>
        <div className="space-y-6 sm:space-y-8">
          {MEMBERSHIP_APP_SHOWCASE.map((section) => (
            <MembershipAppPlanSection
              key={section.plan}
              section={section}
              tier={displayPlan}
              onSelectTier={onSelectTier}
            />
          ))}
        </div>
      </section>

      <section id="membership-request-status" className="scroll-mt-28">
        <MembershipMyRequestsPanel />
      </section>

      {confirmDowngrade ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-xl">
          <p className="text-sm font-bold text-amber-50">Switch to Free? Premium surfaces (OCR, AI coach, advanced analytics) will lock until you upgrade again.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTierDemo("free");
                setConfirmDowngrade(null);
              }}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-amber-950"
            >
              Confirm Free
            </button>
            <button
              type="button"
              onClick={() => setConfirmDowngrade(null)}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-white/10 bg-[#04140f]/80 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300/70">Feature comparison</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <th className="pb-3 pr-4">Capability</th>
                <th className="pb-3 pr-4 text-center">Free</th>
                <th className="pb-3 pr-4 text-center">Premium</th>
                <th className="pb-3 text-center">Elite</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {COMPARE_ROWS.map((row) => {
                const eliteExclusive = row.free === false && row.premium === false && row.elite === true;
                return (
                  <tr
                    key={row.key}
                    className={`border-b border-white/5 ${eliteExclusive ? "bg-gradient-to-r from-amber-500/[0.07] via-transparent to-transparent" : ""}`}
                  >
                    <td className="min-w-[12rem] max-w-[min(52vw,20rem)] py-3 pr-4 font-semibold text-white sm:max-w-none sm:min-w-[16rem]">
                      <span
                        className={`block truncate sm:whitespace-nowrap ${eliteExclusive ? "text-amber-50/95" : ""}`}
                        title={
                          row.key === "elite_family"
                            ? [ELITE_FAMILY_WEALTH_FEATURE_LABEL, "", ...ELITE_FAMILY_WEALTH_DETAILS.map((d) => `· ${d}`)].join("\n")
                            : row.label
                        }
                      >
                        {row.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <CellIcon on={row.free} />
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <CellIcon on={row.premium} />
                    </td>
                    <td className="py-3 text-center">
                      <CellIcon on={row.elite} tone={eliteExclusive ? "amber" : "emerald"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Account dates</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Joined</dt>
              <dd className="font-bold text-white">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Membership active since</dt>
              <dd className="font-bold text-white">
                {membership.membershipStart
                  ? new Date(membership.membershipStart).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Annual anniversary</dt>
              <dd className="font-bold text-amber-200/90">
                {membership.membershipExpiry
                  ? new Date(membership.membershipExpiry).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-6 backdrop-blur-xl">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-300/70">Billing & renewals</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            {isSupabaseConfigured()
              ? "QR payments are verified manually. Stripe checkout and webhooks can be added later for automatic renewals — your subscription row is already prepared when an admin approves."
              : "Stripe Checkout, webhooks for renewals, and the customer portal will activate before public billing. Until then, tier selection here keeps product gates in sync in this browser."}
          </p>
        </div>
      </div>

      <p className="text-center text-xs font-medium text-zinc-500">
        {isSupabaseConfigured()
          ? "Paid access is enforced from your Supabase profile after approval. QR placeholders can be replaced with real static QRs via NEXT_PUBLIC_MEMBERSHIP_QR_* or files in /public/payment-qr/."
          : "Tier is stored in this browser until cloud billing is connected."}
      </p>

      <MembershipPaymentSuccessDialog
        open={paymentSuccess !== null}
        onOpenChange={(o) => {
          if (!o) setPaymentSuccess(null);
        }}
        payload={paymentSuccess}
        onViewMembershipStatus={() => {
          window.dispatchEvent(new Event("fn-membership-requests-reload"));
          requestAnimationFrame(() => {
            document.getElementById("membership-request-status")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
        }}
      />

      {paymentPlan ? (
        <MembershipPaymentModal
          key={paymentPlan}
          open
          onOpenChange={(o) => {
            if (!o) setPaymentPlan(null);
          }}
          plan={paymentPlan}
          onSubmitted={(payload) => {
            setPaymentSuccess(payload);
            void syncServerEntitlement();
            window.dispatchEvent(new Event("fn-membership-requests-reload"));
          }}
        />
      ) : null}
    </div>
  );
}
