"use client";

import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogIn, Unplug, WalletCards } from "lucide-react";
import {
  isLedgerEmpty,
  ledgerFieldLabel,
  type PensionLedgerField,
  type PensionProviderAccent,
  type PensionProviderDesk,
} from "@/lib/pension/provider-desk";

const ACCENT_BAR: Record<PensionProviderAccent, string> = {
  ssf: "bg-[#2dd4bf]",
  epf: "bg-[#34d399]",
  cit: "bg-[#38bdf8]",
  gov: "bg-[#fbbf24]",
};

const ACCENT_SOFT: Record<PensionProviderAccent, string> = {
  ssf: "border-[#2dd4bf]/35 bg-[#2dd4bf]/12 text-[#99f6e4]",
  epf: "border-[#34d399]/35 bg-[#34d399]/12 text-[#a7f3d0]",
  cit: "border-[#38bdf8]/35 bg-[#38bdf8]/12 text-[#bae6fd]",
  gov: "border-[#fbbf24]/35 bg-[#fbbf24]/12 text-[#fde68a]",
};

/** Distinct pension surface — ink panel, not wealth-glass. */
export function PcSurface({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`rounded-[1.25rem] border border-white/[0.08] bg-[#0c1219]/95 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PcEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7dd3c0]/80">{children}</p>;
}

export function PcTitle({ children, as: Tag = "h2" }: { children: ReactNode; as?: "h1" | "h2" | "h3" }) {
  return <Tag className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white sm:text-2xl">{children}</Tag>;
}

export function PcCopy({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm leading-relaxed text-[#9aa8b8] ${className}`}>{children}</p>;
}

export function SyncStatusChip({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
        connected
          ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
          : "border-amber-400/35 bg-amber-500/12 text-amber-100"
      }`}
    >
      <Unplug size={11} aria-hidden />
      {connected ? "Connected" : "Not Connected"}
    </span>
  );
}

export function LedgerValue({ field, className = "" }: { field: PensionLedgerField; className?: string }) {
  const empty = isLedgerEmpty(field);
  return (
    <span
      className={`font-semibold tracking-[-0.02em] ${
        empty ? "text-[#fbbf24]" : "text-white"
      } ${className}`}
    >
      {ledgerFieldLabel(field)}
    </span>
  );
}

export function SummaryStat({
  label,
  field,
  hint,
}: {
  label: string;
  field: PensionLedgerField;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#080d13] px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7c8f]">{label}</p>
      <LedgerValue field={field} className="mt-1.5 block text-[0.95rem] sm:text-base" />
      {hint ? <p className="mt-1 text-[10px] font-medium text-[#5f6f80]">{hint}</p> : null}
    </div>
  );
}

export function ProviderAccountCard({ desk }: { desk: PensionProviderDesk }) {
  const Icon = desk.icon;
  return (
    <article className="relative min-w-[min(100%,18.5rem)] shrink-0 snap-center overflow-hidden rounded-[1.35rem] border border-white/[0.09] bg-[#0c1219]">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${ACCENT_BAR[desk.accent]}`} aria-hidden />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`grid h-10 w-10 place-items-center rounded-xl border ${ACCENT_SOFT[desk.accent]}`}>
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7dd3c0]/75">{desk.shortLabel}</p>
              <h3 className="truncate text-base font-semibold text-white">{desk.title.replace(/ \(.+\)$/, "")}</h3>
            </div>
          </div>
          <SyncStatusChip connected={false} />
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7c8f]">Balance</p>
          <LedgerValue field={desk.balance} className="mt-1 block text-2xl" />
          <p className="mt-1 text-[11px] text-[#6b7c8f]">{desk.subtitle}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Monthly" field={desk.monthlyContribution} />
          <MiniStat label="Months" field={desk.contributionMonths} />
          <MiniStat label="Last paid" field={desk.lastContribution} />
        </div>

        {desk.verifiedPolicyRateLabel ? (
          <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[11px] font-semibold text-[#9aa8b8]">
            Verified rate · <span className="text-[#7dd3c0]">{desk.verifiedPolicyRateLabel}</span>
          </p>
        ) : (
          <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 text-[11px] font-semibold text-amber-100/90">
            Contribution % pending official verification
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {desk.payHref ? (
              <ExternalCta href={desk.payHref} variant="primary" icon={WalletCards}>
                Pay / Contribution
              </ExternalCta>
            ) : null}
            {desk.loginHref ? (
              <ExternalCta href={desk.loginHref} variant="secondary" icon={LogIn}>
                Official Login
              </ExternalCta>
            ) : null}
          </div>
          <Link
            href={desk.href}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-[#c5d0db] transition hover:border-[#2dd4bf]/35 hover:text-white"
          >
            Open {desk.shortLabel} desk →
          </Link>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, field }: { label: string; field: PensionLedgerField }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#080d13] px-2 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#5f6f80]">{label}</p>
      <LedgerValue field={field} className="mt-1 block text-[11px] leading-tight sm:text-xs" />
    </div>
  );
}

export function ExternalCta({
  href,
  children,
  variant = "primary",
  icon: Icon,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
}) {
  const styles =
    variant === "primary"
      ? "border-transparent bg-gradient-to-r from-[#14b8a6] to-[#34d399] text-[#042f2e] shadow-[0_12px_28px_-16px_rgba(45,212,191,0.65)]"
      : variant === "secondary"
        ? "border-[#2dd4bf]/35 bg-[#2dd4bf]/10 text-[#99f6e4]"
        : "border-white/10 bg-white/[0.04] text-[#c5d0db]";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[46px] touch-manipulation items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${styles}`}
    >
      {Icon ? <Icon size={14} aria-hidden /> : null}
      <span className="truncate">{children}</span>
      <ExternalLink size={12} aria-hidden className="opacity-70" />
    </a>
  );
}

export function ModuleRow({
  href,
  title,
  body,
  icon: Icon,
}: {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0c1219] px-3.5 py-3.5 transition hover:border-[#2dd4bf]/30 active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[#7dd3c0]">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-[#7f8fa0]">{body}</span>
      </span>
      <span className="text-[#5f6f80]" aria-hidden>
        →
      </span>
    </Link>
  );
}

export function TimelineItem({
  title,
  meta,
  body,
  tone = "muted",
}: {
  title: string;
  meta: string;
  body: string;
  tone?: "muted" | "warn" | "ok";
}) {
  const dot =
    tone === "ok" ? "bg-emerald-400" : tone === "warn" ? "bg-amber-400" : "bg-[#3d4d5c]";
  return (
    <li className="relative pl-6">
      <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${dot} ring-4 ring-[#0c1219]`} aria-hidden />
      <div className="rounded-2xl border border-white/[0.07] bg-[#080d13] px-3.5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7c8f]">{meta}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#8b9aab]">{body}</p>
      </div>
    </li>
  );
}

/** Empty-state retirement readiness arc — no fabricated progress fill. */
export function ProjectionViz({
  yearsLabel,
  rateLabel,
}: {
  yearsLabel: string;
  rateLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative grid h-36 w-36 place-items-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="url(#pcArc)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="40 260"
            className="opacity-90"
          />
          <defs>
            <linearGradient id="pcArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7c8f]">Balance</p>
            <p className="text-sm font-semibold text-amber-200">Not Connected</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
        <p className="text-sm font-semibold text-white">Policy projection desk</p>
        <p className="text-xs leading-relaxed text-[#8b9aab]">
          Personal balances stay hidden until official portal sync. Use verified contribution rates only — never invented
          annuity factors.
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#9aa8b8]">
            Horizon · {yearsLabel}
          </span>
          <span className="rounded-full border border-[#2dd4bf]/25 bg-[#2dd4bf]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#99f6e4]">
            {rateLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PolicyNoteCard({
  title,
  summary,
  status,
  sourceUrl,
}: {
  title: string;
  summary: string;
  status: string;
  sourceUrl: string;
}) {
  const pending = status === "pending_verification";
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#080d13] px-3.5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            pending
              ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
              : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {pending ? "Pending verification" : "Active policy"}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[#8b9aab]">{summary}</p>
      {pending ? (
        <p className="mt-2 text-[11px] font-semibold text-amber-200/90">
          Official policy information unavailable for verification.
        </p>
      ) : null}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex text-[11px] font-bold text-[#7dd3c0]"
      >
        Official source ↗
      </a>
    </div>
  );
}

export function StickyPortalBar({
  payHref,
  loginHref,
}: {
  payHref: string | null;
  loginHref: string | null;
}) {
  if (!payHref && !loginHref) return null;
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 -mx-1 border-t border-white/[0.06] bg-[#070b10]/92 px-1 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <div className="grid grid-cols-2 gap-2">
        {payHref ? (
          <ExternalCta href={payHref} variant="primary" icon={WalletCards}>
            Pay / Contribution
          </ExternalCta>
        ) : (
          <span />
        )}
        {loginHref ? (
          <ExternalCta href={loginHref} variant="secondary" icon={LogIn}>
            Official Login
          </ExternalCta>
        ) : null}
      </div>
    </div>
  );
}
