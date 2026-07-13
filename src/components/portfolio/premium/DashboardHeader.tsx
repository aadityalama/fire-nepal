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
        <p className="truncate text-xs font-bold uppercase tracking-wider text-white/65">Portfolio overview</p>
        <h1 className="font-nepali min-w-0 text-xl font-bold leading-[1.1] tracking-[-0.035em] text-white sm:text-2xl sm:leading-tight xl:text-2xl">
          Namaste{userName ? `, ${userName}` : ""} <span className="fire-dash-wave inline-block">👋</span>
        </h1>
        <p className="text-xs font-medium leading-snug text-[#A7B4C4] line-clamp-2">
          Track your wealth, grow smarter, retire early — one premium workspace for Nepal and abroad.
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:max-w-[min(100%,440px)] lg:justify-end">
        <PremiumGlassCard glow={false} className="flex items-center gap-1.5 px-2 py-1 sm:gap-1.5 sm:px-2.5 sm:py-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#38F2A0]" strokeWidth={2} />
          <span className="min-w-0 truncate text-[11px] font-semibold tabular-nums text-[#A7B4C4]">{today}</span>
        </PremiumGlassCard>

        <div className="flex rounded-xl border border-white/[0.1] bg-black/35 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:rounded-2xl">
          {(["yearly", "monthly"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => syncPeriod(key)}
              className={`min-h-[34px] rounded-[0.7rem] px-2.5 py-1 text-[10px] font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-[36px] sm:rounded-[0.8rem] sm:px-3 sm:py-1.5 sm:text-xs ${
                period === key
                  ? "bg-white/[0.1] text-white ring-1 ring-white/[0.08]"
                  : "text-[#A7B4C4] hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {key === "yearly" ? "Yearly" : "Monthly"}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-lg bg-[#38F2A0] px-3 py-1.5 text-[10px] font-bold text-[#07111A] shadow-[0_14px_30px_-24px_rgba(56,242,160,0.8)] transition-all duration-300 ease-out hover:brightness-105 active:scale-[0.98] sm:gap-2 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs xl:inline-flex"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Add Asset
        </button>

        <button
          type="button"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-[#0B1623]/90 text-[#A7B4C4] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white sm:h-9 sm:w-9 sm:rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </button>

        <PremiumGlassCard glow={false} className="flex items-center gap-2 px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#38F2A0] text-[10px] font-bold text-[#07111A] shadow-[0_12px_24px_-20px_rgba(56,242,160,0.9)] ring-1 ring-white/20 sm:h-8 sm:w-8 sm:text-[11px]">
            {userName
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden min-w-0 sm:block">
            {userName ? <p className="truncate text-[13px] font-semibold tracking-tight text-white">{userName}</p> : null}
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#38F2A0]">Premium</p>
          </div>
        </PremiumGlassCard>
      </div>
    </div>
  );
}
