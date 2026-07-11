"use client";

import { Check, ChevronRight, Crown, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type LauncherItem = {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
  testId?: string;
};

export type MainAppCardState = "included" | "premiumLocked" | "eliteLocked";

function stateMeta(state: MainAppCardState | undefined, light: boolean) {
  if (!state) return null;
  if (state === "included") {
    return {
      label: "Included",
      action: null,
      Icon: Check,
      className: light
        ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-700"
        : "border-emerald-300/25 bg-emerald-400/10 text-lime-200",
    };
  }
  if (state === "eliteLocked") {
    return {
      label: "Elite",
      action: "Tap to Upgrade",
      Icon: Crown,
      className: light
        ? "border-amber-300/70 bg-amber-50/95 text-amber-800"
        : "border-amber-300/35 bg-amber-400/15 text-amber-100",
    };
  }
  return {
    label: "Premium",
    action: "Tap to Upgrade",
    Icon: Lock,
    className: light
      ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-700"
      : "border-emerald-300/25 bg-emerald-400/10 text-lime-200",
  };
}

export function MainAppCard({
  item,
  light,
  locked,
  lockBadge,
  state,
}: {
  item: LauncherItem;
  light: boolean;
  locked?: boolean;
  lockBadge?: "Premium" | "Elite";
  state?: MainAppCardState;
}) {
  const href = locked ? "/dashboard/membership" : item.href;
  const meta = stateMeta(state, light);
  const TopStateIcon = meta?.Icon;
  const lockBadgeClass =
    lockBadge === "Elite"
      ? light
        ? "border-amber-300/70 bg-amber-50/95 text-amber-800"
        : "border-amber-300/35 bg-amber-400/15 text-amber-100"
      : light
        ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-700"
        : "border-emerald-300/25 bg-emerald-400/10 text-lime-200";
  const LockBadgeIcon = lockBadge === "Elite" ? Crown : Lock;

  return (
    <Link
      href={href}
      data-testid={item.testId}
      className={`group relative flex touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border p-4 transition duration-200 active:scale-[0.98] sm:p-5 ${
        state ? "min-h-[148px] sm:min-h-[156px]" : "min-h-[112px] sm:min-h-[120px]"
      } ${
        light
          ? "border-emerald-200/80 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.12)] hover:border-emerald-400/50"
          : "border-emerald-400/15 bg-emerald-950/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:border-emerald-300/35"
      } ${locked ? "opacity-75 hover:opacity-90" : ""}`}
      aria-label={locked && lockBadge ? `${item.title} requires ${lockBadge}. Upgrade membership.` : undefined}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent} opacity-90`} aria-hidden />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
            light ? "border-emerald-200/80 bg-emerald-50 text-emerald-700" : "border-white/10 bg-black/30 text-lime-200"
          }`}
        >
          <item.icon size={22} strokeWidth={2.1} />
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {meta && TopStateIcon ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${meta.className}`}>
              <TopStateIcon size={11} strokeWidth={2.5} aria-hidden />
              {meta.label}
            </span>
          ) : locked && lockBadge ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${lockBadgeClass}`}>
              <LockBadgeIcon size={11} strokeWidth={2.5} aria-hidden />
              {lockBadge}
            </span>
          ) : item.badge ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                light
                  ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-700"
                  : "border-emerald-300/25 bg-emerald-400/10 text-lime-200"
              }`}
            >
              {item.badge}
            </span>
          ) : null}
          {locked ? (
            <LockBadgeIcon
              size={18}
              className={`shrink-0 opacity-70 ${lockBadge === "Elite" ? "text-amber-400" : light ? "text-emerald-700" : "text-lime-300"}`}
              aria-hidden
            />
          ) : (
            <ChevronRight
              size={18}
              className={`shrink-0 opacity-60 transition group-active:translate-x-0.5 ${light ? "text-emerald-700" : "text-lime-300"}`}
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className="relative z-10 mt-3 min-w-0">
        <h2 className={`text-base font-black leading-tight sm:text-lg ${light ? "text-slate-900" : "text-white"}`}>{item.title}</h2>
        <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-snug sm:text-sm ${light ? "text-slate-600" : "text-emerald-100/70"}`}>
          {item.body}
        </p>
      </div>
      {meta?.action ? (
        <p className={`relative z-10 mt-3 text-[10px] font-black uppercase tracking-[0.16em] ${lockBadge === "Elite" ? "text-amber-200/90" : light ? "text-emerald-700" : "text-lime-200/90"}`}>
          {meta.action}
        </p>
      ) : state === "included" ? (
        <p className={`relative z-10 mt-3 text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700" : "text-lime-200/90"}`}>
          Active Access
        </p>
      ) : null}
    </Link>
  );
}
