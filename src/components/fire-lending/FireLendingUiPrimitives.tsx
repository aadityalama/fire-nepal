"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatPct } from "@/lib/fire-lending/format";

type GlassCardProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  elite?: boolean;
};

export function LendingGlassCard({ title, subtitle, icon: Icon, children, className, headerRight, elite }: GlassCardProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <section
      className={`rounded-[1.35rem] border p-3.5 backdrop-blur-xl sm:rounded-[1.5rem] sm:p-4 ${
        elite
          ? light
            ? "border-amber-300/50 bg-gradient-to-br from-white via-amber-50/40 to-emerald-50/30 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
            : "border-amber-400/25 bg-gradient-to-br from-emerald-950/50 via-amber-950/20 to-emerald-950/40 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
          : light
            ? "border-emerald-200/70 bg-white/90 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)]"
            : "border-emerald-400/12 bg-emerald-950/35 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      } ${className ?? ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
              elite
                ? light
                  ? "bg-amber-50 text-amber-700 ring-amber-200/80"
                  : "bg-amber-500/15 text-amber-200 ring-amber-400/20"
                : light
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80"
                  : "bg-emerald-500/15 text-emerald-200 ring-white/10"
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

const ACCENT = {
  emerald: { light: "from-emerald-500/15 to-lime-400/10 border-emerald-300/50", dark: "from-emerald-500/20 to-lime-400/10 border-emerald-400/25" },
  teal: { light: "from-teal-500/15 to-cyan-400/10 border-teal-300/50", dark: "from-teal-500/20 to-cyan-400/10 border-teal-400/25" },
  amber: { light: "from-amber-500/15 to-orange-400/10 border-amber-300/50", dark: "from-amber-500/20 to-orange-400/10 border-amber-400/25" },
  rose: { light: "from-rose-500/15 to-pink-400/10 border-rose-300/50", dark: "from-rose-500/20 to-pink-400/10 border-rose-400/25" },
  gold: { light: "from-amber-400/20 to-yellow-300/15 border-amber-300/60", dark: "from-amber-500/25 to-yellow-400/15 border-amber-400/30" },
} as const;

export function LendingKpiCard({
  label,
  value,
  icon: Icon,
  changePct,
  sparkline,
  accent = "emerald",
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  changePct: number;
  sparkline: number[];
  accent?: keyof typeof ACCENT;
  href?: string;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const colors = ACCENT[accent];
  const max = Math.max(...sparkline, 1);

  const card = (
    <div
      className={`group relative flex h-[118px] touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3 backdrop-blur-xl transition duration-200 hover:scale-[1.02] sm:h-[124px] sm:p-3.5 ${
        light ? colors.light : colors.dark
      } ${light ? "bg-white/85 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.1)]" : "bg-black/25 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 text-[9px] font-black uppercase leading-tight tracking-[0.1em] sm:text-[10px] ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
          {label}
        </p>
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 sm:h-9 sm:w-9 sm:rounded-xl ${
            light ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80" : "bg-emerald-500/15 text-emerald-200 ring-white/10"
          }`}
        >
          <Icon size={17} strokeWidth={2.25} />
        </div>
      </div>
      <div>
        <p className={`truncate font-black tabular-nums leading-none ${light ? "text-slate-900" : "text-white"} text-lg sm:text-xl`}>{value}</p>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <span
            className={`text-[10px] font-black tabular-nums ${
              changePct >= 0 ? (light ? "text-emerald-700" : "text-lime-300") : light ? "text-rose-600" : "text-rose-300"
            }`}
          >
            {formatPct(changePct)}
          </span>
          <svg viewBox="0 0 64 20" className="h-4 w-16 opacity-80" aria-hidden>
            <polyline
              fill="none"
              stroke={light ? "#059669" : "#86efac"}
              strokeWidth="2"
              points={sparkline.map((v, i) => `${(i / Math.max(sparkline.length - 1, 1)) * 64},${20 - (v / max) * 16}`).join(" ")}
            />
          </svg>
        </div>
      </div>
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

export function LendingQuickAction({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <Link
      href={href}
      className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition duration-300 active:scale-[0.98] hover:scale-[1.01] ${
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

export function LendingEmptyState({ message }: { message: string }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <p
      className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm font-semibold ${
        light ? "border-emerald-200/80 text-slate-600" : "border-emerald-400/20 text-emerald-200/60"
      }`}
    >
      {message}
    </p>
  );
}

export function LendingPrimaryButton({
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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function LendingSecondaryButton({ children, onClick, type = "button" }: { children: ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
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

export function LendingPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

export function LendingInput({
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

export function LendingSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LendingStatusPill({ status }: { status: string }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const tone =
    status === "active" || status === "paid" || status === "accepted" || status === "completed" || status === "settled"
      ? light
        ? "bg-emerald-100 text-emerald-800"
        : "bg-emerald-500/20 text-lime-200"
      : status === "overdue" || status === "rejected" || status === "critical"
        ? light
          ? "bg-rose-100 text-rose-800"
          : "bg-rose-500/20 text-rose-200"
        : light
          ? "bg-amber-100 text-amber-800"
          : "bg-amber-500/20 text-amber-100";

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

export function LendingHubTile({ label, description, href, icon: Icon }: { label: string; description?: string; href: string; icon: LucideIcon }) {
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
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-lime-300"}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 text-left">
        <span className={`block text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{label}</span>
        {description ? (
          <span className={`mt-0.5 block text-[11px] font-semibold leading-snug ${light ? "text-slate-600" : "text-emerald-200/65"}`}>{description}</span>
        ) : null}
      </span>
    </Link>
  );
}
