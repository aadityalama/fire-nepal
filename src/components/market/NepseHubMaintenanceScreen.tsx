"use client";

import { ArrowRight, Briefcase, Construction, LineChart } from "lucide-react";
import Link from "next/link";
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  NEPSE_HUB_MAINTENANCE_DETAIL,
  NEPSE_HUB_MAINTENANCE_MESSAGE,
} from "@/lib/market/nepse-hub-maintenance";

/**
 * Standalone Premium NEPSE Hub maintenance page.
 * Does not mount Hub polling, terminal, screener, or live market providers.
 * Holdings/portfolio stay on `/portfolio/*` and are not replaced by this screen.
 */
export function NepseHubMaintenanceScreen() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div
      data-testid="nepse-hub-maintenance"
      className={`flex min-h-screen w-full items-center justify-center px-4 py-16 ${
        light ? "bg-slate-100 text-slate-900" : "bg-[#030806] text-zinc-100"
      }`}
    >
      <div
        className={`w-full max-w-lg overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_28px_80px_-36px_rgba(0,0,0,0.55)] sm:p-8 ${
          light
            ? "border-emerald-200/80 bg-white/95"
            : "border-emerald-400/20 bg-emerald-950/40"
        }`}
      >
        <p
          className={`text-[10px] font-black uppercase tracking-[0.18em] ${
            light ? "text-emerald-700" : "text-emerald-300/80"
          }`}
        >
          Premium NEPSE Hub
        </p>
        <span
          className={`mt-4 grid h-14 w-14 place-items-center rounded-2xl border ${
            light
              ? "border-amber-300/70 bg-amber-50 text-amber-700"
              : "border-amber-400/30 bg-amber-400/10 text-amber-200"
          }`}
        >
          <Construction size={28} strokeWidth={2.1} aria-hidden />
        </span>
        <h1 className={`mt-5 text-2xl font-black tracking-tight sm:text-3xl ${light ? "text-slate-900" : "text-white"}`}>
          {NEPSE_HUB_MAINTENANCE_MESSAGE}
        </h1>
        <p className={`mt-3 text-sm font-semibold leading-relaxed ${light ? "text-slate-600" : "text-emerald-100/70"}`}>
          {NEPSE_HUB_MAINTENANCE_DETAIL}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/portfolio/investments"
            data-testid="nepse-hub-maintenance-holdings"
            className="inline-flex min-h-[48px] items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-900/20"
          >
            <span className="inline-flex items-center gap-2">
              <LineChart size={18} aria-hidden />
              My NEPSE Holdings
            </span>
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/portfolio"
            data-testid="nepse-hub-maintenance-portfolio"
            className={`inline-flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-black ${
              light
                ? "border-emerald-200 bg-white text-emerald-900"
                : "border-emerald-400/25 bg-black/30 text-lime-100"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Briefcase size={18} aria-hidden />
              Portfolio
            </span>
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/hub"
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] ${
              light ? "text-emerald-700" : "text-emerald-200/80"
            }`}
          >
            Back to app hub
          </Link>
        </div>
      </div>
    </div>
  );
}
