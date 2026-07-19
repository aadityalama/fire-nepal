"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
      className={`animate-fade-up rounded-[1.35rem] border p-3.5 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 sm:rounded-[1.5rem] sm:p-4 ${
        elite
          ? light
            ? "border-amber-300/50 bg-gradient-to-br from-white via-amber-50/40 to-emerald-50/30 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.14)]"
            : "border-amber-400/25 bg-gradient-to-br from-emerald-950/50 via-amber-950/20 to-emerald-950/40 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
          : light
            ? "border-emerald-200/70 bg-white/90 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.12)]"
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
  emerald: {
    light: "from-emerald-500/20 to-lime-400/10 border-emerald-400/60 shadow-emerald-500/10",
    dark: "from-emerald-500/25 to-lime-400/10 border-emerald-400/35 shadow-emerald-500/15",
    stroke: "#10b981",
  },
  teal: {
    light: "from-teal-500/15 to-cyan-400/10 border-teal-400/55 shadow-teal-500/10",
    dark: "from-teal-500/20 to-cyan-400/10 border-teal-400/30 shadow-teal-500/15",
    stroke: "#14b8a6",
  },
  amber: {
    light: "from-amber-500/20 to-orange-400/10 border-amber-400/60 shadow-amber-500/10",
    dark: "from-amber-500/25 to-orange-400/10 border-amber-400/35 shadow-amber-500/15",
    stroke: "#f59e0b",
  },
  rose: {
    light: "from-rose-500/20 to-pink-400/10 border-rose-400/55 shadow-rose-500/10",
    dark: "from-rose-500/25 to-pink-400/10 border-rose-400/35 shadow-rose-500/15",
    stroke: "#f43f5e",
  },
  gold: {
    light: "from-amber-400/25 to-yellow-300/15 border-amber-400/65 shadow-amber-400/15",
    dark: "from-amber-500/30 to-yellow-400/15 border-amber-400/40 shadow-amber-400/20",
    stroke: "#fbbf24",
  },
  blue: {
    light: "from-sky-500/20 to-blue-400/10 border-sky-400/55 shadow-sky-500/10",
    dark: "from-sky-500/25 to-blue-400/10 border-sky-400/35 shadow-sky-500/15",
    stroke: "#38bdf8",
  },
} as const;

export function LendingAnimatedNumber({ value, loading }: { value: string; loading?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 40);
    return () => window.clearTimeout(t);
  }, [value]);
  if (loading) {
    return <span className="inline-block h-7 w-24 animate-pulse rounded-lg bg-emerald-500/15" />;
  }
  return (
    <span className={`inline-block transition duration-500 ${show ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
      {value}
    </span>
  );
}

export function LendingKpiCard({
  label,
  value,
  icon: Icon,
  changePct,
  sparkline,
  accent = "emerald",
  href,
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  changePct: number;
  sparkline: number[];
  accent?: keyof typeof ACCENT;
  href?: string;
  loading?: boolean;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const colors = ACCENT[accent];
  const max = Math.max(...sparkline, 1);
  const gradId = `spark-${accent}-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const card = (
    <div
      className={`group relative flex h-[126px] touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-lg backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.02] sm:h-[132px] sm:p-3.5 ${
        light ? colors.light : colors.dark
      } ${light ? "bg-white/90" : "bg-black/30"}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 85% 15%, ${colors.stroke}33, transparent 45%)`,
        }}
        aria-hidden
      />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 text-[9px] font-black uppercase leading-tight tracking-[0.1em] sm:text-[10px] ${light ? "text-slate-600" : "text-emerald-200/70"}`}>
          {label}
        </p>
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 transition group-hover:scale-110 ${
            light ? "bg-white/90 text-slate-800 ring-black/5" : "bg-white/10 text-emerald-100 ring-white/10"
          }`}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>
      </div>
      <div className="relative z-10">
        <p className={`truncate font-black tabular-nums leading-none ${light ? "text-slate-900" : "text-white"} text-xl sm:text-2xl`}>
          <LendingAnimatedNumber value={value} loading={loading} />
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
              changePct >= 0
                ? light
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-500/20 text-lime-300"
                : light
                  ? "bg-rose-100 text-rose-700"
                  : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {formatPct(changePct)}
          </span>
          <svg viewBox="0 0 72 22" className="h-5 w-[4.5rem] opacity-90" aria-hidden>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.35" />
                <stop offset="100%" stopColor={colors.stroke} />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparkline.map((v, i) => `${(i / Math.max(sparkline.length - 1, 1)) * 72},${20 - (v / max) * 16}`).join(" ")}
            />
          </svg>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        aria-label={`${label}: ${value}`}
      >
        {card}
      </Link>
    );
  }
  return card;
}

export function LendingSkeletonCard({ className }: { className?: string }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <div
      className={`animate-pulse rounded-2xl border ${light ? "border-emerald-100 bg-white/70" : "border-emerald-400/10 bg-emerald-950/30"} ${className ?? "h-28"}`}
    />
  );
}

export function LendingQuickAction({ label, href, icon: Icon }: { label: string; href: string; icon: LucideIcon }) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <Link
      href={href}
      className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition duration-300 active:scale-[0.98] hover:-translate-y-0.5 hover:scale-[1.01] ${
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

export function LendingEmptyState({
  message,
  title,
  ctaHref,
  ctaLabel,
  icon: Icon,
}: {
  message: string;
  title?: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon?: LucideIcon;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  return (
    <div
      className={`rounded-2xl border border-dashed px-4 py-10 text-center ${
        light ? "border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/40" : "border-emerald-400/20 bg-gradient-to-b from-black/20 to-emerald-950/20"
      }`}
    >
      {Icon ? (
        <div
          className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl ${
            light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-lime-300"
          }`}
        >
          <Icon size={26} />
        </div>
      ) : (
        <div
          className={`mx-auto mb-3 h-14 w-14 rounded-2xl bg-gradient-to-br ${
            light ? "from-emerald-200/80 to-lime-100" : "from-emerald-500/30 to-lime-400/10"
          }`}
          aria-hidden
        />
      )}
      {title ? <p className={`text-sm font-black ${light ? "text-slate-900" : "text-emerald-50"}`}>{title}</p> : null}
      <p className={`mt-1 text-sm font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>{message}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
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
      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
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
    status === "active" || status === "paid" || status === "accepted" || status === "completed" || status === "settled" || status === "signed" || status === "verified" || status === "success"
      ? light
        ? "bg-emerald-100 text-emerald-800"
        : "bg-emerald-500/20 text-lime-200"
      : status === "overdue" || status === "rejected" || status === "critical"
        ? light
          ? "bg-rose-100 text-rose-800"
          : "bg-rose-500/20 text-rose-200"
        : status === "info"
          ? light
            ? "bg-sky-100 text-sky-800"
            : "bg-sky-500/20 text-sky-200"
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
      className={`flex min-h-[88px] items-center gap-3 rounded-2xl border px-4 py-3 transition duration-300 active:scale-[0.98] hover:-translate-y-0.5 ${
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

export function LendingAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-300 font-black text-emerald-950 shadow-md shadow-emerald-500/20"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      aria-hidden
    >
      {initials || "FN"}
    </span>
  );
}
