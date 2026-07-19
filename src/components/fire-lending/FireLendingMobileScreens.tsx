"use client";

import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

export function LendingMobileScreen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-3.5 sm:gap-4">{children}</div>;
}

export function LendingCompactHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <header
      className={`relative overflow-hidden rounded-[1.35rem] border px-4 py-3.5 backdrop-blur-xl sm:rounded-[1.5rem] sm:px-5 sm:py-4 ${
        light
          ? "border-emerald-200/70 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
          : "border-emerald-400/12 bg-emerald-950/35 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${
          light ? "bg-amber-400/25" : "bg-amber-500/15"
        }`}
        aria-hidden
      />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{eyebrow}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              light ? "border-amber-300/70 bg-amber-50 text-amber-800" : "border-amber-400/35 bg-amber-500/15 text-amber-200"
            }`}
          >
            Elite · New
          </span>
        </div>
        <h1 className={`mt-1 text-lg font-black leading-tight sm:text-xl ${light ? "text-slate-900" : "text-emerald-50"}`}>{title}</h1>
        {subtitle ? (
          <p className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-snug sm:text-xs ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
