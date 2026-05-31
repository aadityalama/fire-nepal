"use client";

import { ArrowLeft, ChevronRight, Flame, Home, PiggyBank, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPensionOverviewPath, PENSION_BASE, PENSION_TAB_LINKS } from "@/lib/pension/nav";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { formatMoney } from "@/lib/expense-utils";

const WEALTH_STRIP = [
  { href: "/portfolio", label: "Net worth", icon: Home },
  { href: "/savings-tracker", label: "Savings", icon: PiggyBank },
  { href: "/portfolio/investments", label: "Investments", icon: TrendingUp },
  { href: "/fire-summary", label: "FIRE goals", icon: Flame },
  { href: "/family", label: "Family Hub", icon: Users },
] as const;

export function PensionChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { totals, hydrated, fireScore } = useWealthPortfolio();

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/portfolio"
          className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur-md transition duration-300 active:scale-[0.98] sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/90"
              : "border-emerald-400/18 bg-white/[0.06] text-emerald-50/95 hover:border-teal-300/35 hover:bg-white/10"
          }`}
        >
          <ArrowLeft size={15} /> Wealth dashboard
        </Link>
        <div
          className={`flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px] ${
            light ? "text-emerald-800/75" : "text-emerald-200/65"
          }`}
        >
          <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-1 text-teal-800 dark:text-teal-200/90">
            Pension OS
          </span>
          <span className="hidden sm:inline">Retirement center · Nepal & diaspora</span>
        </div>
      </div>

      <section
        className={`wealth-glass relative overflow-hidden p-4 sm:p-5 ${
          light ? "ring-1 ring-emerald-950/[0.04] shadow-[0_16px_48px_-24px_rgba(15,23,42,0.1)]" : ""
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-gradient-to-br from-teal-400/20 via-emerald-400/12 to-transparent blur-3xl"
        />
        <div className="relative flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {WEALTH_STRIP.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 sm:text-xs ${
                    light
                      ? "border-slate-200/90 bg-white/90 text-slate-800 hover:border-teal-300/80 hover:bg-teal-50/80"
                      : "border-white/10 bg-white/[0.05] text-zinc-100 hover:border-teal-400/35 hover:bg-white/[0.08]"
                  }`}
                >
                  <Icon size={14} className="opacity-80" />
                  {item.label}
                  <ChevronRight size={12} className="opacity-60" />
                </Link>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-emerald-200/80 bg-emerald-50/60 text-emerald-950" : "border-emerald-400/15 bg-white/[0.04] text-emerald-50"
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Portfolio net worth</span>
              <span className="text-base font-black">{!hydrated ? "—" : formatMoney(totals.netWorthNpr, "NPR")}</span>
            </div>
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-slate-200/80 bg-white/80 text-slate-900" : "border-white/10 bg-white/[0.04] text-white"
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Retirement sleeve</span>
              <span className="text-base font-black">{!hydrated ? "—" : formatMoney(totals.retirementNpr, "NPR")}</span>
            </div>
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-teal-200/80 bg-teal-50/70 text-teal-950" : "border-teal-400/20 bg-teal-500/10 text-teal-50"
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">FIRE readiness (desk)</span>
              <span className="text-base font-black">{!hydrated ? "—" : `${Math.round(fireScore)}%`}</span>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Pension sections"
        className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-0.5 no-scrollbar sm:gap-2.5 sm:pb-2"
      >
        {PENSION_TAB_LINKS.map((item) => {
          const active =
            item.href === PENSION_BASE
              ? isPensionOverviewPath(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 sm:px-3.5 sm:text-xs ${
                active
                  ? light
                    ? "border-teal-500/50 bg-teal-600 text-white shadow-sm"
                    : "border-teal-400/40 bg-teal-500/25 text-white shadow-[0_0_24px_-8px_rgba(45,212,191,0.35)]"
                  : light
                    ? "border-slate-200/80 bg-white/80 text-slate-700 hover:border-teal-200"
                    : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-teal-400/25 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
