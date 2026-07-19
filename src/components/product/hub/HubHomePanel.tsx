"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Banknote,
  Bell,
  Brain,
  Building2,
  Calculator,
  CreditCard,
  Crown,
  FileText,
  Gem,
  HandCoins,
  Handshake,
  Home,
  Landmark,
  LayoutGrid,
  LineChart,
  Lock,
  PiggyBank,
  Plane,
  Play,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireMembership } from "@/contexts/FireMembershipContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";
import { MainAppCard, type LauncherItem } from "@/components/product/hub/MainAppCard";

type MembershipSectionId = "free" | "premium" | "elite";

type MembershipLauncherItem = LauncherItem & {
  plan: MembershipSectionId;
};

type ToolLauncherItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  accent: string;
};

const MEMBERSHIP_APP_SECTIONS: Array<{
  id: MembershipSectionId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "free" | "premium" | "elite";
  apps: MembershipLauncherItem[];
}> = [
  {
    id: "free",
    title: "Free",
    subtitle: "Core finance tools for everyone.",
    icon: Sparkles,
    tone: "free",
    apps: [
      {
        href: "/finance",
        title: "Finance",
        body: "Cashflow, expenses, budget & savings",
        icon: Banknote,
        accent: "from-emerald-600/30 to-cyan-400/10",
        plan: "free",
      },
      {
        href: "/cashflow-dashboard",
        title: "Cashflow",
        body: "Income, burn, savings rate & runway",
        icon: Wallet,
        accent: "from-emerald-600/30 to-cyan-400/10",
        plan: "free",
      },
      {
        href: "/budget",
        title: "Budget",
        body: "Plan spending, income & monthly targets",
        icon: Banknote,
        accent: "from-cyan-500/15 to-emerald-500/10",
        plan: "free",
      },
      {
        href: "/savings-tracker",
        title: "Savings",
        body: "Monthly KRW/NPR savings growth",
        icon: PiggyBank,
        accent: "from-lime-400/20 to-emerald-500/10",
        plan: "free",
      },
      {
        href: "/expense-dashboard?finance=personal",
        title: "Expense",
        body: "Track personal daily expenses",
        icon: ReceiptText,
        accent: "from-amber-500/15 to-emerald-500/10",
        plan: "free",
      },
      {
        href: "/group-expenses",
        title: "Group Expenses",
        body: "Shared bills, roommates & settlements",
        icon: HandCoins,
        accent: "from-emerald-500/35 to-lime-300/15",
        badge: "NEW",
        plan: "free",
      },
      {
        href: "/#calculator",
        title: "FIRE Calculator (Basic)",
        body: "Retirement projection & FI timeline",
        icon: Calculator,
        accent: "from-lime-400/25 to-emerald-600/15",
        plan: "free",
      },
      {
        href: "/sip-calculator",
        title: "SIP Calculator",
        body: "Monthly investing growth calculator",
        icon: BarChart3,
        accent: "from-emerald-500/20 to-lime-400/10",
        plan: "free",
      },
      {
        href: "/swp-calculator",
        title: "SWP Calculator",
        body: "Inflation-aware withdrawal & runway",
        icon: LineChart,
        accent: "from-teal-500/20 to-cyan-400/10",
        plan: "free",
      },
      {
        href: "/loan-calculator",
        title: "Loan EMI Calculator",
        body: "EMI for Nepal return",
        icon: Landmark,
        accent: "from-sky-500/15 to-emerald-500/10",
        plan: "free",
      },
      {
        href: "/inflation-calculator",
        title: "Inflation Calculator",
        body: "Future value in NPR",
        icon: TrendingUp,
        accent: "from-orange-500/15 to-emerald-500/10",
        plan: "free",
      },
      {
        href: "/remittance-calculator",
        title: "Remittance Calculator",
        body: "Compare fees and timing",
        icon: CreditCard,
        accent: "from-emerald-500/20 to-cyan-400/10",
        plan: "free",
      },
      {
        href: "/cost-of-living",
        title: "Cost of Living Calculator",
        body: "Nepal monthly expense planning",
        icon: Home,
        accent: "from-violet-500/15 to-teal-400/10",
        plan: "free",
      },
      {
        href: "/#learn",
        title: "Blogs",
        body: "Money guides for Nepalis abroad",
        icon: FileText,
        accent: "from-emerald-500/20 to-lime-400/10",
        plan: "free",
      },
      {
        href: "/#learn",
        title: "Videos",
        body: "Latest FIRE Nepal video lessons",
        icon: Play,
        accent: "from-amber-500/15 to-emerald-500/10",
        plan: "free",
      },
    ],
  },
  {
    id: "premium",
    title: "Premium",
    subtitle: "Advanced investing, planning & analytics.",
    icon: Gem,
    tone: "premium",
    apps: [
      {
        href: "/portfolio",
        title: "Portfolio",
        body: "Net worth, assets & wealth analytics",
        icon: Target,
        accent: "from-teal-500/30 to-emerald-400/10",
        plan: "premium",
      },
      {
        href: "/investment",
        title: "Investment",
        body: "Portfolio, NEPSE, SIP, SWP & assets",
        icon: TrendingUp,
        accent: "from-teal-500/30 to-emerald-400/10",
        plan: "premium",
      },
      {
        href: "/fire-planning",
        title: "FIRE Planning",
        body: "Calculator, journey & goals",
        icon: Calculator,
        accent: "from-lime-400/25 to-emerald-600/15",
        plan: "premium",
      },
      {
        href: "/market",
        title: "NEPSE",
        body: "Market data, watchlists & investing context",
        icon: BarChart3,
        accent: "from-blue-500/15 to-emerald-500/10",
        plan: "premium",
      },
      {
        href: "/portfolio/gold",
        title: "Gold",
        body: "Gold allocation & wealth tracking",
        icon: Gem,
        accent: "from-yellow-500/15 to-emerald-500/10",
        plan: "premium",
      },
      {
        href: "/portfolio/real-estate",
        title: "Real Estate",
        body: "Property assets & real estate analytics",
        icon: Home,
        accent: "from-orange-500/15 to-emerald-500/10",
        plan: "premium",
      },
      {
        href: "/cashflow-dashboard",
        title: "OCR Payslip",
        body: "Salary slip import & cashflow sync",
        icon: FileText,
        accent: "from-emerald-500/20 to-cyan-400/10",
        plan: "premium",
      },
      {
        href: "/fire-ai/wealth-summary",
        title: "AI Reports",
        body: "Wealth summary and AI financial reports",
        icon: Brain,
        accent: "from-emerald-500/25 to-lime-400/15",
        plan: "premium",
      },
      {
        href: "/fire-summary",
        title: "FIRE Journey",
        body: "Unified net worth, runway & FIRE progress",
        icon: TrendingUp,
        accent: "from-lime-400/20 to-emerald-500/10",
        plan: "premium",
      },
      {
        href: "/goals",
        title: "Goals",
        body: "Plan and track major money goals",
        icon: Target,
        accent: "from-teal-500/20 to-cyan-400/10",
        plan: "premium",
      },
      {
        href: "/korea-pension-dashboard",
        title: "Korea Finance",
        body: "Pension, severance & KRW planning",
        icon: Building2,
        accent: "from-indigo-500/15 to-emerald-500/10",
        plan: "premium",
      },
    ],
  },
  {
    id: "elite",
    title: "Elite",
    subtitle: "Professional AI, Business & Wealth Suite.",
    icon: Crown,
    tone: "elite",
    apps: [
      {
        href: "/fire-biz",
        title: "FIRE Biz",
        body: "Sales, stock, customers & receivables",
        icon: LayoutGrid,
        accent: "from-emerald-500/35 to-lime-300/15",
        testId: "hub-fire-biz-card",
        plan: "elite",
      },
      {
        href: "/fire-lending",
        title: "Loan & P2P Lending",
        body: "Borrow, Lend, Digital Agreements, EMI Tracking, AI Risk Analysis & Secure Peer-to-Peer Lending.",
        icon: Handshake,
        accent: "from-emerald-500/30 to-amber-300/15",
        badge: "NEW",
        testId: "hub-fire-lending-card",
        plan: "elite",
      },
      {
        href: "/fire-ai",
        title: "FIRE AI",
        body: "AI chat, guidance & smart finance tools",
        icon: Sparkles,
        accent: "from-emerald-500/25 to-lime-400/15",
        plan: "elite",
      },
      {
        href: "/fire-ai/expense-insights",
        title: "AI Advisor",
        body: "Personal finance insights and next steps",
        icon: Sparkles,
        accent: "from-emerald-500/25 to-lime-400/15",
        plan: "elite",
      },
      {
        href: "/family",
        title: "Family Hub",
        body: "Children, education, health & records",
        icon: Users,
        accent: "from-sky-500/15 to-emerald-500/10",
        plan: "elite",
      },
      {
        href: "/return-to-nepal",
        title: "Nepal Return Planner",
        body: "Return readiness & Nepal life planning",
        icon: Plane,
        accent: "from-violet-500/15 to-teal-400/10",
        plan: "elite",
      },
      {
        href: "/korea-pension-dashboard",
        title: "Korea Pension",
        body: "Korea NPS, severance & retirement checks",
        icon: Building2,
        accent: "from-indigo-500/15 to-emerald-500/10",
        plan: "elite",
      },
      {
        href: "/emergency-fund",
        title: "Emergency",
        body: "Safety fund progress tracker",
        icon: ShieldCheck,
        accent: "from-sky-500/15 to-emerald-500/10",
        plan: "elite",
      },
      {
        href: "/insurance",
        title: "Insurance",
        body: "Protection planning and coverage tracking",
        icon: ShieldCheck,
        accent: "from-emerald-500/20 to-sky-400/10",
        plan: "elite",
      },
      {
        href: "/portfolio/ai-insights",
        title: "AI Wealth Dashboard",
        body: "Elite wealth intelligence dashboard",
        icon: Brain,
        accent: "from-emerald-500/25 to-lime-400/15",
        plan: "elite",
      },
      {
        href: "/fire-biz/reports",
        title: "Business Finance Suite",
        body: "Profit, tax, purchases and business reports",
        icon: LayoutGrid,
        accent: "from-emerald-500/35 to-lime-300/15",
        plan: "elite",
      },
      {
        href: "/dashboard/membership",
        title: "Private Advisory Tools",
        body: "Elite advisory workflow and strategic tools",
        icon: Crown,
        accent: "from-amber-500/20 to-yellow-300/10",
        plan: "elite",
      },
    ],
  },
];

const ACCOUNT_TOOLS: ToolLauncherItem[] = [
  {
    href: "/dashboard/profile",
    title: "My Profile",
    icon: UserRound,
    accent: "from-emerald-500/20 to-lime-400/10",
  },
  {
    href: "/dashboard/membership",
    title: "Membership",
    icon: BadgeCheck,
    accent: "from-amber-500/15 to-emerald-500/10",
  },
  {
    href: "/dashboard/security",
    title: "Security",
    icon: Lock,
    accent: "from-sky-500/15 to-emerald-500/10",
  },
  {
    href: "/smart-reminders",
    title: "Reminders",
    icon: Bell,
    accent: "from-violet-500/15 to-teal-400/10",
  },
  {
    href: "/dashboard/settings",
    title: "Settings",
    icon: Settings,
    accent: "from-indigo-500/15 to-emerald-500/10",
  },
  {
    href: "/account",
    title: "Account",
    icon: CreditCard,
    accent: "from-emerald-500/20 to-cyan-400/10",
  },
];

function MembershipSectionHeader({
  section,
  light,
}: {
  section: (typeof MEMBERSHIP_APP_SECTIONS)[number];
  light: boolean;
}) {
  const Icon = section.icon;
  const toneClass =
    section.tone === "elite"
      ? light
        ? "border-amber-300/60 bg-gradient-to-r from-amber-50 via-yellow-50/80 to-white text-amber-800"
        : "border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-transparent text-amber-100"
      : section.tone === "premium"
        ? light
          ? "border-emerald-300/60 bg-gradient-to-r from-emerald-50 via-lime-50/80 to-white text-emerald-800"
          : "border-emerald-400/35 bg-gradient-to-r from-emerald-500/15 via-lime-400/10 to-transparent text-emerald-100"
        : light
          ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-white text-emerald-800"
          : "border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-[#04140f] to-transparent text-emerald-100";
  const iconClass =
    section.tone === "elite"
      ? light
        ? "border-amber-300/70 bg-amber-100 text-amber-700"
        : "border-amber-300/35 bg-amber-400/15 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]"
      : section.tone === "premium"
        ? light
          ? "border-emerald-300/70 bg-emerald-100 text-emerald-700"
          : "border-emerald-300/35 bg-emerald-400/15 text-emerald-300"
        : light
          ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
          : "border-white/10 bg-black/30 text-lime-200";

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:px-5 ${toneClass}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${iconClass}`}>
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-black tracking-tight sm:text-2xl">{section.title}</h3>
          <p className={`mt-1 text-xs font-semibold sm:text-sm ${light ? "text-slate-600" : "text-emerald-100/65"}`}>{section.subtitle}</p>
        </div>
      </div>
      <div
        className={`mt-4 h-px ${
          section.tone === "elite"
            ? "bg-gradient-to-r from-amber-400/55 via-amber-300/20 to-transparent"
            : "bg-gradient-to-r from-emerald-400/55 via-lime-300/20 to-transparent"
        }`}
      />
    </div>
  );
}

function CompactToolCard({ item, light }: { item: ToolLauncherItem; light: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex h-[108px] touch-manipulation flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-3 transition duration-200 active:scale-[0.98] sm:h-[112px] ${
        light
          ? "border-emerald-200/80 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)] hover:border-emerald-400/50"
          : "border-emerald-400/15 bg-emerald-950/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:border-emerald-300/35"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent} opacity-90`} aria-hidden />
      <span
        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
          light ? "border-emerald-200/80 bg-emerald-50 text-emerald-700" : "border-white/10 bg-black/30 text-lime-200"
        }`}
      >
        <item.icon size={20} strokeWidth={2.1} />
      </span>
      <h3
        className={`relative z-10 max-w-full truncate px-1 text-center text-xs font-black leading-tight sm:text-sm ${
          light ? "text-slate-900" : "text-white"
        }`}
      >
        {item.title}
      </h3>
    </Link>
  );
}

export function HubHomePanel() {
  const onboarding = useMemo(() => loadProductOnboarding(), []);
  const { isAdmin } = useProductAuth();
  const { tier } = useFireMembership();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const fireBiz = FIRE_BIZ_I18N.en.hubPromo;

  const eyebrowCls = light ? "text-emerald-700/85" : "text-emerald-200/55";
  const titleCls = light ? "text-slate-900" : "text-white";
  const subtitleCls = light ? "text-slate-600" : "text-emerald-100/65";

  return (
    <div className="mx-auto max-w-full min-w-0 space-y-4 animate-fade-up overflow-x-clip pb-2 sm:space-y-5">
      <div>
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${eyebrowCls}`}>App launcher</p>
        <h1 className={`mt-1.5 text-2xl font-black tracking-tight sm:text-3xl ${titleCls}`}>Your FIRE Nepal hub</h1>
        <p className={`mt-1.5 max-w-2xl text-sm font-medium leading-relaxed ${subtitleCls}`}>
          Open your core apps and popular tools — every card is one tap on mobile.
        </p>
      </div>

      {isAdmin ? (
        <Link
          href="/admin"
          className={`flex min-h-[64px] touch-manipulation items-center gap-3 rounded-2xl border p-4 transition active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
            light
              ? "border-violet-300/60 bg-gradient-to-br from-violet-50 to-fuchsia-50/80"
              : "border-violet-400/25 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                light ? "border-violet-300/50 bg-violet-100 text-violet-700" : "border-violet-400/30 bg-violet-500/15 text-violet-200"
              }`}
            >
              <Activity size={22} />
            </span>
            <div>
              <p className={`text-sm font-black ${titleCls}`}>Admin dashboard</p>
              <p className={`mt-1 text-xs font-medium ${light ? "text-violet-700/80" : "text-violet-100/75"}`}>
                Metrics, exports, and operations.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black ${
              light ? "border-violet-300/50 bg-white text-violet-800" : "border-violet-300/30 bg-violet-500/15 text-violet-100"
            }`}
          >
            Open
            <ArrowRight size={16} />
          </span>
        </Link>
      ) : null}

      {!onboarding.completed ? (
        <div
          className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            light ? "border-amber-300/60 bg-amber-50/90" : "border-amber-400/25 bg-amber-500/[0.07]"
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles className={`mt-0.5 shrink-0 ${light ? "text-amber-600" : "text-amber-200"}`} size={20} />
            <div>
              <p className={`text-sm font-black ${light ? "text-amber-950" : "text-amber-50"}`}>Finish onboarding</p>
              <p className={`mt-1 text-xs font-medium ${light ? "text-amber-900/75" : "text-amber-100/75"}`}>
                Sync cashflow from your onboarding answers when you add income.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex min-h-[44px] shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2.5 text-xs font-black text-emerald-950 shadow-lg transition active:scale-[0.98]"
          >
            Continue setup
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="hub-primary-apps" className="space-y-5">
        <h2 id="hub-primary-apps" className={`text-xs font-black uppercase tracking-[0.18em] ${eyebrowCls}`}>
          Main apps
        </h2>
        {MEMBERSHIP_APP_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3.5 sm:space-y-4">
            <MembershipSectionHeader section={section} light={light} />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {section.apps.map((item) => {
                const locked = item.plan === "elite" ? tier !== "elite" : item.plan === "premium" ? tier === "free" : false;
                const lockBadge = item.plan === "elite" ? "Elite" : item.plan === "premium" ? "Premium" : undefined;

                return (
                  <MainAppCard
                    key={`${section.id}-${item.title}-${item.href}`}
                    item={item}
                    light={light}
                    locked={locked}
                    lockBadge={locked ? lockBadge : undefined}
                  />
                );
              })}
            </div>
          </div>
          ))}
        <p className={`sr-only`}>{fireBiz.description}</p>
      </section>

      <section aria-labelledby="hub-account-tools">
        <h2 id="hub-account-tools" className={`text-xs font-black uppercase tracking-[0.18em] ${eyebrowCls}`}>
          Account
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:gap-4">
          {ACCOUNT_TOOLS.map((item) => (
            <CompactToolCard key={`${item.href}-${item.title}`} item={item} light={light} />
          ))}
        </div>
      </section>
    </div>
  );
}
