"use client";

import type { ReactNode } from "react";
import type { RealEstateKind } from "@/components/portfolio/types";
import { cn } from "@/lib/utils";

export const RE_KIND_LABEL: Record<RealEstateKind, string> = {
  land: "Land",
  house: "House",
  apartment: "Apartment",
  commercial: "Commercial",
};

export function ReGlass({
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
        "relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-white/[0.07] via-emerald-950/30 to-black/50 shadow-[0_20px_50px_-28px_rgba(16,185,129,0.45)] backdrop-blur-xl",
        onClick &&
          "w-full text-left transition hover:border-emerald-300/35 hover:shadow-[0_24px_60px_-24px_rgba(52,211,153,0.55)] active:scale-[0.99]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(52,211,153,0.12),transparent_45%)]" />
      <div className="relative">{children}</div>
    </Comp>
  );
}

export function ReBackHeader({
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
    <header className="sticky top-0 z-40 -mx-1 mb-4 flex items-center gap-3 border-b border-emerald-400/10 bg-[#07111A]/90 px-1 py-3 backdrop-blur-xl">
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

export function ReSectionTitle({
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

export function ReScoreRing({
  score,
  size = 88,
  label = "Score",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const gradId = `reScoreGrad-${size}-${clamped}`;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xl font-black tabular-nums text-emerald-50">{clamped}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/50">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ReBadge({
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
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ReIconButton({
  label,
  icon,
  onClick,
  tone = "emerald",
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "emerald" | "rose" | "amber" | "sky";
}) {
  const tones = {
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
    rose: "border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
    sky: "border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-3xl border px-3 py-3 text-center shadow-inner transition active:scale-[0.98]",
        tones[tone],
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black/30 ring-1 ring-white/10">{icon}</span>
      <span className="text-[11px] font-black leading-tight text-emerald-50">{label}</span>
    </button>
  );
}

export function ReFieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200/60">{children}</span>;
}

export const ReInputClassName =
  "w-full rounded-2xl border border-emerald-400/20 bg-black/40 px-3.5 py-3 text-sm font-semibold text-emerald-50 outline-none transition placeholder:text-emerald-200/30 focus:border-emerald-400/45 focus:ring-2 focus:ring-emerald-400/20";

export function formatReCcy(n: number | undefined, ccy: string): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const code = String(ccy).toUpperCase();
  const maxFrac = code === "USD" ? 2 : 0;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 })} ${code}`;
}

export function formatReSignedCcy(signed: number, ccy: string): string {
  if (!Number.isFinite(signed)) return "—";
  const body = formatReCcy(Math.abs(signed), ccy);
  if (body === "—") return "—";
  return `${signed >= 0 ? "+" : "−"}${body}`;
}

export function PropertyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="reBldg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="reSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="140" rx="70" ry="10" fill="rgba(16,185,129,0.2)" />
      <rect x="40" y="48" width="70" height="90" rx="8" fill="url(#reBldg)" />
      <rect x="55" y="62" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.85" />
      <rect x="75" y="62" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.7" />
      <rect x="55" y="84" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.7" />
      <rect x="75" y="84" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.85" />
      <rect x="55" y="106" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.6" />
      <rect x="75" y="106" width="12" height="12" rx="2" fill="#ecfdf5" opacity="0.75" />
      <path d="M110 70 L160 48 L160 138 L110 138 Z" fill="url(#reBldg)" opacity="0.75" />
      <rect x="128" y="72" width="10" height="10" rx="2" fill="#ecfdf5" opacity="0.8" />
      <rect x="142" y="72" width="10" height="10" rx="2" fill="#ecfdf5" opacity="0.65" />
      <rect x="128" y="92" width="10" height="10" rx="2" fill="#ecfdf5" opacity="0.7" />
      <rect x="142" y="92" width="10" height="10" rx="2" fill="#ecfdf5" opacity="0.8" />
      <rect x="128" y="112" width="24" height="18" rx="3" fill="#022c22" opacity="0.55" />
      <circle cx="155" cy="36" r="14" fill="url(#reSky)" />
    </svg>
  );
}

/** Build a smooth growth series from purchase → current for mini charts. */
export function buildGrowthSeries(
  purchase: number | undefined,
  current: number | undefined,
  points = 8,
): { label: string; value: number }[] {
  const p = purchase != null && purchase > 0 ? purchase : 0;
  const c = current != null && current > 0 ? current : p;
  if (p <= 0 && c <= 0) {
    return Array.from({ length: points }, (_, i) => ({ label: `M${i + 1}`, value: 0 }));
  }
  const start = p > 0 ? p : c * 0.85;
  const end = c > 0 ? c : p;
  return Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(1, points - 1);
    const eased = 1 - Math.pow(1 - t, 1.35);
    return { label: `P${i + 1}`, value: Math.round(start + (end - start) * eased) };
  });
}
