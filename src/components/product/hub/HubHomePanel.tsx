"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  ChevronRight,
  LayoutGrid,
  LineChart,
  Plane,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { FIRE_BIZ_I18N } from "@/lib/fire-biz/i18n";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";

type LauncherItem = {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
  accent: string;
  testId?: string;
};

const PRIMARY_APPS: LauncherItem[] = [
  {
    href: "/fire-biz",
    title: "FIRE Biz",
    body: "Sales, stock, customers & receivables",
    icon: LayoutGrid,
    accent: "from-emerald-500/35 to-lime-300/15",
    testId: "hub-fire-biz-card",
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    body: "Net worth, assets & wealth analytics",
    icon: Target,
    accent: "from-teal-500/30 to-emerald-400/10",
  },
  {
    href: "/cashflow-dashboard",
    title: "Cashflow",
    body: "Income, burn, savings rate & runway",
    icon: Wallet,
    accent: "from-emerald-600/30 to-cyan-400/10",
  },
  {
    href: "/#calculator",
    title: "FIRE Calculator",
    body: "Retirement projection & FI timeline",
    icon: Calculator,
    accent: "from-lime-400/25 to-emerald-600/15",
  },
];

const POPULAR_TOOLS: LauncherItem[] = [
  {
    href: "/sip-calculator",
    title: "SIP Calculator",
    body: "Monthly investing growth",
    icon: BarChart3,
    accent: "from-emerald-500/20 to-lime-400/10",
  },
  {
    href: "/swp-calculator",
    title: "SWP Calculator",
    body: "Safe withdrawal & drawdown",
    icon: LineChart,
    accent: "from-teal-500/20 to-cyan-400/10",
  },
  {
    href: "/expense-dashboard",
    title: "Expense Tracker",
    body: "Roommate & daily expenses",
    icon: ReceiptText,
    accent: "from-amber-500/15 to-emerald-500/10",
  },
  {
    href: "/emergency-fund",
    title: "Emergency Fund",
    body: "Safety fund progress",
    icon: ShieldCheck,
    accent: "from-sky-500/15 to-emerald-500/10",
  },
  {
    href: "/return-to-nepal",
    title: "Return Planner",
    body: "Nepal return target planning",
    icon: Plane,
    accent: "from-violet-500/15 to-teal-400/10",
  },
  {
    href: "/korea-pension-dashboard",
    title: "Korea Pension",
    body: "Payslip OCR, pension & severance",
    icon: Building2,
    accent: "from-indigo-500/15 to-emerald-500/10",
  },
];

function PrimaryLauncherCard({ item, light }: { item: LauncherItem; light: boolean }) {
  return (
    <Link
      href={item.href}
      data-testid={item.testId}
      className={`group relative flex min-h-[112px] touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border p-4 transition duration-200 active:scale-[0.98] sm:min-h-[120px] sm:p-5 ${
        light
          ? "border-emerald-200/80 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)] hover:border-emerald-400/50"
          : "border-emerald-400/15 bg-emerald-950/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:border-emerald-300/35"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent} opacity-90`} aria-hidden />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
            light ? "border-emerald-200/80 bg-emerald-50 text-emerald-700" : "border-white/10 bg-black/30 text-lime-200"
          }`}
        >
          <item.icon size={22} strokeWidth={2.1} />
        </span>
        <ChevronRight
          size={18}
          className={`shrink-0 opacity-60 transition group-active:translate-x-0.5 ${light ? "text-emerald-700" : "text-lime-300"}`}
          aria-hidden
        />
      </div>
      <div className="relative z-10 mt-3 min-w-0">
        <h2 className={`text-base font-black leading-tight sm:text-lg ${light ? "text-slate-900" : "text-white"}`}>{item.title}</h2>
        <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-snug sm:text-sm ${light ? "text-slate-600" : "text-emerald-100/70"}`}>
          {item.body}
        </p>
      </div>
    </Link>
  );
}

function ToolLauncherRow({ item, light }: { item: LauncherItem; light: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex min-h-[64px] touch-manipulation items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 transition duration-200 active:scale-[0.99] sm:min-h-[72px] sm:px-5 ${
        light
          ? "border-emerald-200/70 bg-white/90 hover:border-emerald-400/40 hover:bg-emerald-50/60"
          : "border-emerald-400/12 bg-white/[0.04] hover:border-emerald-400/25 hover:bg-emerald-500/10"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${item.accent} opacity-80`} aria-hidden />
      <span
        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-lime-300"
        }`}
      >
        <item.icon size={20} strokeWidth={2.1} />
      </span>
      <span className="relative z-10 min-w-0 flex-1 text-left">
        <span className={`block text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{item.title}</span>
        <span className={`mt-0.5 block truncate text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
          {item.body}
        </span>
      </span>
      <ChevronRight
        size={18}
        className={`relative z-10 shrink-0 opacity-50 ${light ? "text-emerald-700" : "text-emerald-200"}`}
        aria-hidden
      />
    </Link>
  );
}

export function HubHomePanel() {
  const onboarding = useMemo(() => loadProductOnboarding(), []);
  const { isAdmin } = useProductAuth();
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

      <section aria-labelledby="hub-primary-apps">
        <h2 id="hub-primary-apps" className={`text-xs font-black uppercase tracking-[0.18em] ${eyebrowCls}`}>
          Main apps
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PRIMARY_APPS.map((item) => (
            <PrimaryLauncherCard key={item.href} item={item} light={light} />
          ))}
        </div>
        <p className={`sr-only`}>{fireBiz.description}</p>
      </section>

      <section aria-labelledby="hub-popular-tools">
        <h2 id="hub-popular-tools" className={`text-xs font-black uppercase tracking-[0.18em] ${eyebrowCls}`}>
          Popular tools
        </h2>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {POPULAR_TOOLS.map((item) => (
            <ToolLauncherRow key={item.href} item={item} light={light} />
          ))}
        </div>
      </section>
    </div>
  );
}
