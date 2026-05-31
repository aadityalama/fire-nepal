"use client";

import type { ReactNode } from "react";

export function familyGlassClass(light: boolean, active = false): string {
  const base = [
    "relative overflow-hidden rounded-2xl border backdrop-blur-xl",
    "shadow-[0_0_0_1px_rgba(52,211,153,0.05)_inset,0_18px_48px_-28px_rgba(0,0,0,0.55)]",
    "transition duration-300 ease-out hover:-translate-y-0.5",
  ];
  if (light) {
    return [
      ...base,
      "border-emerald-200/70 bg-white/90",
      active ? "ring-2 ring-emerald-400/40" : "hover:border-emerald-300/80 hover:shadow-emerald-200/30",
    ].join(" ");
  }
  return [
    ...base,
    "border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.07] via-[#04140f]/85 to-black/55",
    active ? "ring-1 ring-emerald-400/35" : "hover:border-emerald-300/30 hover:shadow-[0_20px_50px_-20px_rgba(16,185,129,0.12)]",
  ].join(" ");
}

export function familyMutedText(light: boolean): string {
  return light ? "text-slate-600" : "text-zinc-400";
}

export function familyHeadingClass(light: boolean): string {
  return light ? "text-slate-900" : "text-white";
}

type FamilyGlassCardProps = {
  light: boolean;
  children: ReactNode;
  className?: string;
  active?: boolean;
  padding?: "sm" | "md" | "lg";
};

export function FamilyGlassCard({ light, children, className = "", active, padding = "md" }: FamilyGlassCardProps) {
  const p = padding === "sm" ? "p-4" : padding === "lg" ? "p-6 sm:p-7" : "p-5 sm:p-6";
  return (
    <div className={`${familyGlassClass(light, active)} ${p} ${className}`}>
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl ${
          light ? "bg-emerald-200/40" : "bg-emerald-500/20"
        }`}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

type FamilySectionTitleProps = {
  light: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function FamilySectionTitle({ light, eyebrow, title, subtitle, action }: FamilySectionTitleProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.2em] ${light ? "text-emerald-700/80" : "text-emerald-400/70"}`}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={`text-lg font-black tracking-tight sm:text-xl ${familyHeadingClass(light)}`}>{title}</h2>
        {subtitle ? <p className={`mt-1 max-w-2xl text-sm ${familyMutedText(light)}`}>{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function neonDivider(light: boolean): string {
  return light ? "border-emerald-200/60" : "border-emerald-500/10";
}
