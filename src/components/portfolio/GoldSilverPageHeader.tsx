"use client";

import { Wallet } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { formatMoney } from "@/lib/expense-utils";

const ACCENT_LINE = "from-emerald-500/80 via-lime-400/50 to-transparent";
const ACCENT_GLOW = "from-emerald-400/14 via-lime-400/10 to-transparent";

/**
 * Compact Gold & Silver route hero: page title + portfolio net worth on one row (desktop),
 * stacked on small screens. Net worth uses the same totals as the portfolio strip elsewhere.
 */
export function GoldSilverPageHeader() {
  const { totals, hydrated } = useWealthPortfolio();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const shell = light
    ? "border-emerald-200/70 bg-gradient-to-br from-white/98 via-slate-50/95 to-emerald-50/50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_40px_-24px_rgba(15,23,42,0.08)]"
    : "border-white/[0.08] bg-gradient-to-br from-emerald-950/35 via-[#041a14]/88 to-black/50 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]";

  const innerGlow = light
    ? "bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(16,185,129,0.12),transparent_55%)]"
    : "bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(52,211,153,0.08),transparent_55%)]";

  const titleCls = light
    ? "text-lg font-extrabold leading-tight tracking-tight text-black sm:text-2xl sm:leading-[1.1]"
    : "text-lg font-extrabold leading-tight tracking-tight text-white sm:text-2xl sm:leading-[1.1]";

  const subtitleCls = light ? "text-slate-800 font-semibold" : "text-gray-100 font-semibold";

  const cardBase = light
    ? "border-emerald-200/70 bg-white/90 text-black shadow-sm"
    : "border-white/[0.08] bg-white/[0.04] text-white shadow-sm";

  const muted = light ? "text-slate-800" : "text-gray-100";

  return (
    <header className="wealth-dash-section-header relative mb-0">
      <div
        className={`pointer-events-none absolute -inset-x-1 -inset-y-1 rounded-2xl bg-gradient-to-r opacity-45 blur-lg transition-opacity duration-500 sm:-inset-x-2 ${ACCENT_GLOW}`}
        aria-hidden
      />
      <div
        className={`relative overflow-hidden rounded-2xl border px-4 py-2.5 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500 ease-out sm:rounded-[1.25rem] sm:px-5 sm:py-3 ${shell}`}
      >
        <div className={`pointer-events-none absolute inset-0 ${innerGlow}`} aria-hidden />
        <div className="relative flex flex-col gap-3 sm:gap-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0 lg:flex-1">
            <h1 className={titleCls}>Gold & Silver</h1>
            <p className={`mt-1 max-w-3xl text-xs leading-snug sm:text-sm sm:leading-relaxed ${subtitleCls}`}>
              Bullion and jewelry holdings with NPR marks.
            </p>
          </div>
          <div className="w-full shrink-0 lg:w-auto lg:max-w-[min(100%,14rem)]">
            <div className={`relative overflow-hidden rounded-xl border px-3 py-2 backdrop-blur-xl sm:px-3.5 sm:py-2 ${cardBase}`}>
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] ${light ? "text-black" : muted}`}>
                <Wallet size={14} className={light ? "text-emerald-600" : "text-lime-300"} aria-hidden />
                Net worth
              </div>
              <p
                className={`mt-0.5 truncate text-base font-black tracking-tight sm:text-lg ${light ? "text-black" : "text-white"}`}
              >
                {!hydrated ? "—" : formatMoney(totals.netWorthNpr, "NPR")}
              </p>
            </div>
          </div>
        </div>
        <div className={`mt-2.5 h-px w-full rounded-full bg-gradient-to-r ${ACCENT_LINE} opacity-80 sm:mt-3`} aria-hidden />
      </div>
    </header>
  );
}
