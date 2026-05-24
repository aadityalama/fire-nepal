"use client";

import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

export type DashboardSectionHeaderAccent = "emerald" | "teal" | "cyan";

const ACCENT_TITLE_DARK: Record<DashboardSectionHeaderAccent, string> = {
  emerald: "from-white via-lime-100 to-emerald-300",
  teal: "from-white via-emerald-100 to-teal-300",
  cyan: "from-white via-cyan-100 to-teal-300",
};

const ACCENT_TITLE_LIGHT: Record<DashboardSectionHeaderAccent, string> = {
  emerald: "from-emerald-950 via-emerald-800 to-emerald-600",
  teal: "from-teal-950 via-emerald-900 to-teal-700",
  cyan: "from-slate-900 via-cyan-900 to-teal-800",
};

const ACCENT_LINE: Record<DashboardSectionHeaderAccent, string> = {
  emerald: "from-emerald-500/80 via-lime-400/50 to-transparent",
  teal: "from-teal-500/75 via-emerald-400/45 to-transparent",
  cyan: "from-cyan-500/75 via-teal-400/45 to-transparent",
};

const ACCENT_GLOW: Record<DashboardSectionHeaderAccent, string> = {
  emerald: "from-emerald-400/14 via-lime-400/10 to-transparent",
  teal: "from-teal-400/12 via-emerald-400/8 to-transparent",
  cyan: "from-cyan-400/12 via-emerald-400/7 to-transparent",
};

type DashboardSectionHeaderProps = {
  title: string;
  subtitle: string;
  accent?: DashboardSectionHeaderAccent;
  /** Optional badge above title (e.g. module name) */
  eyebrow?: ReactNode;
};

/**
 * Premium section hero for FIRE Nepal dashboards — typography + glow only;
 * does not alter page grid or downstream panels. Adapts to FIRE theme (light/dark).
 */
export function DashboardSectionHeader({
  title,
  subtitle,
  accent = "emerald",
  eyebrow,
}: DashboardSectionHeaderProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const titleGrad = light ? ACCENT_TITLE_LIGHT[accent] : ACCENT_TITLE_DARK[accent];
  const glowGrad = ACCENT_GLOW[accent];
  const lineGrad = ACCENT_LINE[accent];

  const shell = light
    ? "border-emerald-200/70 bg-gradient-to-br from-white/98 via-slate-50/95 to-emerald-50/50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_40px_-24px_rgba(15,23,42,0.08)]"
    : "border-white/[0.08] bg-gradient-to-br from-emerald-950/35 via-[#041a14]/88 to-black/50 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]";

  const innerGlow = light
    ? "bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(16,185,129,0.12),transparent_55%)]"
    : "bg-[radial-gradient(ellipse_85%_55%_at_50%_-20%,rgba(52,211,153,0.08),transparent_55%)]";

  const eyebrowCls = light
    ? "text-emerald-800/90"
    : "text-emerald-200/65";

  const subtitleCls = light ? "text-slate-600" : "text-zinc-400";

  return (
    <header className="wealth-dash-section-header relative mb-0 sm:mb-0">
      <div
        className={`pointer-events-none absolute -inset-x-2 -inset-y-2 rounded-2xl bg-gradient-to-r opacity-50 blur-xl transition-opacity duration-500 sm:-inset-x-4 ${glowGrad}`}
        aria-hidden
      />
      <div
        className={`relative overflow-hidden rounded-2xl border px-5 py-6 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500 ease-out sm:rounded-[1.35rem] sm:px-7 sm:py-7 ${shell}`}
      >
        <div className={`pointer-events-none absolute inset-0 ${innerGlow}`} aria-hidden />
        <div className="relative">
          {eyebrow ? (
            <div
              className={`mb-2.5 text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px] ${eyebrowCls}`}
            >
              {eyebrow}
            </div>
          ) : null}
          <h1
            className={`max-w-4xl bg-gradient-to-r ${titleGrad} bg-clip-text text-[1.45rem] font-bold leading-[1.12] tracking-tight text-transparent sm:text-3xl md:text-[2.15rem] md:leading-[1.08]`}
          >
            {title}
          </h1>
          <p
            className={`mt-3 max-w-3xl text-sm font-medium leading-relaxed sm:mt-3.5 sm:text-base sm:leading-relaxed ${subtitleCls}`}
          >
            {subtitle}
          </p>
          <div
            className={`mt-4 h-px max-w-lg rounded-full bg-gradient-to-r ${lineGrad} opacity-80 sm:mt-5`}
            aria-hidden
          />
        </div>
      </div>
    </header>
  );
}
