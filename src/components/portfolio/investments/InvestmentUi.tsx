"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/expense-utils";

export function InvGlass({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-white/[0.08] via-emerald-950/35 to-black/55 shadow-[0_20px_50px_-28px_rgba(16,185,129,0.45)] backdrop-blur-xl",
        onClick &&
          "w-full text-left transition duration-300 hover:border-emerald-300/40 hover:shadow-[0_24px_60px_-24px_rgba(52,211,153,0.55)] active:scale-[0.99] motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(52,211,153,0.14),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
      <div className="relative">{children}</div>
    </Comp>
  );
}

export function InvSectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-black tracking-tight text-emerald-50 sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs font-semibold text-emerald-200/55">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function InvBackHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 -mx-1 mb-4 flex items-center gap-3 border-b border-emerald-400/10 bg-[#07111A]/92 px-1 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onBack}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-100 transition hover:bg-emerald-500/20 active:scale-95"
        aria-label="Go back"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black tracking-tight text-emerald-50 sm:text-lg">{title}</h1>
        {subtitle ? <p className="truncate text-[11px] font-semibold text-emerald-200/55">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function InvBadge({
  children,
  tone = "emerald",
}: {
  children: ReactNode;
  tone?: "emerald" | "lime" | "rose" | "amber" | "sky";
}) {
  const tones = {
    emerald: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    lime: "border-lime-400/30 bg-lime-500/15 text-lime-100",
    rose: "border-rose-400/30 bg-rose-500/15 text-rose-100",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    sky: "border-sky-400/30 bg-sky-500/15 text-sky-100",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function SymbolLogo({
  initials,
  hue,
  size = "md",
}: {
  initials: string;
  hue: number;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-10 w-10 text-xs" : size === "lg" ? "h-14 w-14 text-base" : "h-12 w-12 text-sm";
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl border border-white/15 font-black text-white shadow-inner",
        dim,
      )}
      style={{
        background: `linear-gradient(145deg, hsla(${hue}, 55%, 42%, 0.95), hsla(${(hue + 40) % 360}, 50%, 28%, 0.9))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function ToneValue({
  value,
  children,
  className,
}: {
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const tone =
    value == null || !Number.isFinite(value)
      ? "text-zinc-400"
      : value >= 0
        ? "text-lime-300"
        : "text-rose-300";
  return <span className={cn("tabular-nums font-black", tone, className)}>{children}</span>;
}

export function formatInvMoney(n: number): string {
  return formatMoney(Math.round(n), "NPR");
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <InvGlass className="px-5 py-12 text-center">
      <p className="text-base font-black text-emerald-50">{title}</p>
      {subtitle ? <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-emerald-200/55">{subtitle}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </InvGlass>
  );
}
