"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Building2, Landmark, LineChart, Scale, Shield } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { PENSION_BASE } from "@/lib/pension/nav";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { formatMoney } from "@/lib/expense-utils";

function hubCard(
  light: boolean,
  opts: { title: string; body: string; href: string; cta: string; Icon: LucideIcon },
) {
  const Icon = opts.Icon;
  return (
    <Link
      href={opts.href}
      className={`wealth-glass group flex flex-col gap-3 p-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 sm:p-5 ${
        light ? "ring-1 ring-slate-900/[0.04] shadow-sm" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{opts.title}</h2>
      </div>
      <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{opts.body}</p>
      <span className="mt-auto text-xs font-black text-teal-700 group-hover:underline dark:text-teal-300">{opts.cta}</span>
    </Link>
  );
}

export function PensionOverviewPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { totals, fireScore, hydrated } = useWealthPortfolio();

  return (
    <PensionChrome
      title="Pension Overview"
      subtitle="Nepal Official Policy-Driven Pension & Retirement Planning Center — SSF, EPF, CIT, and Government Pension with verified portals only."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hubCard(light, {
          title: "SSF Center",
          body: "Social Security Fund schemes, contributions, and official SOSYS login / pay links.",
          href: `${PENSION_BASE}/ssf`,
          cta: "Open SSF desk →",
          Icon: Shield,
        })}
        {hubCard(light, {
          title: "EPF Center",
          body: "Provident fund, contributory pension rates, loans, and EPF iPortal.",
          href: `${PENSION_BASE}/epf`,
          cta: "Open EPF desk →",
          Icon: Building2,
        })}
        {hubCard(light, {
          title: "CIT Center",
          body: "Citizen Investment Trust / NLK schemes via official e-Service.",
          href: `${PENSION_BASE}/cit`,
          cta: "Open CIT desk →",
          Icon: Landmark,
        })}
        {hubCard(light, {
          title: "Government Pension",
          body: "Contributory pension for eligible government services (Pension Fund Act 2075).",
          href: `${PENSION_BASE}/government`,
          cta: "Open government desk →",
          Icon: Scale,
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
          <div className="mb-2 flex items-center gap-2">
            <LineChart size={18} className="text-teal-600 dark:text-teal-300" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Retirement projection</h2>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
            Policy-driven contribution stacking using verified rates when available. Unverified formulas are never invented.
          </p>
          <Link
            href={`${PENSION_BASE}/retirement-projection`}
            className="mt-4 inline-flex rounded-full border border-teal-500/35 bg-teal-500/10 px-4 py-2 text-xs font-black text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
          >
            Open retirement projection →
          </Link>
        </section>

        <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Portfolio link</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-zinc-400">
            Desk FIRE readiness {hydrated ? `${Math.round(fireScore)}%` : "—"} · Retirement sleeve{" "}
            {!hydrated ? "—" : formatMoney(totals.retirementNpr, "NPR")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/portfolio/retirement"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:border-teal-400/30"
            >
              Global retirement assets →
            </Link>
            <Link
              href={`${PENSION_BASE}/withdrawal-planner`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:border-teal-400/30"
            >
              Withdrawal planner →
            </Link>
          </div>
        </section>
      </div>

      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Integrity rule</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
          FireNepal does not fabricate pension amounts, contribution rates, or withdrawal limits. When an official rule is
          not verified, modules show: “Official policy information unavailable for verification.” Authentication and
          payments always open the respective official portals.
        </p>
      </section>
    </PensionChrome>
  );
}
