"use client";

import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";

export function pensionGlassClass(light: boolean, extra = "") {
  return [
    "relative overflow-hidden rounded-[1.35rem] border backdrop-blur-xl",
    "motion-safe:transition-[transform,box-shadow,border-color,background-color]",
    "motion-safe:duration-300 motion-safe:ease-out",
    light
      ? "border-emerald-200/70 bg-gradient-to-br from-white/95 via-emerald-50/80 to-teal-50/60 shadow-[0_16px_48px_-28px_rgba(15,23,42,0.12)] ring-1 ring-emerald-950/[0.03]"
      : "border-emerald-400/18 bg-gradient-to-br from-[#0f2a24]/92 via-[#0a1c18]/88 to-[#071412]/86 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_22px_52px_-28px_rgba(0,0,0,0.55),0_0_48px_-24px_rgba(52,211,153,0.18)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function PensionGlassPanel({
  children,
  className = "",
  hover = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <div
      {...rest}
      className={pensionGlassClass(
        light,
        [
          hover
            ? light
              ? "motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-teal-300/80 motion-safe:hover:shadow-[0_20px_56px_-28px_rgba(20,184,166,0.18)]"
              : "motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-teal-300/35 motion-safe:hover:shadow-[0_1px_0_rgba(255,255,255,0.07)_inset,0_26px_56px_-30px_rgba(0,0,0,0.65),0_0_40px_-12px_rgba(45,212,191,0.22)]"
            : "",
          className,
        ]
          .filter(Boolean)
          .join(" "),
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-400/[0.08]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-emerald-500/[0.08] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent dark:via-white/20"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function PensionSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300/90">
      {children}
    </p>
  );
}

export function PensionHeading({ children, as: Tag = "h2" }: { children: ReactNode; as?: "h2" | "h3" }) {
  return <Tag className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">{children}</Tag>;
}

export function PensionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400 ${className}`}>{children}</p>
  );
}

export function PensionMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "teal",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "teal" | "emerald" | "lime" | "cyan";
}) {
  const accentMap = {
    teal: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    lime: "border-lime-500/25 bg-lime-500/10 text-lime-800 dark:text-lime-200",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  } as const;

  return (
    <PensionGlassPanel hover className="flex min-h-[132px] flex-col justify-between p-4 sm:min-h-[140px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PensionSectionLabel>{label}</PensionSectionLabel>
          <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {value}
          </p>
        </div>
        {Icon ? (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${accentMap[accent]}`}>
            <Icon size={18} strokeWidth={2.2} />
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-zinc-500">{hint}</p> : null}
    </PensionGlassPanel>
  );
}

export function PensionProviderCard({
  title,
  body,
  href,
  cta,
  icon: Icon,
  accent = "teal",
  badge,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  accent?: "teal" | "emerald" | "lime" | "cyan";
  badge?: string;
}) {
  const iconShell = {
    teal: "border-teal-500/30 bg-gradient-to-br from-teal-400/20 to-emerald-500/10 text-teal-700 dark:text-teal-200",
    emerald:
      "border-emerald-500/30 bg-gradient-to-br from-emerald-400/20 to-teal-500/10 text-emerald-700 dark:text-emerald-200",
    lime: "border-lime-500/30 bg-gradient-to-br from-lime-400/20 to-emerald-500/10 text-lime-800 dark:text-lime-200",
    cyan: "border-cyan-500/30 bg-gradient-to-br from-cyan-400/20 to-teal-500/10 text-cyan-800 dark:text-cyan-200",
  } as const;

  return (
    <Link
      href={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <PensionGlassPanel hover className="flex h-full min-h-[188px] flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${iconShell[accent]}`}>
            <Icon size={20} strokeWidth={2.1} />
          </span>
          {badge ? (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-200">
              {badge}
            </span>
          ) : (
            <ArrowUpRight
              size={16}
              className="text-slate-400 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-500 group-hover:opacity-100 dark:text-zinc-500 dark:group-hover:text-teal-300"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{body}</p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-black text-teal-700 transition group-hover:underline dark:text-teal-300">
          {cta}
        </span>
      </PensionGlassPanel>
    </Link>
  );
}

export function PensionSoftRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <div
      className={`rounded-2xl border px-3.5 py-3.5 motion-safe:transition-colors motion-safe:duration-200 ${
        light
          ? "border-slate-200/80 bg-white/75 hover:border-teal-200/90 hover:bg-teal-50/40"
          : "border-white/10 bg-white/[0.035] hover:border-teal-400/25 hover:bg-white/[0.055]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PensionActionLink({
  href,
  children,
  variant = "primary",
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  external?: boolean;
}) {
  const className = [
    "inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-black",
    "motion-safe:transition-[transform,background-color,border-color,box-shadow,color] motion-safe:duration-200",
    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/45",
    variant === "primary"
      ? "border border-teal-400/40 bg-gradient-to-r from-teal-500/25 via-emerald-500/20 to-lime-400/15 text-teal-950 shadow-[0_12px_32px_-18px_rgba(45,212,191,0.45)] hover:from-teal-500/35 hover:via-emerald-500/28 hover:to-lime-400/22 dark:text-teal-50"
      : variant === "secondary"
        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-950 hover:bg-emerald-500/18 dark:text-emerald-50"
        : "border border-white/10 bg-white/[0.04] text-slate-700 hover:border-teal-400/30 hover:bg-white/[0.07] dark:text-zinc-200",
  ].join(" ");

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <ExternalLink size={13} aria-hidden />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function PensionStatusPill({
  tone,
  children,
}: {
  tone: "active" | "pending" | "neutral";
  children: ReactNode;
}) {
  const styles =
    tone === "active"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : tone === "pending"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
        : "border-white/10 bg-white/[0.04] text-zinc-500";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles}`}>
      {children}
    </span>
  );
}
