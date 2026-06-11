"use client";

import { Bell, CalendarDays, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";

type DashboardHeaderProps = {
  userName: string;
  onPeriodChange?: (period: "yearly" | "monthly") => void;
};

export function DashboardHeader({ userName, onPeriodChange }: DashboardHeaderProps) {
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const syncPeriod = (next: "yearly" | "monthly") => {
    setPeriod(next);
    onPeriodChange?.(next);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-2xl space-y-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[10px]">Portfolio overview</p>
        <h1 className="font-nepali min-w-0 text-[1.12rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[1.22rem] sm:leading-tight xl:text-[1.2rem]">
          Namaste, {userName} <span className="fire-dash-wave inline-block">👋</span>
        </h1>
        <p className="text-[10px] font-medium leading-snug text-zinc-400/95 line-clamp-2 sm:text-[11px] sm:leading-snug lg:line-clamp-2 xl:text-[0.78rem]">
          Track your wealth, grow smarter, retire early — one premium workspace for Nepal and abroad.
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:max-w-[min(100%,440px)] lg:justify-end">
        <PremiumGlassCard glow={false} className="flex items-center gap-1.5 px-2 py-1 sm:gap-1.5 sm:px-2.5 sm:py-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" strokeWidth={2} />
          <span className="min-w-0 truncate text-[10px] font-semibold tabular-nums text-zinc-200 sm:text-[11px]">{today}</span>
        </PremiumGlassCard>

        <div className="flex rounded-xl border border-white/[0.1] bg-black/35 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:rounded-2xl">
          {(["yearly", "monthly"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => syncPeriod(key)}
              className={`min-h-[34px] rounded-[0.7rem] px-2.5 py-1 text-[10px] font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[36px] sm:rounded-[0.8rem] sm:px-3 sm:py-1.5 sm:text-xs ${
                period === key
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 shadow-[0_8px_28px_-10px_rgba(16,185,129,0.45)] ring-1 ring-emerald-300/40"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
              }`}
            >
              {key === "yearly" ? "Yearly" : "Monthly"}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-1.5 text-[10px] font-semibold text-emerald-950 shadow-[0_12px_40px_-12px_rgba(16,185,129,0.55)] transition-all duration-500 ease-out hover:brightness-110 hover:shadow-[0_16px_48px_-12px_rgba(16,185,129,0.45)] active:scale-[0.98] sm:gap-2 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs xl:inline-flex"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Add Asset
        </button>

        <button
          type="button"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-500 hover:border-emerald-400/35 hover:bg-emerald-500/[0.08] hover:text-white hover:shadow-[0_0_28px_-8px_rgba(52,211,153,0.25)] sm:h-9 sm:w-9 sm:rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </button>

        <PremiumGlassCard glow={false} className="flex items-center gap-2 px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-300 text-[10px] font-semibold text-emerald-950 shadow-lg shadow-emerald-500/35 ring-1 ring-white/25 sm:h-8 sm:w-8 sm:text-[11px]">
            {userName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[13px] font-semibold tracking-tight text-white">{userName}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">Premium</p>
          </div>
        </PremiumGlassCard>
      </div>
    </div>
  );
}
