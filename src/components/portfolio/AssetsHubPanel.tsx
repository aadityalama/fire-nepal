"use client";

import { Building2, Car, Coins, Landmark, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatMoney } from "@/lib/expense-utils";

type HubCardDef = {
  href: string;
  title: string;
  description: string;
  icon: typeof Landmark;
  /** NPR total from existing `totals` fields only — no new portfolio math. */
  valueNpr: number;
};

export function AssetsHubPanel() {
  const { totals, hydrated } = useWealthPortfolio();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const cards: HubCardDef[] = useMemo(
    () => [
      {
        href: "/portfolio/banking",
        title: "Banking & Cash",
        description: "Liquid lines, fixed deposits, and multi-currency cash — NPR, KRW, and USD.",
        icon: Landmark,
        valueNpr: totals.liquidNpr + totals.fixedDepositsPrincipalNpr,
      },
      {
        href: "/portfolio/gold",
        title: "Gold",
        description: "Gold & silver bullion and jewelry with gram-based marks.",
        icon: Coins,
        valueNpr: totals.metalsNpr,
      },
      {
        href: "/portfolio/vehicles",
        title: "Vehicle",
        description: "Cars, bikes, and titled assets with resale estimates.",
        icon: Car,
        valueNpr: totals.vehiclesNpr,
      },
      {
        href: "/portfolio/real-estate",
        title: "Real Estate",
        description: "Primary home, rentals, land, and commercial — modeled in NPR.",
        icon: Building2,
        valueNpr: totals.realEstateNpr,
      },
    ],
    [totals.fixedDepositsPrincipalNpr, totals.liquidNpr, totals.metalsNpr, totals.realEstateNpr, totals.vehiclesNpr],
  );

  const gridCls =
    "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-5 xl:gap-6";

  return (
    <section aria-label="Asset categories" className={gridCls}>
      {cards.map((c) => {
        const Icon = c.icon;
        const shell = light
          ? "border-emerald-200/70 bg-gradient-to-br from-white via-white to-emerald-50/50 text-slate-900 shadow-[0_20px_60px_-28px_rgba(16,185,129,0.18)]"
          : "border-white/[0.09] bg-gradient-to-br from-white/[0.08] via-zinc-950/45 to-black/[0.62] text-white shadow-[0_28px_72px_-32px_rgba(0,0,0,0.65),0_0_88px_-28px_rgba(16,185,129,0.12)]";

        return (
          <Link
            key={c.href}
            href={c.href}
            className={`group relative flex min-h-[220px] flex-col overflow-hidden rounded-3xl border p-5 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-1 ${
              light
                ? "motion-safe:hover:border-emerald-400/50 motion-safe:hover:shadow-[0_24px_64px_-24px_rgba(16,185,129,0.22)]"
                : "motion-safe:hover:border-emerald-400/35 motion-safe:hover:shadow-[0_32px_80px_-28px_rgba(0,0,0,0.75),0_0_100px_-22px_rgba(52,211,153,0.22)]"
            } ${shell} backdrop-blur-2xl backdrop-saturate-[1.12]`}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl transition duration-700 ${
                light ? "bg-emerald-400/15 group-hover:bg-emerald-400/22" : "bg-emerald-500/10 group-hover:bg-emerald-400/14"
              }`}
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 h-px opacity-70 ${
                light ? "bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" : "bg-gradient-to-r from-transparent via-white/20 to-transparent"
              }`}
            />

            <div className="relative flex flex-1 flex-col">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-900/25 ${
                  light ? "shadow-emerald-500/20" : ""
                }`}
              >
                <Icon size={22} strokeWidth={2.25} aria-hidden />
              </div>

              <h2 className={`mt-4 text-lg font-black tracking-tight ${light ? "text-black" : "text-white"}`}>{c.title}</h2>
              <p className={`mt-1.5 text-sm font-semibold leading-snug ${light ? "text-slate-700" : "text-emerald-100/75"}`}>
                {c.description}
              </p>

              <div className="mt-auto pt-5">
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-slate-600" : "text-emerald-200/55"}`}>
                  Total in category
                </p>
                <p className={`mt-1 truncate text-xl font-black tracking-tight ${light ? "text-black" : "text-white"}`}>
                  {!hydrated ? "—" : formatMoney(c.valueNpr, "NPR")}
                </p>
                <span
                  className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-xs font-black uppercase tracking-wide transition active:scale-[0.99] ${
                    light
                      ? "border-emerald-300/60 bg-emerald-50/90 text-emerald-950 group-hover:border-emerald-400 group-hover:bg-emerald-100"
                      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-50 group-hover:border-emerald-400/45 group-hover:bg-emerald-500/[0.16]"
                  }`}
                >
                  Open
                  <ArrowUpRight size={16} strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
