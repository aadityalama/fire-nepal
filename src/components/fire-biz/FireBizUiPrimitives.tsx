"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireBizGlassCardProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
};

export function FireBizGlassCard({ title, subtitle, icon: Icon, children, className, headerRight }: FireBizGlassCardProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <section
      className={`rounded-[1.35rem] border p-3.5 backdrop-blur-xl sm:rounded-[1.5rem] sm:p-4 ${
        light
          ? "border-emerald-200/70 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
          : "border-emerald-400/12 bg-emerald-950/35 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      } ${className ?? ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
              light ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80" : "bg-emerald-500/15 text-emerald-200 ring-white/10"
            }`}
          >
            <Icon size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-sm font-black sm:text-base ${light ? "text-slate-900" : "text-emerald-50"}`}>{title}</h2>
            {subtitle ? (
              <p className={`mt-0.5 text-[11px] font-bold leading-relaxed sm:text-xs ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "emerald" | "teal" | "amber" | "rose";
  size?: "default" | "compact" | "kpi";
};

const ACCENT: Record<NonNullable<SummaryCardProps["accent"]>, { light: string; dark: string }> = {
  emerald: { light: "from-emerald-500/15 to-lime-400/10 border-emerald-300/50", dark: "from-emerald-500/20 to-lime-400/10 border-emerald-400/25" },
  teal: { light: "from-teal-500/15 to-cyan-400/10 border-teal-300/50", dark: "from-teal-500/20 to-cyan-400/10 border-teal-400/25" },
  amber: { light: "from-amber-500/15 to-orange-400/10 border-amber-300/50", dark: "from-amber-500/20 to-orange-400/10 border-amber-400/25" },
  rose: { light: "from-rose-500/15 to-pink-400/10 border-rose-300/50", dark: "from-rose-500/20 to-pink-400/10 border-rose-400/25" },
};

export function FireBizSummaryCard({ label, value, icon: Icon, accent = "emerald", size = "default" }: SummaryCardProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const colors = ACCENT[accent];
  const kpi = size === "kpi";
  const compact = size === "compact";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition duration-300 hover:scale-[1.01] animate-fade-up ${
        light ? colors.light : colors.dark
      } ${light ? "bg-white/80" : "bg-black/20"} ${
        kpi ? "p-5 sm:p-6 min-h-[108px]" : compact ? "p-3.5" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`font-black uppercase tracking-[0.14em] ${light ? "text-slate-600" : "text-emerald-200/70"} ${
              kpi ? "text-[11px]" : "text-[10px]"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-1.5 truncate font-black tabular-nums ${light ? "text-slate-900" : "text-white"} ${
              kpi ? "text-2xl sm:text-3xl" : compact ? "text-base" : "text-lg sm:text-xl"
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`grid shrink-0 place-items-center rounded-xl ${
            light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-200"
          } ${kpi ? "h-11 w-11" : "h-9 w-9"}`}
        >
          <Icon size={kpi ? 22 : 18} />
        </div>
      </div>
    </div>
  );
}

type FireBizKpiGridCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "emerald" | "teal" | "amber" | "rose";
  href?: string;
};

export function FireBizKpiGridCard({ label, value, icon: Icon, accent = "emerald", href }: FireBizKpiGridCardProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const colors = ACCENT[accent];

  const card = (
    <div
      className={`relative flex h-[104px] touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3 backdrop-blur-xl transition duration-200 sm:h-[108px] sm:p-3.5 ${
        light ? colors.light : colors.dark
      } ${light ? "bg-white/85 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.1)]" : "bg-black/25 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"} ${
        href ? "active:scale-[0.98] hover:scale-[1.01]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`min-w-0 flex-1 text-[9px] font-black uppercase leading-tight tracking-[0.1em] sm:text-[10px] ${
            light ? "text-slate-600" : "text-emerald-200/70"
          }`}
        >
          {label}
        </p>
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 sm:h-9 sm:w-9 sm:rounded-xl ${
            light ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80" : "bg-emerald-500/15 text-emerald-200 ring-white/10"
          }`}
          aria-hidden
        >
          <Icon size={17} strokeWidth={2.25} />
        </div>
      </div>
      <p
        className={`truncate font-black tabular-nums leading-none ${light ? "text-slate-900" : "text-white"} text-lg sm:text-xl`}
        aria-hidden={href ? true : undefined}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400" aria-label={`${label}: ${value}`}>
        {card}
      </Link>
    );
  }

  return card;
}

type QuickActionProps = {
  label: string;
  href: string;
  icon: LucideIcon;
  compact?: boolean;
};

export function FireBizQuickAction({ label, href, icon: Icon, compact = false }: QuickActionProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition duration-300 active:scale-[0.98] animate-fade-up ${
        compact ? "min-h-[76px]" : "min-h-[88px] gap-2 py-3.5"
      } ${
        light
          ? "border-emerald-200/70 bg-white/90 text-slate-800 hover:border-emerald-400/50 hover:bg-emerald-50/80 shadow-sm"
          : "border-emerald-400/15 bg-white/[0.04] text-emerald-100 hover:border-emerald-400/30 hover:bg-emerald-500/10"
      }`}
    >
      <Icon size={22} className={light ? "text-emerald-600" : "text-emerald-300"} strokeWidth={2.1} />
      <span className="text-[10px] font-black leading-tight sm:text-[11px]">{label}</span>
    </Link>
  );
}

type HubTileProps = {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
};

export function FireBizHubTile({ label, description, href, icon: Icon }: HubTileProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <Link
      href={href}
      className={`flex min-h-[88px] items-center gap-3 rounded-2xl border px-4 py-3 transition duration-300 active:scale-[0.98] ${
        light
          ? "border-emerald-200/70 bg-white/90 hover:border-emerald-400/40 hover:bg-emerald-50/70"
          : "border-emerald-400/15 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-emerald-500/10"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
          light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-lime-300"
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 text-left">
        <span className={`block text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{label}</span>
        {description ? (
          <span className={`mt-0.5 block text-[11px] font-semibold leading-snug ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function FireBizEmptyState({ message }: { message: string }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <p className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm font-semibold ${
      light ? "border-emerald-200/80 text-slate-600" : "border-emerald-400/20 text-emerald-200/60"
    }`}>
      {message}
    </p>
  );
}

export function FireBizPageActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function FireBizPrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-black transition active:scale-[0.98] disabled:opacity-50 ${
        light
          ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20"
          : "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
      }`}
    >
      {children}
    </button>
  );
}

export function FireBizSecondaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
        light
          ? "border-emerald-300/70 bg-white text-emerald-800 hover:bg-emerald-50"
          : "border-emerald-400/25 bg-white/[0.04] text-emerald-100 hover:bg-emerald-500/10"
      }`}
    >
      {children}
    </button>
  );
}

export function FireBizInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-2 ${
          light
            ? "border-emerald-200/80 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-400/25"
            : "border-emerald-400/20 bg-black/30 text-white focus:border-emerald-400/50 focus:ring-emerald-400/20"
        }`}
      />
    </label>
  );
}

export function FireBizSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${
          light ? "border-emerald-200/80 bg-white text-slate-900" : "border-emerald-400/20 bg-black/30 text-white"
        }`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FireBizPrimaryLinkButton({ href, children }: { href: string; children: ReactNode }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <Link
      href={href}
      className={`relative z-10 inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-center rounded-xl px-4 py-2.5 text-sm font-black transition active:scale-[0.98] ${
        light
          ? "bg-gradient-to-r from-emerald-500 to-lime-400 text-emerald-950 shadow-lg shadow-emerald-500/20"
          : "bg-gradient-to-r from-emerald-500/90 to-lime-400/90 text-emerald-950 shadow-lg shadow-emerald-500/20"
      }`}
    >
      {children}
    </Link>
  );
}
